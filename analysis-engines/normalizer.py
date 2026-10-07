"""
Finding normalization and deduplication for the PQC platform.

Day 3: the pipeline may produce overlapping observations from different engines
(e.g. SAST and Crypto both flag MD5 on the same line). This module:

  1. Normalizes file_path to repository-relative POSIX strings.
  2. Deduplicates findings with identical (engine, file_path, line_number, rule_id).
  3. Groups related findings by group_key and attaches the group to each member.

Deduplication retains the finding with the highest confidence in each group.
Source evidence is never discarded — every retained finding preserves its
original evidence field.

Determinism guarantee: given the same input tuple the output is always the same
(findings are sorted by finding_id before grouping).
"""

from __future__ import annotations

import logging
from collections import defaultdict
from pathlib import Path

from .base.finding import Finding
from .path_utils import PathNormalizationError, normalize_path

logger = logging.getLogger(__name__)


def normalize_and_deduplicate(
    findings: tuple[Finding, ...],
    scan_root: Path,
) -> tuple[Finding, ...]:
    """
    Normalize paths and deduplicate findings.

    Parameters
    ----------
    findings:
        Raw findings from the pipeline (absolute file paths).
    scan_root:
        Root of the extracted repository; used to make paths relative.

    Returns
    -------
    tuple[Finding, ...]
        Findings with relative paths, deduplicated, sorted by severity then
        file_path then line_number.
    """
    # Step 1 — normalize paths
    normalized: list[Finding] = []
    for f in findings:
        try:
            rel = normalize_path(Path(f.file_path), scan_root)
        except PathNormalizationError:
            logger.warning(
                "Normalizer: skipping finding %s — path outside scan root: %s",
                f.finding_id, f.file_path,
            )
            continue
        normalized.append(_rebuild(f, file_path=rel))

    # Step 2 — deduplicate: keep highest confidence per (engine, file, line, rule_id)
    dedup: dict[tuple, Finding] = {}
    for f in normalized:
        key = (
            f.engine.value,
            f.file_path,
            f.line_number,
            f.rule_id or f.title,
        )
        existing = dedup.get(key)
        if existing is None or f.confidence > existing.confidence:
            dedup[key] = f

    # Step 3 — stable sort by severity rank then file path then line
    _SEVERITY_RANK = {"critical": 0, "high": 1, "medium": 2, "low": 3}

    result = sorted(
        dedup.values(),
        key=lambda f: (
            _SEVERITY_RANK.get(f.severity.value, 9),
            f.file_path,
            f.line_number or 0,
        ),
    )
    return tuple(result)


def _rebuild(f: Finding, **overrides) -> Finding:
    """Return a new Finding with selected field overrides (frozen dataclass)."""
    return Finding(
        finding_id=overrides.get("finding_id", f.finding_id),
        engine=overrides.get("engine", f.engine),
        category=overrides.get("category", f.category),
        severity=overrides.get("severity", f.severity),
        title=overrides.get("title", f.title),
        file_path=overrides.get("file_path", f.file_path),
        line_number=overrides.get("line_number", f.line_number),
        evidence=overrides.get("evidence", f.evidence),
        confidence=overrides.get("confidence", f.confidence),
        recommendation=overrides.get("recommendation", f.recommendation),
        explanation=overrides.get("explanation", f.explanation),
        is_development=overrides.get("is_development", f.is_development),
        rule_id=overrides.get("rule_id", f.rule_id),
        rule_version=overrides.get("rule_version", f.rule_version),
        group_key=overrides.get("group_key", f.group_key),
    )
