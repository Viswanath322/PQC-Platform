"""Repository ingestion orchestration and JSON-friendly summary output."""

from collections import Counter
from pathlib import Path

from .classifier import classify_file
from .extractor import extract_zip_safely
from .file_filter import is_excluded
from .language_detector import detect_language
from .validator import DEFAULT_ZIP_LIMITS, ZipLimits


def build_summary(files: list[Path], extraction_root: str | Path) -> dict:
    root = Path(extraction_root).resolve()
    # Filter on relative paths, not absolute paths (issue #1)
    included = []
    for path in files:
        relative = path.relative_to(root)
        if not is_excluded(relative):
            included.append(path)
    type_counts: Counter[str] = Counter()
    language_counts: Counter[str] = Counter()
    records = []
    for path in sorted(included, key=lambda item: item.as_posix().lower()):
        relative = path.relative_to(root).as_posix()
        try:
            with path.open("rb") as source:
                sample = source.read(8192)
        except OSError:
            sample = None
        file_type = classify_file(Path(relative), sample)
        language = detect_language(Path(relative))
        type_counts[file_type] += 1
        if language:
            language_counts[language] += 1
        records.append({"path": relative, "file_type": file_type, "language": language, "size_bytes": path.stat().st_size})
    return {
        "files_seen": len(files),
        "files_included": len(records),
        "files_excluded": len(files) - len(records),
        "file_type_counts": dict(sorted(type_counts.items())),
        "language_counts": dict(sorted(language_counts.items())),
        "files": records,
    }


def ingest_repository(
    archive_path: str | Path,
    scan_directory: str | Path,
    limits: ZipLimits = DEFAULT_ZIP_LIMITS,
) -> dict:
    """Extract and summarize a repository ZIP in its scan-specific directory."""
    extracted = extract_zip_safely(archive_path, scan_directory, limits)
    return build_summary(extracted, scan_directory)
