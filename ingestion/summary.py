"""Repository ingestion orchestration and JSON-friendly summary output.

INVENTORY OUTPUT FORMAT (for analysis engines):
{
    "files_seen": int,           # Total files in ZIP
    "files_included": int,       # Files after exclusions
    "files_excluded": int,       # Number of excluded files
    "skip_reason_counts": {      # Why files were excluded
        "excluded_directory:node_modules": int,
        "excluded_file:.ds_store": int,
        ...
    },
    "file_type_counts": {        # File classifications
        "source": int, "config": int, "manifest": int,
        "docs": int, "data": int, "binary": int,
        "crypto_material": int, "generated": int, "vendor": int
    },
    "language_counts": {         # Detected languages
        "python": int, "javascript": int, ...
    },
    "files": [                   # File inventory (deterministically sorted)
        {
            "path": str,         # Relative POSIX path (e.g., "src/main.py")
            "file_type": str,    # Classification
            "language": str|null,# Language or null
            "size_bytes": int|null
        },
        ...
    ],
    "excluded_files": [          # Optional: only if exclusions exist
        {
            "path": str,
            "skip_reason": str   # e.g., "excluded_directory:build"
        },
        ...
    ]
}
"""

from collections import Counter
from pathlib import Path

from .classifier import classify_file
from .extractor import extract_zip_safely
from .file_filter import is_excluded, get_exclusion_reason
from .language_detector import detect_language
from .validator import DEFAULT_ZIP_LIMITS, ZipLimits


def build_summary(files: list[Path], extraction_root: str | Path, all_zip_members: list[Path] | None = None) -> dict:
    root = Path(extraction_root).resolve()
    
    # Day 3: Track excluded files from original ZIP if available
    excluded_records = []
    skip_reason_counts: Counter[str] = Counter()
    
    if all_zip_members:
        # We have the complete ZIP member list, so we can track what was excluded
        for zip_member in all_zip_members:
            skip_reason = get_exclusion_reason(zip_member)
            if skip_reason:
                skip_reason_counts[skip_reason] += 1
                excluded_records.append({"path": zip_member.as_posix(), "skip_reason": skip_reason})
    
    # Filter on relative paths, not absolute paths (issue #1)
    included = []
    for path in files:
        relative = path.relative_to(root)
        # Files on disk should all be included (already filtered by extractor)
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
        # Issue #18: Guard stat() to handle vanished files
        try:
            size_bytes = path.stat().st_size
        except OSError:
            size_bytes = None
        records.append({"path": relative, "file_type": file_type, "language": language, "size_bytes": size_bytes})
    
    # Day 3: Include skip reasons in summary
    total_files = len(all_zip_members) if all_zip_members else len(files)
    result = {
        "files_seen": total_files,
        "files_included": len(records),
        "files_excluded": len(excluded_records),
        "file_type_counts": dict(sorted(type_counts.items())),
        "language_counts": dict(sorted(language_counts.items())),
        "files": records,
    }
    
    # Include skip_reason_counts and excluded_files only if there are exclusions
    if skip_reason_counts:
        result["skip_reason_counts"] = dict(sorted(skip_reason_counts.items()))
    if excluded_records:
        result["excluded_files"] = sorted(excluded_records, key=lambda x: x["path"])
    
    return result


def ingest_repository(
    archive_path: str | Path,
    scan_directory: str | Path,
    limits: ZipLimits = DEFAULT_ZIP_LIMITS,
) -> dict:
    """Extract and summarize a repository ZIP in its scan-specific directory."""
    # Day 3: Get all file names from ZIP before extraction (to track exclusions)
    import zipfile
    all_zip_members = []
    try:
        with zipfile.ZipFile(archive_path, "r") as z:
            all_zip_members = [
                Path(info.filename.replace("\\", "/"))
                for info in z.infolist()
                if not info.is_dir()
            ]
    except zipfile.BadZipFile:
        # Will be caught by extractor validation
        pass
    
    extracted = extract_zip_safely(archive_path, scan_directory, limits)
    return build_summary(extracted, scan_directory, all_zip_members)
