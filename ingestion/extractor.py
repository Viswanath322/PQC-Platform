"""Safe ZIP extraction with traversal and symlink protections."""

from pathlib import Path, PurePosixPath
import shutil
import stat
import zipfile

from .validator import InvalidArchiveError, validate_zip


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


def extract_zip_safely(archive_path: str | Path, destination: str | Path) -> list[Path]:
    """Validate then extract a ZIP under destination; reject traversal and symlinks.

    Destination is expected to be a fresh, scan-specific directory. On any error,
    the partial destination created by this call is removed.
    """
    archive = validate_zip(archive_path)
    root = Path(destination).resolve()
    if root.exists() and any(root.iterdir()):
        raise ExtractionError(f"Extraction destination is not empty: {root}")
    root.mkdir(parents=True, exist_ok=True)
    try:
        with zipfile.ZipFile(archive) as zipped:
            for info in zipped.infolist():
                target = _safe_target(root, info.filename)
                mode = info.external_attr >> 16
                if stat.S_ISLNK(mode):
                    raise ExtractionError(f"Symbolic links are not allowed in ZIPs: {info.filename}")
                if info.is_dir():
                    target.mkdir(parents=True, exist_ok=True)
                    continue
                target.parent.mkdir(parents=True, exist_ok=True)
                # Exclusive creation prevents overwriting entries through duplicate paths.
                with zipped.open(info) as source, target.open("xb") as output:
                    shutil.copyfileobj(source, output)
        return [p for p in root.rglob("*") if p.is_file()]
    except (OSError, zipfile.BadZipFile, RuntimeError, ExtractionError):
        shutil.rmtree(root, ignore_errors=True)
        raise
