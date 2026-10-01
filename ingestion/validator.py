"""ZIP archive validation helpers."""

from pathlib import Path
from dataclasses import dataclass
import lzma
import zipfile
import zlib


class InvalidArchiveError(ValueError):
    """Raised when an input is not a readable ZIP archive."""


@dataclass(frozen=True)
class ZipLimits:
    """Resource limits applied before ZIP members are decompressed."""

    max_uncompressed_bytes: int = 512 * 1024 * 1024
    max_compression_ratio: float = 200.0
    max_files: int = 50_000
    max_entries: int = 100_000

    def __post_init__(self) -> None:
        if self.max_uncompressed_bytes <= 0 or self.max_compression_ratio <= 0:
            raise ValueError("ZIP size and compression limits must be positive")
        if self.max_files <= 0 or self.max_entries <= 0:
            raise ValueError("ZIP file and entry limits must be positive")


DEFAULT_ZIP_LIMITS = ZipLimits()


def _check_limits(infos: list[zipfile.ZipInfo], limits: ZipLimits) -> None:
    files = [info for info in infos if not info.is_dir()]
    total_size = sum(info.file_size for info in files)
    total_compressed = sum(info.compress_size for info in files)
    if len(files) > limits.max_files:
        raise InvalidArchiveError(f"ZIP contains too many files ({len(files)}; limit {limits.max_files})")
    if len(infos) > limits.max_entries:
        raise InvalidArchiveError(f"ZIP contains too many entries ({len(infos)}; limit {limits.max_entries})")
    if total_size > limits.max_uncompressed_bytes:
        raise InvalidArchiveError(
            f"ZIP expands to {total_size} bytes; limit is {limits.max_uncompressed_bytes}"
        )
    # Only apply total ratio check if total size is > 10 MB (issue #2)
    if total_size > 10 * 1024 * 1024 and (total_compressed == 0 or total_size / total_compressed > limits.max_compression_ratio):
        raise InvalidArchiveError(
            f"ZIP compression ratio exceeds limit ({limits.max_compression_ratio:g}:1)"
        )
    # Only apply ratio check to files larger than 10 MB (issue #2)
    for info in files:
        if info.file_size > 10 * 1024 * 1024 and (info.compress_size == 0 or info.file_size / info.compress_size > limits.max_compression_ratio):
            raise InvalidArchiveError(f"ZIP member compression ratio exceeds limit: {info.filename}")


def validate_zip(path: str | Path, limits: ZipLimits = DEFAULT_ZIP_LIMITS) -> Path:
    archive = Path(path)
    if not archive.is_file() or not zipfile.is_zipfile(archive):
        raise InvalidArchiveError(f"Not a valid ZIP file: {archive}")
    try:
        with zipfile.ZipFile(archive) as zipped:
            infos = zipped.infolist()
            # Enforce metadata limits before reading any compressed payload.
            _check_limits(infos, limits)
            total_actual = 0
            for info in infos:
                if info.is_dir():
                    continue
                member_actual = 0
                with zipped.open(info) as member:
                    while chunk := member.read(1024 * 1024):
                        member_actual += len(chunk)
                        total_actual += len(chunk)
                        if total_actual > limits.max_uncompressed_bytes:
                            raise InvalidArchiveError("ZIP expands beyond the configured uncompressed-size limit")
                        # Only apply ratio check to files larger than 10 MB (issue #2)
                        if info.file_size > 10 * 1024 * 1024 and (info.compress_size == 0 or member_actual / info.compress_size > limits.max_compression_ratio):
                            raise InvalidArchiveError(
                                f"ZIP member compression ratio exceeds limit: {info.filename}"
                            )
                if member_actual != info.file_size:
                    raise InvalidArchiveError(f"ZIP member size does not match its directory entry: {info.filename}")
            if total_actual != sum(info.file_size for info in infos if not info.is_dir()):
                raise InvalidArchiveError("ZIP member sizes do not match the central directory")
    except (EOFError, OSError, RuntimeError, zipfile.BadZipFile, lzma.LZMAError, zlib.error) as exc:
        raise InvalidArchiveError(f"Unable to read ZIP file: {archive}") from exc
    return archive
