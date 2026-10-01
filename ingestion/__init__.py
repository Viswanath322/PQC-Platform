"""Safe repository ZIP ingestion for the PQC platform."""

from .validator import InvalidArchiveError, ZipLimits


class IngestionError(ValueError):
    """Base exception for all ingestion-related errors.
    
    Issue #19: Common base class for ingestion errors so callers can
    distinguish ingestion failures from other ValueError/bugs.
    """


# Define ExtractionError here to inherit from IngestionError
class ExtractionError(IngestionError):
    """Raised when an archive contains unsafe or unsupported entries."""


# Re-export from modules (they still define their own, but we export the base versions)
from .scan_adapter import ScanNotFoundError, ingest_scan_record, ingest_scan_upload
from .summary import build_summary, ingest_repository
from .extractor import extract_zip_safely


__all__ = [
    "IngestionError",
    "ExtractionError",
    "InvalidArchiveError",
    "ZipLimits",
    "extract_zip_safely",
    "build_summary",
    "ingest_repository",
    "ingest_scan_upload",
    "ingest_scan_record",
    "ScanNotFoundError",
]
