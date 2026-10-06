"""
Configuration analysis engine — deterministic, pattern-based, stdlib-only.

Scans configuration files (.env, .yaml, .yml, Dockerfile, etc.)
for insecure configurations, disabled TLS verification, and weak security parameters.
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

_CONFIG_EXTENSIONS = {
    ".env", ".yaml", ".yml", ".json", ".toml", ".conf", ".cfg", ".ini",
}

_CONFIG_FILENAMES = {
    "dockerfile", "docker-compose.yml", "docker-compose.yaml", ".env", ".env.local",
}

_EXCLUDED_DIRS = {
    "node_modules", "vendor", "generated", "gen", ".git",
    "__pycache__", "dist", "build", ".venv", "venv",
}


def _is_excluded(path: Path) -> bool:
    return any(part.lower() in _EXCLUDED_DIRS for part in path.parts)


def _finding_id(rule_id: str, path: str, line: int) -> str:
    return str(uuid5(NAMESPACE_URL, f"configuration:{rule_id}:{path}:{line}"))


_CONFIG_RULES = [
    (
        "CFG-001",
        re.compile(r"\b(ssl_verify\s*=\s*(false|0)|insecure_skip_verify\s*[:=]\s*(true|1))\b", re.I),
        "TLS Certificate Verification Disabled",
        "Configuration explicitly disables TLS certificate validation, making communication vulnerable to MitM attacks.",
        Severity.HIGH,
        0.95,
        "Enable strict TLS verification in production configurations.",
    ),
    (
        "CFG-002",
        re.compile(r"\b(tls_version|ssl_version)\s*[:=]\s*['\"]?(tls1\.?0|tls1\.?1|ssl2|ssl3)['\"]?", re.I),
        "Insecure TLS Protocol Version Configured",
        "Legacy TLS protocol version configured. TLS 1.0 and 1.1 are deprecated and lack modern cipher protection.",
        Severity.HIGH,
        0.90,
        "Enforce TLS 1.3 or minimum TLS 1.2 with post-quantum hybrid key exchange.",
    ),
    (
        "CFG-003",
        re.compile(r"\b(debug\s*[:=]\s*(true|1)|flask_env\s*[:=]\s*development)\b", re.I),
        "Debug Mode Enabled in Configuration",
        "Application configuration specifies debug/development mode enabled.",
        Severity.LOW,
        0.75,
        "Disable debug mode in production deployment environments.",
    ),
]


class ConfigurationEngine(AnalysisEngine):
    """Deterministic configuration and IaC inspector."""

    @property
    def name(self) -> EngineName:
        return EngineName.CONFIGURATION

    def analyze(self, files: Iterable[Path]) -> AnalysisResult:
        findings: list[Finding] = []
        errors: list[str] = []
        files_processed = 0

        for file_path in files:
            is_config = (
                file_path.suffix.lower() in _CONFIG_EXTENSIONS
                or file_path.name.lower() in _CONFIG_FILENAMES
            )
            if not is_config or _is_excluded(file_path):
                continue

            files_processed += 1
            try:
                content = file_path.read_text(encoding="utf-8", errors="replace")
                lines = content.splitlines()
                for lineno, line in enumerate(lines, start=1):
                    for rule_id, pattern, title, explanation, severity, confidence, recommendation in _CONFIG_RULES:
                        if pattern.search(line):
                            findings.append(
                                Finding(
                                    finding_id=_finding_id(rule_id, str(file_path), lineno),
                                    engine=EngineName.CONFIGURATION,
                                    category="configuration",
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
                errors.append(f"Could not read config file {file_path}: {exc}")
                logger.warning("ConfigurationEngine: error reading %s: %s", file_path, exc)

        return AnalysisResult(
            findings=tuple(findings),
            files_processed=files_processed,
            errors=tuple(errors),
        )
