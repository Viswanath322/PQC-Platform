"""
Repository-relative path utilities for the analysis pipeline.

The Day 2 contract requires that all file_path values stored in findings
are normalized, repository-relative POSIX paths — never host absolute paths
or raw upload storage locations.

    engine_root = Path("/storage/scans/abc-123/repository")
    absolute    = Path("/storage/scans/abc-123/repository/src/auth/login.py")
    relative    = normalize_path(absolute, engine_root)
    # → "src/auth/login.py"
"""

from __future__ import annotations

from pathlib import Path, PurePosixPath


class PathNormalizationError(ValueError):
    """Raised when a file path cannot be expressed relative to the scan root."""


def normalize_path(file_path: Path, scan_root: Path) -> str:
    """
    Return a normalized, repository-relative POSIX path string.

    Parameters
    ----------
    file_path:
        Absolute path to a file inside the extracted repository.
    scan_root:
        Absolute path to the extraction root directory for this scan.

    Returns
    -------
    str
        A forward-slash-separated relative path suitable for storage
        and display (e.g. ``"src/auth/login.py"``).

    Raises
    ------
    PathNormalizationError
        If file_path does not fall under scan_root.
    """
    path_obj = Path(file_path)
    if not path_obj.is_absolute():
        return PurePosixPath(path_obj).as_posix()
    try:
        resolved_file = path_obj.resolve()
        resolved_root = scan_root.resolve()
        relative = resolved_file.relative_to(resolved_root)
        return PurePosixPath(relative).as_posix()
    except ValueError as exc:
        raise PathNormalizationError(
            f"File {file_path} is not inside scan root {scan_root}"
        ) from exc


def normalize_findings_paths(
    findings: tuple,
    scan_root: Path,
) -> tuple:
    """
    Return a new tuple of Findings with file_path replaced by relative paths.

    Findings whose path cannot be relativized are skipped with a warning;
    they should not be persisted.
    """
    import logging
    from .base.finding import Finding

    logger = logging.getLogger(__name__)
    result = []
    for f in findings:
        try:
            rel_path = normalize_path(Path(f.file_path), scan_root)
            # frozen dataclass — rebuild with the normalized path
            result.append(
                Finding(
                    finding_id=f.finding_id,
                    engine=f.engine,
                    category=f.category,
                    severity=f.severity,
                    title=f.title,
                    file_path=rel_path,
                    line_number=f.line_number,
                    evidence=f.evidence,
                    confidence=f.confidence,
                    recommendation=f.recommendation,
                    explanation=f.explanation,
                    is_development=f.is_development,
                    rule_id=getattr(f, "rule_id", None),
                    rule_version=getattr(f, "rule_version", None),
                    group_key=getattr(f, "group_key", None),
                    source_engine=getattr(f, "source_engine", None),
                    correlation_group_id=getattr(f, "correlation_group_id", None),
                )
            )
        except PathNormalizationError:
            logger.warning(
                "Skipping finding %s: path %s is outside scan root %s",
                f.finding_id, f.file_path, scan_root,
            )
    return tuple(result)
