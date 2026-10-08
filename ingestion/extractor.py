"""Safe ZIP extraction with traversal and symlink protections."""

from pathlib import Path, PurePosixPath
import logging
import ntpath
import lzma
import os
import re
import shutil
import stat
import unicodedata
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


# Issue #16: Add logging
log = logging.getLogger(__name__)

# Issue #8: Windows reserved names pattern
_WINDOWS_RESERVED = re.compile(r"^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..+)?$", re.IGNORECASE)


def _safe_target(root: Path, member_name: str) -> Path:
    # ZIP member names use POSIX separators, including on Windows.
    name = member_name.replace("\\", "/")
    member = PurePosixPath(name)
    
    # Issue #15: Use truncated/sanitized names in errors
    safe_name = repr(member_name[:100])
    
    if name.startswith("/") or member.is_absolute() or any(p == ".." for p in member.parts):
        raise ExtractionError("Unsafe ZIP member: path traversal detected")
    
    # Issue #8: Check each part for Windows path issues
    for part in member.parts:
        if not part:  # Issue #17: Empty parts
            raise ExtractionError("ZIP member has empty path component")
        # Issue #8: Check for colon anywhere (NTFS alternate data streams)
        if ":" in part:
            raise ExtractionError("ZIP member contains invalid path separator")
        # Issue #8: Check for other invalid Windows characters
        if any(c in part for c in '<>"|?*') or any(ord(c) < 32 for c in part):
            raise ExtractionError("ZIP member contains invalid characters")
        # P2 #23e.5: Reserved names now skipped earlier, not rejected here
        # Issue #8: Check for trailing dots or spaces (Windows strips them)
        if part.endswith('.') or part.endswith(' '):
            raise ExtractionError("ZIP member has invalid trailing characters")
    
    target = root.joinpath(*member.parts)
    try:
        target.resolve(strict=False).relative_to(root.resolve())
    except ValueError as exc:
        raise ExtractionError("ZIP member path escapes extraction directory") from exc
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
    # Issue #16: Log extraction start
    log.info(f"Starting ZIP extraction to {destination}")
    
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
        dirs_written = 0
        with zipfile.ZipFile(archive) as zipped:
            for info in zipped.infolist():
                # P2 #23e.1: Check exclusions FIRST before applying limits
                # This prevents node_modules/.git from counting against limits
                relative_path = PurePosixPath(info.filename.replace("\\", "/"))
                should_exclude = is_excluded(relative_path)
                
                # P2 #23e.5: Skip files with Windows reserved names instead of rejecting whole ZIP
                parts = relative_path.parts
                has_reserved = any(_WINDOWS_RESERVED.match(part) for part in parts)
                
                # Skip excluded entries or reserved names early - don't even validate them
                if should_exclude or has_reserved:
                    if has_reserved:
                        log.info(f"Skipping file with reserved name: {info.filename}")
                    continue
                
                try:
                    target = _safe_target(temp_root, info.filename)
                except ExtractionError as e:
                    # P2 #23e.4: Wrap OS errors to avoid leaking host paths
                    if "extraction directory" in str(e) or "path escapes" in str(e):
                        raise ExtractionError("Invalid ZIP member path") from None
                    raise
                
                # Issue #7: Check path depth and length limits
                parts = PurePosixPath(info.filename.replace("\\", "/")).parts
                if len(parts) > limits.max_depth:
                    # Issue #15: Log details internally but use generic message
                    log.warning(f"ZIP rejected - path depth {len(parts)} > {limits.max_depth}: {repr(info.filename[:100])}")
                    raise ExtractionError(f"Path depth exceeds limit ({limits.max_depth})")
                if len(info.filename) > limits.max_path_len:
                    log.warning(f"ZIP rejected - path length {len(info.filename)} > {limits.max_path_len}: {repr(info.filename[:100])}")
                    raise ExtractionError(f"Path length exceeds limit ({limits.max_path_len})")
                
                # Issue #7: Check member size limit
                if info.file_size > limits.max_member_bytes:
                    raise ExtractionError(f"Member size exceeds limit ({limits.max_member_bytes} bytes)")
                
                # Issue #8: Unicode normalization for duplicate detection
                canonical_name = unicodedata.normalize("NFC", 
                    ntpath.normcase(PurePosixPath(info.filename.replace("\\", "/")).as_posix())
                ).casefold()
                if canonical_name in seen:
                    log.warning(f"ZIP rejected - duplicate member: {repr(info.filename[:100])}")
                    raise ExtractionError("Duplicate ZIP member path detected")
                seen.add(canonical_name)
                
                # Issue #17: Check for encrypted entries
                if info.flag_bits & 0x1:
                    log.warning(f"ZIP rejected - encrypted entry: {repr(info.filename[:100])}")
                    raise ExtractionError("Encrypted ZIP entries are not supported")
                
                mode = info.external_attr >> 16
                # Issue #17: Check symlinks only for Unix systems (create_system == 3)
                if info.create_system == 3 and mode != 0 and stat.S_ISLNK(mode):
                    log.warning(f"ZIP rejected - symlink: {repr(info.filename[:100])}")
                    raise ExtractionError("Symbolic links are not allowed in ZIPs")
                # Issue #17 + #9d: Reject non-regular files/directories (but allow mode==0 which is common)
                # Day 4 QA Fix #9d: Use S_IFMT to extract file type bits, then check if it's set and valid
                if info.create_system == 3:
                    fmt = stat.S_IFMT(mode)
                    if fmt != 0 and not (stat.S_ISREG(mode) or stat.S_ISDIR(mode)):
                        log.warning(f"ZIP rejected - special file type: {repr(info.filename[:100])}")
                        raise ExtractionError("Unsupported file type in ZIP")
                
                if info.is_dir():
                    dirs_written += 1
                    if dirs_written > limits.max_dirs:
                        raise ExtractionError(f"Too many directories ({dirs_written}; limit {limits.max_dirs})")
                    target.mkdir(parents=True, exist_ok=True)
                    continue
                
                # Count files (already filtered by exclusions above)
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
        if root.exists():
            root.rmdir()
        os.rename(temp_root, root)
        # Issue #16: Log successful extraction
        log.info(f"ZIP extraction completed: {files_written} files, {dirs_written} dirs")
        return [p for p in root.rglob("*") if p.is_file()]
    except BaseException as exc:
        # Issue #5: Cleanup temp folder on any exception
        shutil.rmtree(temp_root, ignore_errors=True)
        # Issue #16: Log extraction failure
        log.warning(f"ZIP extraction failed: {type(exc).__name__}")
        raise
