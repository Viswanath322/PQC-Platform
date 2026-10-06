"""
Configuration analysis engine — Day 3.

Scans .env, YAML, JSON, TOML, INI and PEM files for:
  - Hardcoded secrets / credentials
  - PEM private keys
  - Database connection strings with embedded credentials
  - Insecure TLS/SSL configuration settings

Design: no network access, stdlib only, deterministic, rule_id + rule_version
on every Finding, explanation populated, symlinks skipped.
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

_SCANNABLE_EXT = {".env", ".yaml", ".yml", ".json", ".toml", ".ini",
                  ".cfg", ".conf", ".properties", ".pem", ".key"}
_SCANNABLE_NAMES = {".env", "secrets.yml", "secrets.yaml", "credentials.json",
                    "application.properties", "application.yml"}

_EXCLUDED_DIRS = {
    "node_modules", "vendor", ".git", "__pycache__", ".venv", "venv",
    "dist", "build",
}

_MAX_FILE_BYTES = 512 * 1024
_MAX_LINE_CHARS = 2000
_MAX_FILE_SECONDS = 3.0
_MAX_SCAN_SECONDS = 30.0


# ---------------------------------------------------------------------------
# Rule definitions
# ---------------------------------------------------------------------------
_RULES = [
    {
        "rule_id": "CONF-SEC-001",
        "title": "Hardcoded credential in configuration file",
        "category": "Hardcoded Secret",
        "severity": "critical",
        "pattern": re.compile(
            r'(?i)(?:^|[^a-zA-Z])(?:database_?password|db_?password|db_?pass|'
            r'password|passwd|secret|api[_-]?key|auth[_-]?key|token|jwt[_-]?secret|'
            r'access[_-]?key|private[_-]?key|client[_-]?secret)'
            r'\s*[=:]\s*'
            r'(?!.*(?:example|placeholder|changeme|your[_-]|<[a-z]|>\s*$|\$\{|\$\())'
            r'["\']?[^\s"\'<>{}\n$]{6,200}',
        ),
        "explanation": (
            "A plain-text credential was found in a configuration file. "
            "Configuration files are commonly committed to version control, "
            "exposing the credential to any repository reader."
        ),
        "recommendation": (
            "Move the value to an environment variable or a local secrets manager. "
            "Rotate the exposed credential immediately."
        ),
        "confidence": 0.78,
    },
    {
        "rule_id": "CONF-SEC-002",
        "title": "PEM private key block in configuration or secret file",
        "category": "Hardcoded Secret",
        "severity": "critical",
        "pattern": re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
        "explanation": (
            "A PEM-encoded private key was detected in a configuration file. "
            "Private keys must never be stored in version-controlled files."
        ),
        "recommendation": (
            "Remove the key from the file immediately, rotate the key pair, "
            "and store the key only in a secure local key store. "
            "Add *.pem and *.key to .gitignore."
        ),
        "confidence": 0.99,
    },
    {
        "rule_id": "CONF-SEC-003",
        "title": "Database connection string with embedded credentials",
        "category": "Hardcoded Secret",
        "severity": "high",
        "pattern": re.compile(
            r'(?i)(?:mysql|postgres(?:ql)?|mongodb|redis|mssql|oracle|sqlite)'
            r'://[^:@\s]{1,64}:[^@\s]{4,200}@',
        ),
        "explanation": (
            "A database URL containing a username and password was found. "
            "Connection strings with inline credentials must not be committed."
        ),
        "recommendation": (
            "Replace with an environment variable reference. "
            "Rotate the database password immediately."
        ),
        "confidence": 0.90,
    },
    {
        "rule_id": "CONF-TLS-001",
        "title": "TLS/SSL verification disabled in configuration",
        "category": "Insecure Configuration",
        "severity": "high",
        "pattern": re.compile(
            r'(?i)(?:verify(?:_ssl|_tls|_cert(?:s)?)?|ssl_verify|tls_verify)\s*[=:]\s*(?:false|0|no|off)',
        ),
        "explanation": (
            "TLS/SSL certificate verification is explicitly disabled. "
            "This allows man-in-the-middle attacks against encrypted connections."
        ),
        "recommendation": (
            "Enable TLS verification. If using a private CA, configure the CA bundle "
            "path rather than disabling verification entirely."
        ),
        "confidence": 0.88,
    },
    {
        "rule_id": "CONF-TLS-002",
        "title": "Insecure TLS protocol version enabled",
        "category": "Insecure Configuration",
        "severity": "medium",
        "pattern": re.compile(
            r'(?i)(?:ssl_protocols?|tls_protocols?)\s*[=:][^#\n]*(?:TLSv1\.0|TLSv1\.1|SSLv[23])',
        ),
        "explanation": (
            "TLS 1.0 or 1.1 is enabled. These protocol versions are deprecated "
            "and susceptible to downgrade attacks (POODLE, BEAST)."
        ),
        "recommendation": (
            "Set ssl_protocols to TLSv1.2 TLSv1.3 only and disable older versions."
        ),
        "confidence": 0.92,
    },
    {
        "rule_id": "CONF-DEBUG-001",
        "title": "Debug mode enabled in configuration",
        "category": "Insecure Configuration",
        "severity": "medium",
        "pattern": re.compile(
            r'(?i)\bdebug\s*[=:]\s*(?:true|1|yes|on)',
        ),
        "explanation": (
            "Debug mode is enabled. In production environments this can expose "
            "stack traces, internal paths, and sensitive variable values."
        ),
        "recommendation": (
            "Set debug to false in all non-development environments. "
            "Control environment-specific settings with separate config files."
        ),
        "confidence": 0.70,
    },
]


def _finding_id(rule_id: str, file_path: str, line_number: int) -> str:
    return str(uuid5(NAMESPACE_URL, f"pqc/{rule_id}/{file_path}/{line_number}"))


def _redact(line: str) -> str:
    redacted = re.sub(
        r'(?i)(\b(?:password|passwd|secret|api[_-]?key|token)\s*[=:]\s*)'
        r'(["\']?)[^\s"\'<>{}\n$]{4,200}',
        r'\1\2[REDACTED]',
        line.strip(),
    )
    return redacted[:200]


def _is_excluded(path: Path) -> bool:
    return any(p.lower() in _EXCLUDED_DIRS for p in path.parts)


def _is_scannable(path: Path) -> bool:
    return (
        path.suffix.lower() in _SCANNABLE_EXT
        or path.name.lower() in _SCANNABLE_NAMES
        or path.name.lower().startswith(".env")
    )


class ConfigurationEngine(AnalysisEngine):
    """Scans configuration files for secrets and insecure settings."""

    @property
    def name(self) -> EngineName:
        return EngineName.CONFIGURATION

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
            if not _is_scannable(file_path):
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
                        errors.append("Configuration scan time budget exceeded")
                        return AnalysisResult(
                            findings=tuple(findings),
                            files_processed=files_processed,
                            errors=tuple(errors),
                        )
                    if time.monotonic() >= file_deadline:
                        errors.append(
                            f"Config file time budget exceeded: {relative_path.as_posix()}"
                        )
                        break

                    capped = line[:_MAX_LINE_CHARS]
                    stripped = capped.lstrip()
                    if stripped.startswith(("#", "//", ";")):
                        continue

                    for rule in _RULES:
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
                                    engine=EngineName.CONFIGURATION,
                                    category=rule["category"],
                                    severity=Severity(rule["severity"]),
                                    title=rule["title"],
                                    file_path=str(file_path),
                                    line_number=lineno,
                                    evidence=_redact(capped),
                                    confidence=rule["confidence"],
                                    recommendation=rule["recommendation"],
                                    explanation=rule["explanation"],
                                    is_development=False,
                                    rule_id=rule["rule_id"],
                                    rule_version=RULE_VERSION,
                                    group_key=f"{rule['rule_id']}:{relative_path.as_posix()}",
                                )
                            )
            except OSError:
                errors.append(f"Could not read {relative_path.as_posix()}")
                logger.warning("ConfigEngine: could not read %s", relative_path.as_posix())

        return AnalysisResult(
            findings=tuple(findings),
            files_processed=files_processed,
            errors=tuple(errors),
        )
