"""
Cryptographic inventory engine for the PQC platform.

Day 3 additions:
  - Produces CryptoComponent records alongside Findings (CBOM foundation)
  - rule_id and rule_version populated on every Finding
  - explanation forwarded from rule
  - Quantum-risk mapped from CryptoRule.quantum_vulnerable
"""

from __future__ import annotations

import logging
import time
from pathlib import Path
from typing import Iterable
from uuid import NAMESPACE_URL, uuid5

from ..base.analyzer import AnalysisEngine
from ..base.component import (
    CryptoComponent,
    RISK_DEPRECATED,
    RISK_QUANTUM_VULNERABLE,
    RISK_SAFE,
    RISK_WEAKENED,
)
from ..base.finding import EngineName, Finding, Severity
from ..base.result import AnalysisResult
from .rules import get_crypto_rules

logger = logging.getLogger(__name__)

RULE_VERSION = "1.0.0"

_SCANNABLE = {
    ".py", ".js", ".jsx", ".ts", ".tsx", ".java", ".go",
    ".rb", ".php", ".cs", ".cpp", ".c", ".rs", ".swift", ".kt",
    ".env", ".yaml", ".yml", ".json", ".pem", ".toml", ".ini", ".cfg",
}

_EXCLUDED_DIRS = {
    "node_modules", "vendor", "generated", "gen", ".git",
    "__pycache__", "dist", "build", "coverage", ".venv", "venv",
}

_MAX_FILE_BYTES = 1 * 1024 * 1024
_MAX_EVIDENCE_CHARS = 200
_MAX_LINE_CHARS = 2000
_MAX_FILE_SECONDS = 5.0
_MAX_SCAN_SECONDS = 60.0

# Quantum-risk categories for common weak/deprecated algorithms
_DEPRECATED_ALGORITHMS = {"MD5", "SHA-1", "DES/3DES", "RC4", "DES", "3DES",
                           "PKCS1v15", "AES-CBC", "AES-ECB", "Static-IV",
                           "PBKDF2-low-iterations", "MD5/SHA-1"}
_WEAKENED_ALGORITHMS = {"AES-128", "SHA-256"}


def _quantum_risk(rule) -> str:
    if getattr(rule, "quantum_vulnerable", False):
        return RISK_QUANTUM_VULNERABLE
    if rule.algorithm in _DEPRECATED_ALGORITHMS:
        return RISK_DEPRECATED
    if rule.algorithm in _WEAKENED_ALGORITHMS:
        return RISK_WEAKENED
    return RISK_SAFE


def _is_excluded(path: Path) -> bool:
    return any(part.lower() in _EXCLUDED_DIRS for part in path.parts)


def _finding_id(rule_id: str, file_path: str, line_number: int) -> str:
    return str(uuid5(NAMESPACE_URL, f"pqc/{rule_id}/{file_path}/{line_number}"))


def _component_id(scan_id: str, rule_id: str, file_path: str, line_number: int) -> str:
    return str(uuid5(NAMESPACE_URL, f"pqc/component/{scan_id}/{rule_id}/{file_path}/{line_number}"))


def _severity(label: str) -> Severity:
    return Severity(label.lower())


class CryptoEngine(AnalysisEngine):
    """
    Cryptographic inventory and PQC risk analysis engine.

    Produces:
      - Finding per matched algorithm (for the findings API)
      - CryptoComponent per detection (for the CBOM/PQC dashboard)

    Both outputs carry rule_id, rule_version and quantum_risk.
    """

    def __init__(self, scan_id: str = "") -> None:
        self._scan_id = scan_id

    @property
    def name(self) -> EngineName:
        return EngineName.CRYPTO

    def set_root_dir(self, root_dir: Path) -> None:
        self.root_dir = Path(root_dir).resolve()

    def _relative_path(self, file_path: Path) -> Path:
        root_dir = getattr(self, "root_dir", None)
        if root_dir is None:
            return file_path
        try:
            return file_path.resolve().relative_to(root_dir)
        except ValueError:
            return Path()

    def analyze(self, files: Iterable[Path]) -> AnalysisResult:
        rules = get_crypto_rules()
        findings: list[Finding] = []
        components: list[CryptoComponent] = []
        errors: list[str] = []
        files_processed = 0
        scan_deadline = time.monotonic() + _MAX_SCAN_SECONDS
        seen: set[tuple[str, str, int]] = set()

        for file_path in files:
            if file_path.suffix.lower() not in _SCANNABLE and not file_path.name.lower().startswith(".env"):
                continue
            if file_path.is_symlink():
                continue
            relative_path = self._relative_path(file_path)
            if not relative_path.parts or _is_excluded(relative_path):
                continue
            files_processed += 1
            try:
                raw = file_path.read_bytes()[:_MAX_FILE_BYTES]
                try:
                    text = raw.decode("utf-8")
                except UnicodeDecodeError:
                    text = raw.decode("latin-1", errors="replace")

                file_deadline = time.monotonic() + _MAX_FILE_SECONDS
                lines = text.splitlines()
                for lineno, line in enumerate(lines, start=1):
                    if time.monotonic() >= scan_deadline:
                        errors.append("Crypto scan time budget exceeded")
                        return AnalysisResult(
                            findings=tuple(findings),
                            files_processed=files_processed,
                            errors=tuple(errors),
                            components=tuple(components),
                        )
                    if time.monotonic() >= file_deadline:
                        errors.append(f"Crypto file time budget exceeded: {relative_path.as_posix()}")
                        break
                    line = line[:_MAX_LINE_CHARS]
                    stripped = line.lstrip()
                    if stripped.startswith(("#", "//", "/*", "*", "<!--", "--")):
                        continue
                    for rule in rules:
                        if rule.pattern.search(line):
                            key = (rule.rule_id, str(file_path), lineno)
                            if key in seen:
                                continue
                            seen.add(key)
                            evidence = line.strip()[:_MAX_EVIDENCE_CHARS]
                            rel_str = relative_path.as_posix()

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
                                    explanation=rule.explanation,
                                    is_development=False,
                                    rule_id=rule.rule_id,
                                    rule_version=RULE_VERSION,
                                    group_key=f"{rule.rule_id}:{rel_str}",
                                )
                            )

                            # Day 3: also produce a CryptoComponent for CBOM
                            if self._scan_id:
                                components.append(
                                    CryptoComponent(
                                        component_id=_component_id(
                                            self._scan_id, rule.rule_id, str(file_path), lineno
                                        ),
                                        scan_id=self._scan_id,
                                        algorithm=rule.algorithm,
                                        category=_algo_category(rule.algorithm),
                                        file_path=str(file_path),
                                        line_number=lineno,
                                        detection_method=f"regex:{rule.rule_id}",
                                        confidence=rule.confidence,
                                        quantum_risk=_quantum_risk(rule),
                                        nist_migration_target=getattr(rule, "nist_reference", ""),
                                        rule_id=rule.rule_id,
                                        rule_version=RULE_VERSION,
                                        is_development=False,
                                    )
                                )
            except OSError as exc:
                errors.append(f"Could not read {relative_path.as_posix()}")
                logger.warning("CryptoEngine: could not read %s", relative_path.as_posix())

        return AnalysisResult(
            findings=tuple(findings),
            files_processed=files_processed,
            errors=tuple(errors),
            components=tuple(components),
        )


def _algo_category(algorithm: str) -> str:
    """Map algorithm name to a broad category string."""
    alg = algorithm.upper()
    if any(k in alg for k in ("RSA", "ECDSA", "ECDH", "DH", "DSA", "PKCS")):
        return "asymmetric"
    if any(k in alg for k in ("AES", "DES", "3DES", "RC4", "CHACHA", "BLOWFISH")):
        return "symmetric"
    if any(k in alg for k in ("MD5", "SHA", "BLAKE")):
        return "hash"
    if any(k in alg for k in ("HMAC", "MAC", "POLY1305")):
        return "mac"
    if any(k in alg for k in ("PBKDF2", "BCRYPT", "ARGON", "SCRYPT")):
        return "kdf"
    return "other"
