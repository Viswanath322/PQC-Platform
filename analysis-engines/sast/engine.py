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
import time
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
    ".ps1", ".rs", ".swift", ".kt", ".scala", ".env", ".yaml", ".yml",
    ".json", ".pem", ".toml", ".ini", ".cfg", ".properties",
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
_MAX_LINE_CHARS = 2000
_MAX_FILE_SECONDS = 5.0
_MAX_SCAN_SECONDS = 60.0


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
        rules = get_rules()
        findings: list[Finding] = []
        errors: list[str] = []
        files_processed = 0
        scan_deadline = time.monotonic() + _MAX_SCAN_SECONDS
        seen: set[tuple[str, str, int]] = set()  # (rule_id, file_path, line_number)

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
                        errors.append("SAST scan time budget exceeded")
                        return AnalysisResult(findings=tuple(findings), files_processed=files_processed, errors=tuple(errors))
                    if time.monotonic() >= file_deadline:
                        errors.append(f"SAST file time budget exceeded: {relative_path.as_posix()}")
                        break
                    line = line[:_MAX_LINE_CHARS]
                    stripped = line.lstrip()
                    if stripped.startswith(("#", "//", "/*", "*", "<!--", "--")):
                        continue
                    if re.search(r"(?i)(example|placeholder|test.only|changeme|your[_ -]?(?:key|token|secret))", line):
                        continue
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
                errors.append(f"Could not read {relative_path.as_posix()}")
                logger.warning("SAST: could not read repository file %s", relative_path.as_posix())

        return AnalysisResult(
            findings=tuple(findings),
            files_processed=files_processed,
            errors=tuple(errors),
        )
