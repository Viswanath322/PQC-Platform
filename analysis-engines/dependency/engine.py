"""
Dependency analysis engine — deterministic, pattern-based, stdlib-only.

Scans manifest files (requirements.txt, package.json, pom.xml, go.mod, etc.)
for outdated, vulnerable, or classically weak cryptographic dependencies.
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

logger = logging.getLogger(__name__)

_MANIFEST_NAMES = {
    "requirements.txt", "requirements-dev.txt", "pipfile", "pyproject.toml",
    "package.json", "package-lock.json", "pom.xml", "build.gradle",
    "go.mod", "cargo.toml",
}

_EXCLUDED_DIRS = {
    "node_modules", "vendor", "generated", "gen", ".git",
    "__pycache__", "dist", "build", ".venv", "venv",
}


def _is_excluded(path: Path) -> bool:
    return any(part.lower() in _EXCLUDED_DIRS for part in path.parts)


def _finding_id(rule_id: str, path: str, line: int) -> str:
    return str(uuid5(NAMESPACE_URL, f"dependency:{rule_id}:{path}:{line}"))


# Rules for known weak/vulnerable/deprecated dependencies
_DEP_RULES = [
    (
        "DEP-001",
        re.compile(r"\b(pycrypto|cryptography\s*<\s*3\.0)\b", re.I),
        "Vulnerable Legacy Cryptography Dependency",
        "Legacy or deprecated cryptography package detected. Vulnerable to known CVEs and lacks post-quantum primitives.",
        Severity.HIGH,
        0.90,
        "Upgrade to cryptography>=42.0.0 or a NIST PQC-compatible library.",
    ),
    (
        "DEP-002",
        re.compile(r"\b(hashlib-compat|md5-compat|sha1-hash)\b", re.I),
        "Weak Hash Library Dependency",
        "Dependency on broken hash algorithms (MD5/SHA1). Vulnerable to collision attacks.",
        Severity.MEDIUM,
        0.85,
        "Remove dependency and use SHA-256 / SHA-3.",
    ),
    (
        "DEP-003",
        re.compile(r"\b(node-forge|crypto-js)\b", re.I),
        "Classical In-Browser Cryptography Dependency",
        "Client-side classical crypto library detected; relies on classical asymmetric primitives.",
        Severity.LOW,
        0.80,
        "Audit usage and plan for hybrid quantum-safe key exchange.",
    ),
]


class DependencyEngine(AnalysisEngine):
    """Deterministic dependency manifest inspector."""

    @property
    def name(self) -> EngineName:
        return EngineName.DEPENDENCY

    def analyze(self, files: Iterable[Path]) -> AnalysisResult:
        findings: list[Finding] = []
        errors: list[str] = []
        files_processed = 0

        for file_path in files:
            if file_path.name.lower() not in _MANIFEST_NAMES and not file_path.name.lower().endswith((".txt", ".json", ".toml", ".mod", ".xml")):
                continue
            if _is_excluded(file_path):
                continue

            files_processed += 1
            try:
                content = file_path.read_text(encoding="utf-8", errors="replace")
                lines = content.splitlines()
                for lineno, line in enumerate(lines, start=1):
                    for rule_id, pattern, title, explanation, severity, confidence, recommendation in _DEP_RULES:
                        if pattern.search(line):
                            findings.append(
                                Finding(
                                    finding_id=_finding_id(rule_id, str(file_path), lineno),
                                    engine=EngineName.DEPENDENCY,
                                    category="dependency",
                                    severity=severity,
                                    title=title,
                                    file_path=str(file_path),
                                    line_number=lineno,
                                    evidence=line.strip()[:200],
                                    confidence=confidence,
                                    recommendation=recommendation,
                                    explanation=explanation,
                                    is_development=False,
                                )
                            )
            except OSError as exc:
                errors.append(f"Could not read manifest {file_path}: {exc}")
                logger.warning("DependencyEngine: error reading %s: %s", file_path, exc)

        return AnalysisResult(
            findings=tuple(findings),
            files_processed=files_processed,
            errors=tuple(errors),
        )
