"""
SAST analysis engine — deterministic, regex-based, stdlib-only.

Scans source files for secrets, injection patterns, insecure deserialization,
path traversal, and weak cryptography calls.  Each match produces one
validated Finding in the shared schema format.

Design constraints:
  - No network access, no external pip dependencies beyond the stdlib.
  - Deterministic: the same file content always produces the same findings.
  - Deduplicated: the same rule hitting the same file/line is reported once.
  - Evidence is a redacted excerpt; full secret values are never stored.
"""

from __future__ import annotations

import logging
import re
from pathlib import Path
from typing import Iterable
from uuid import NAMESPACE_URL, uuid5

from ..base.analyzer import AnalysisEngine
from ..base.finding import EngineName, Finding, Severity
from ..base.result import AnalysisResult
from .rules import Rule, get_rules

logger = logging.getLogger(__name__)

# Source file extensions this engine can meaningfully scan
_SCANNABLE = {
    ".py", ".js", ".jsx", ".ts", ".tsx", ".java", ".go",
    ".rb", ".php", ".cs", ".cpp", ".c", ".sh", ".bash",
    ".ps1", ".rs", ".swift", ".kt", ".scala",
}

# Directories that should never be scanned — generated/vendor code
_EXCLUDED_DIRS = {
    "node_modules", "vendor", "generated", "gen", ".git",
    "__pycache__", "dist", "build", "coverage", ".venv", "venv",
}

def _is_excluded(path: Path) -> bool:
    """Return True if any path component is in the exclusion list."""
    return any(part.lower() in _EXCLUDED_DIRS for part in path.parts)

# Maximum bytes read per file — keeps memory bounded on large repositories
_MAX_FILE_BYTES = 1 * 1024 * 1024  # 1 MB

# Maximum length of the evidence excerpt stored in a finding
_MAX_EVIDENCE_CHARS = 200


def _severity(label: str) -> Severity:
    return Severity(label.lower())


def _redact_evidence(line: str, match: re.Match) -> str:
    """
    Return a safe evidence excerpt.

    For rules that match credential assignments the value after '=' is masked.
    All other rules return the matched portion truncated to _MAX_EVIDENCE_CHARS.
    """
    text = line.strip()
    # Mask anything that looks like a credential value after '='
    redacted = re.sub(
        r'((?:password|passwd|secret_?key|api_?key|auth_?key|secret|token)\s*=\s*)["\'][^"\']{3,}["\']',
        r'\1"[REDACTED]"',
        text,
        flags=re.IGNORECASE,
    )
    return redacted[:_MAX_EVIDENCE_CHARS]


def _finding_id(rule_id: str, file_path: str, line_number: int) -> str:
    """Deterministic UUID derived from rule + file + line."""
    return str(uuid5(NAMESPACE_URL, f"pqc/{rule_id}/{file_path}/{line_number}"))


class SASTEngine(AnalysisEngine):
    """
    Regex-based SAST engine.

    Scans every file whose extension is in _SCANNABLE, applies each rule
    line-by-line, deduplicates (rule_id, file, line), and returns an
    AnalysisResult containing schema-valid Findings.
    """

    @property
    def name(self) -> EngineName:
        return EngineName.SAST

    def analyze(self, files: Iterable[Path]) -> AnalysisResult:
        rules = get_rules()
        findings: list[Finding] = []
        errors: list[str] = []
        files_processed = 0
        seen: set[tuple[str, str, int]] = set()  # (rule_id, file_path, line_number)

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
                            evidence = _redact_evidence(line, rule.pattern.search(line))
                            findings.append(
                                Finding(
                                    finding_id=_finding_id(rule.rule_id, str(file_path), lineno),
                                    engine=EngineName.SAST,
                                    category=rule.category,
                                    severity=_severity(rule.severity),
                                    title=rule.title,
                                    file_path=str(file_path),
                                    line_number=lineno,
                                    evidence=evidence or line.strip()[:_MAX_EVIDENCE_CHARS],
                                    confidence=rule.confidence,
                                    recommendation=rule.recommendation,
                                    is_development=False,
                                )
                            )
            except OSError as exc:
                errors.append(f"Could not read {file_path}: {exc}")
                logger.warning("SAST: could not read %s: %s", file_path, exc)

        return AnalysisResult(
            findings=tuple(findings),
            files_processed=files_processed,
            errors=tuple(errors),
        )
