"""ZIP archive validation helpers."""

from pathlib import Path
import zipfile


class InvalidArchiveError(ValueError):
    """Raised when an input is not a readable ZIP archive."""


def validate_zip(path: str | Path) -> Path:
    archive = Path(path)
    if not archive.is_file() or not zipfile.is_zipfile(archive):
        raise InvalidArchiveError(f"Not a valid ZIP file: {archive}")
    try:
        with zipfile.ZipFile(archive) as zipped:
            bad_member = zipped.testzip()
    except (OSError, zipfile.BadZipFile) as exc:
        raise InvalidArchiveError(f"Unable to read ZIP file: {archive}") from exc
    if bad_member is not None:
        raise InvalidArchiveError(f"Corrupt ZIP member: {bad_member}")
    return archive
