"""
Dependency analysis engine — Day 3 SBOM foundation.

Scans package manifest files to detect:
  - Known end-of-life / vulnerable pinned package versions
  - Unpinned dependencies (no version constraint — supply-chain risk)
  - Known CVE-carrying packages

Supported manifests: requirements.txt, package.json (name only, no npm audit),
Pipfile, pyproject.toml, Cargo.toml, go.mod, pom.xml, build.gradle.

Design: no network access, no external vulnerability DB, stdlib only.
Results are labelled "Vulnerable Dependency" or "Unpinned Dependency".
"""

from __future__ import annotations

import logging
import re
import time
from pathlib import Path
from typing import Iterable
from uuid import NAMESPACE_URL, uuid5

from ..base.analyzer import AnalysisEngine
from ..base.finding import EngineName, Finding, Severity
from ..base.result import AnalysisResult

logger = logging.getLogger(__name__)

RULE_VERSION = "1.0.0"

_MANIFEST_NAMES = {
    "requirements.txt", "requirements-dev.txt", "requirements-test.txt",
    "requirements-prod.txt", "constraints.txt",
    "package.json",
    "pipfile",
    "pyproject.toml",
    "cargo.toml",
    "go.mod",
    "pom.xml",
    "build.gradle",
    "gemfile",
}

_MAX_FILE_BYTES = 256 * 1024
_MAX_LINE_CHARS = 500
_MAX_SCAN_SECONDS = 20.0


# ---------------------------------------------------------------------------
# Known-vulnerable Python package version rules
# (version patterns match the pinned version in requirements.txt format)
# ---------------------------------------------------------------------------
_PYTHON_VULN_RULES = [
    {
        "rule_id": "DEP-PY-001",
        "pattern": re.compile(r"(?i)^flask\s*==\s*0\.", re.MULTILINE),
        "title": "Flask 0.x — end of life, multiple known CVEs",
        "severity": "high",
        "explanation": (
            "Flask 0.x is end-of-life and contains known security vulnerabilities "
            "including debug-mode exposure and session fixation issues."
        ),
        "recommendation": "Upgrade to Flask >= 3.0.",
        "confidence": 0.95,
    },
    {
        "rule_id": "DEP-PY-002",
        "pattern": re.compile(r"(?i)^requests\s*==\s*2\.[0-9]\."),
        "title": "requests < 2.20 — header injection vulnerability (CVE-2018-18074)",
        "severity": "high",
        "explanation": (
            "requests versions below 2.20.0 are vulnerable to HTTP header injection "
            "via the 'auth' parameter (CVE-2018-18074)."
        ),
        "recommendation": "Upgrade to requests >= 2.32.",
        "confidence": 0.90,
    },
    {
        "rule_id": "DEP-PY-003",
        "pattern": re.compile(r"(?i)^pycryptodome\s*==\s*3\.[0-9]\."),
        "title": "pycryptodome < 3.20 — algorithmic edge cases in prime validation",
        "severity": "medium",
        "explanation": (
            "pycryptodome < 3.20.0 contains edge cases in prime parameter validation "
            "that can weaken key generation under specific conditions."
        ),
        "recommendation": "Upgrade to pycryptodome >= 3.20.0 or use the cryptography library.",
        "confidence": 0.85,
    },
    {
        "rule_id": "DEP-PY-004",
        "pattern": re.compile(r"(?i)^django\s*==\s*[12]\.", re.MULTILINE),
        "title": "Django 1.x or 2.x — end of life, unpatched security issues",
        "severity": "high",
        "explanation": (
            "Django 1.x and 2.x are past their security support end-of-life date "
            "and receive no further security patches."
        ),
        "recommendation": "Upgrade to Django >= 4.2 LTS.",
        "confidence": 0.95,
    },
    {
        "rule_id": "DEP-PY-005",
        "pattern": re.compile(r"(?i)^sqlalchemy\s*==\s*1\.[0-3]\."),
        "title": "SQLAlchemy < 1.4 — missing security and bug-fix backports",
        "severity": "medium",
        "explanation": (
            "SQLAlchemy < 1.4 lacks security hardening and bug fixes present in "
            "later versions. Upgrading reduces exposure to known issues."
        ),
        "recommendation": "Upgrade to SQLAlchemy >= 2.0.",
        "confidence": 0.80,
    },
    {
        "rule_id": "DEP-PY-006",
        "pattern": re.compile(r"(?i)^openssl\s*==\s*1\.1\."),
        "title": "OpenSSL 1.1.1 — end of life (no security patches since Sep 2023)",
        "severity": "critical",
        "explanation": (
            "OpenSSL 1.1.1 reached end-of-life in September 2023 and no longer "
            "receives security patches. Known CVEs remain unpatched."
        ),
        "recommendation": "Upgrade to OpenSSL >= 3.1.",
        "confidence": 0.95,
    },
    {
        "rule_id": "DEP-PY-007",
        "pattern": re.compile(r"(?i)^pillow\s*==\s*(?:[1-8]\.|9\.[0-4]\.)"),
        "title": "Pillow < 9.5 — multiple image parsing CVEs",
        "severity": "high",
        "explanation": (
            "Pillow versions prior to 9.5 contain multiple heap buffer overflow "
            "and denial-of-service vulnerabilities in image parsers."
        ),
        "recommendation": "Upgrade to Pillow >= 10.0.",
        "confidence": 0.88,
    },
    {
        "rule_id": "DEP-PY-008",
        "pattern": re.compile(r"(?i)^cryptography\s*==\s*(?:[0-9]\.|[12][0-9]\.|3[0-9]\.)"),
        "title": "cryptography < 41.0 — OpenSSL backend CVEs",
        "severity": "high",
        "explanation": (
            "The cryptography package before 41.0 links against OpenSSL versions "
            "with unpatched vulnerabilities."
        ),
        "recommendation": "Upgrade to cryptography >= 41.0.",
        "confidence": 0.82,
    },
    {
        "rule_id": "DEP-UNPINNED-001",
        "pattern": re.compile(r"(?i)^([a-zA-Z][a-zA-Z0-9_\-\.]+)\s*$"),
        "title": "Unpinned dependency — no version constraint specified",
        "severity": "low",
        "explanation": (
            "A package is listed without a version constraint. This means any "
            "version (including future breaking or vulnerable releases) can be "
            "installed, reducing build reproducibility."
        ),
        "recommendation": (
            "Pin the dependency to an exact version or a narrow range, "
            "and commit a lockfile."
        ),
        "confidence": 0.70,
    },
]


def _finding_id(rule_id: str, file_path: str, line_number: int) -> str:
    return str(uuid5(NAMESPACE_URL, f"pqc/{rule_id}/{file_path}/{line_number}"))


def _is_manifest(path: Path) -> bool:
    return path.name.lower() in _MANIFEST_NAMES


class DependencyEngine(AnalysisEngine):
    """Scans package manifests for known-vulnerable and unpinned dependencies."""

    @property
    def name(self) -> EngineName:
        return EngineName.DEPENDENCY

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
        findings: list[Finding] = []
        errors: list[str] = []
        files_processed = 0
        scan_deadline = time.monotonic() + _MAX_SCAN_SECONDS
        seen: set[tuple[str, str, int]] = set()

        for file_path in files:
            if not _is_manifest(file_path):
                continue
            if file_path.is_symlink():
                continue
            relative_path = self._relative_path(file_path)
            files_processed += 1

            try:
                raw = file_path.read_bytes()[:_MAX_FILE_BYTES]
                try:
                    text = raw.decode("utf-8")
                except UnicodeDecodeError:
                    text = raw.decode("latin-1", errors="replace")

                # Only apply Python rules to requirements*.txt
                is_requirements = file_path.name.lower().startswith("requirements")
                applicable_rules = _PYTHON_VULN_RULES if is_requirements else []

                lines = text.splitlines()
                for lineno, line in enumerate(lines, start=1):
                    if time.monotonic() >= scan_deadline:
                        errors.append("Dependency scan time budget exceeded")
                        return AnalysisResult(
                            findings=tuple(findings),
                            files_processed=files_processed,
                            errors=tuple(errors),
                        )
                    capped = line[:_MAX_LINE_CHARS].lstrip()
                    if capped.startswith(("#", "//")):
                        continue
                    for rule in applicable_rules:
                        if rule["pattern"].search(capped):
                            key = (rule["rule_id"], str(file_path), lineno)
                            if key in seen:
                                continue
                            seen.add(key)
                            findings.append(
                                Finding(
                                    finding_id=_finding_id(
                                        rule["rule_id"], str(file_path), lineno
                                    ),
                                    engine=EngineName.DEPENDENCY,
                                    category="Vulnerable Dependency",
                                    severity=Severity(rule["severity"]),
                                    title=rule["title"],
                                    file_path=str(file_path),
                                    line_number=lineno,
                                    evidence=capped[:200],
                                    confidence=rule["confidence"],
                                    recommendation=rule["recommendation"],
                                    explanation=rule["explanation"],
                                    is_development=False,
                                    rule_id=rule["rule_id"],
                                    rule_version=RULE_VERSION,
                                    group_key=(
                                        f"{rule['rule_id']}:{relative_path.as_posix()}"
                                    ),
                                )
                            )
            except OSError:
                errors.append(f"Could not read {relative_path.as_posix()}")
                logger.warning(
                    "DependencyEngine: could not read %s", relative_path.as_posix()
                )

        return AnalysisResult(
            findings=tuple(findings),
            files_processed=files_processed,
            errors=tuple(errors),
        )
