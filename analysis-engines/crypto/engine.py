"""
Cryptographic inventory engine for the PQC platform.

Scans source files for cryptographic algorithm usage patterns and produces
a structured inventory. Quantum-vulnerable algorithms are flagged at
critical/high severity. The output is schema-valid Findings that can be
persisted and displayed in the CBOM/PQC dashboard.

Design constraints:
  - No network access, no external dependencies.
  - Deterministic: same file + content → same findings.
  - Evidence is limited to the matched line; no secret values stored.
  - Deduplication: same rule + file + line → reported once.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Iterable
from uuid import NAMESPACE_URL, uuid5

from ..base.analyzer import AnalysisEngine
from ..base.finding import EngineName, Finding, Severity
from ..base.result import AnalysisResult
from .rules import get_crypto_rules

logger = logging.getLogger(__name__)

_SCANNABLE = {
    ".py", ".js", ".jsx", ".ts", ".tsx", ".java", ".go",
    ".rb", ".php", ".cs", ".cpp", ".c", ".rs", ".swift", ".kt",
}

_EXCLUDED_DIRS = {
    "node_modules", "vendor", "generated", "gen", ".git",
    "__pycache__", "dist", "build", "coverage", ".venv", "venv",
}

def _is_excluded(path: Path) -> bool:
    return any(part.lower() in _EXCLUDED_DIRS for part in path.parts)

_MAX_FILE_BYTES = 1 * 1024 * 1024
_MAX_EVIDENCE_CHARS = 200


def _finding_id(rule_id: str, file_path: str, line_number: int) -> str:
    return str(uuid5(NAMESPACE_URL, f"pqc/{rule_id}/{file_path}/{line_number}"))


def _severity(label: str) -> Severity:
    return Severity(label.lower())


class CryptoEngine(AnalysisEngine):
    """
    Cryptographic inventory and PQC risk analysis engine.

    Produces one Finding per matched algorithm occurrence. Quantum-vulnerable
    algorithms (RSA, ECC, DH) are flagged critical/high. Broken classical
    algorithms (MD5, SHA-1, DES, RC4) and weak modes/padding are also flagged.
    """

    @property
    def name(self) -> EngineName:
        return EngineName.CRYPTO

    def analyze(self, files: Iterable[Path]) -> AnalysisResult:
        rules = get_crypto_rules()
        findings: list[Finding] = []
        errors: list[str] = []
        files_processed = 0
        seen: set[tuple[str, str, int]] = set()

        for file_path in files:
            if file_path.suffix.lower() not in _SCANNABLE:
                continue
            if _is_excluded(file_path):
                continue
            files_processed += 1
            try:
                raw = file_path.read_bytes()[:_MAX_FILE_BYTES]
                try:
                    text = raw.decode("utf-8")
                except UnicodeDecodeError:
                    text = raw.decode("latin-1", errors="replace")

                lines = text.splitlines()
                for lineno, line in enumerate(lines, start=1):
                    for rule in rules:
                        if rule.pattern.search(line):
                            key = (rule.rule_id, str(file_path), lineno)
                            if key in seen:
                                continue
                            seen.add(key)
                            evidence = line.strip()[:_MAX_EVIDENCE_CHARS]
                            findings.append(
                                Finding(
                                    finding_id=_finding_id(rule.rule_id, str(file_path), lineno),
                                    engine=EngineName.CRYPTO,
                                    category=rule.category,
                                    severity=_severity(rule.severity),
                                    title=rule.title,
                                    file_path=str(file_path),
                                    line_number=lineno,
                                    evidence=evidence,
                                    confidence=rule.confidence,
                                    recommendation=rule.recommendation,
                                    is_development=False,
                                )
                            )
            except OSError as exc:
                errors.append(f"Could not read {file_path}: {exc}")
                logger.warning("CryptoEngine: could not read %s: %s", file_path, exc)

        return AnalysisResult(
            findings=tuple(findings),
            files_processed=files_processed,
            errors=tuple(errors),
        )
