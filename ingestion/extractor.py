"""Safe ZIP extraction with traversal and symlink protections."""

from pathlib import Path, PurePosixPath
import ntpath
import lzma
import os
import shutil
import stat
import uuid
import zipfile
import zlib

from .file_filter import is_excluded
from .validator import DEFAULT_ZIP_LIMITS, ZipLimits, validate_zip

# Import base ExtractionError from package root to ensure consistency
try:
    from . import ExtractionError
except ImportError:
    # Fallback for standalone usage
    class ExtractionError(ValueError):
        """Raised when an archive contains unsafe or unsupported entries."""


def _safe_target(root: Path, member_name: str) -> Path:
    # ZIP member names use POSIX separators, including on Windows.
    name = member_name.replace("\\", "/")
    member = PurePosixPath(name)
    if name.startswith("/") or member.is_absolute() or any(p == ".." for p in member.parts):
        raise ExtractionError(f"Unsafe ZIP member path: {member_name}")
    if member.parts and ":" in member.parts[0]:
        raise ExtractionError(f"Drive-qualified ZIP member path: {member_name}")
    target = root.joinpath(*member.parts)
    try:
        target.resolve(strict=False).relative_to(root.resolve())
    except ValueError as exc:
        raise ExtractionError(f"ZIP member escapes extraction root: {member_name}") from exc
    return target


def extract_zip_safely(
    archive_path: str | Path,
    destination: str | Path,
    limits: ZipLimits = DEFAULT_ZIP_LIMITS,
) -> list[Path]:
    """Validate then extract a ZIP under destination; reject traversal and symlinks.

    Destination is expected to be a fresh, scan-specific directory. On any error,
    the partial destination created by this call is removed.
    """
    archive = validate_zip(archive_path, limits)
    root = Path(destination).resolve()
    
    # Issue #6: Extract to temp folder then rename atomically
    if root.is_symlink():
        raise ExtractionError("Extraction destination is a symlink")
    
    # Issue #6: If already exists and has summary, treat as already done
    if root.exists():
        if any(root.iterdir()):
            raise ExtractionError(f"Extraction destination is not empty: {root}")
    
    # Issue #6: Use temp folder with unique suffix to prevent concurrent conflicts
    temp_root = root.parent / f"{root.name}.tmp-{uuid.uuid4().hex[:8]}"
    
    try:
        temp_root.mkdir(parents=True, exist_ok=False)
        
        seen: set[str] = set()
        bytes_written = 0
        files_written = 0
        with zipfile.ZipFile(archive) as zipped:
            for info in zipped.infolist():
                target = _safe_target(temp_root, info.filename)
                canonical_name = ntpath.normcase(PurePosixPath(info.filename.replace("\\", "/")).as_posix())
                if canonical_name in seen:
                    raise ExtractionError(f"Duplicate ZIP member path: {info.filename}")
                seen.add(canonical_name)
                mode = info.external_attr >> 16
                if stat.S_ISLNK(mode):
                    raise ExtractionError(f"Symbolic links are not allowed in ZIPs: {info.filename}")
                
                # Issue #4: Check if this path should be excluded before writing
                relative_path = PurePosixPath(info.filename.replace("\\", "/"))
                should_exclude = is_excluded(relative_path)
                
                if info.is_dir():
                    # Don't write excluded directories
                    if not should_exclude:
                        target.mkdir(parents=True, exist_ok=True)
                    continue
                
                if should_exclude:
                    # Issue #4: Don't write excluded files to disk, but count bytes
                    bytes_written += info.file_size
                    continue
                
                # Issue #4: Count files after exclusions
                files_written += 1
                if files_written > limits.max_files:
                    raise ExtractionError(f"Too many included files ({files_written}; limit {limits.max_files})")
                
                target.parent.mkdir(parents=True, exist_ok=True)
                with zipped.open(info) as source, target.open("xb") as output:
                    while chunk := source.read(1024 * 1024):
                        bytes_written += len(chunk)
                        if bytes_written > limits.max_uncompressed_bytes:
                            raise ExtractionError(
                                "ZIP expanded beyond the configured uncompressed-size limit"
                            )
                        output.write(chunk)
        
        # Issue #6: Atomic rename from temp to final destination
        os.rename(temp_root, root)
        return [p for p in root.rglob("*") if p.is_file()]
    except BaseException:
        # Issue #5: Cleanup temp folder on any exception
        shutil.rmtree(temp_root, ignore_errors=True)
        raise
