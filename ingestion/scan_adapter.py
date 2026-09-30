"""Adapter for the projects/scans upload contract used by the backend API."""

import json
from pathlib import Path
from typing import Any, Protocol
import uuid

from .summary import ingest_repository


class ScanLookupSession(Protocol):
    """Small SQLAlchemy Session surface needed by scan ingestion."""

    def get(self, entity: Any, ident: Any) -> Any: ...


class ScanNotFoundError(LookupError):
    """Raised when the requested scan is absent from the database."""


def ingest_scan_record(
    db: ScanLookupSession,
    scan_model: Any,
    scan_id: str,
    storage_root: str | Path,
) -> dict:
    """Load a scan row and ingest its persisted ``repository_path``.

    ``db`` should be the application's SQLAlchemy session configured for its
    database (MySQL in the team integration). The path is read from the row,
    never from an API response or client-supplied request field.
    """
    try:
        normalized_scan_id = str(uuid.UUID(scan_id))
    except (ValueError, AttributeError, TypeError) as exc:
        raise ValueError("scan_id must be a valid UUID") from exc

    scan = db.get(scan_model, normalized_scan_id)
    if scan is None:
        raise ScanNotFoundError(f"Scan not found: {normalized_scan_id}")
    repository_path = getattr(scan, "repository_path", None)
    if not repository_path:
        raise ValueError(f"Scan has no repository_path: {normalized_scan_id}")
    return ingest_scan_upload(repository_path, normalized_scan_id, storage_root)


def ingest_scan_upload(repository_path: str | Path, scan_id: str, storage_root: str | Path) -> dict:
    """Ingest Aakash's saved upload for one UUID scan and persist its summary.

    ``repository_path`` is the scan's uploaded ZIP path (the API's
    ``Scan.repository_path``); ``storage_root`` is the backend storage directory.
    Output is stored at ``<storage_root>/scans/<scan_id>/repository`` and the
    JSON summary at ``<storage_root>/scans/<scan_id>/ingestion-summary.json``.
    """
    try:
        normalized_scan_id = str(uuid.UUID(scan_id))
    except (ValueError, AttributeError, TypeError) as exc:
        raise ValueError("scan_id must be a valid UUID") from exc

    scan_directory = Path(storage_root).resolve() / "scans" / normalized_scan_id
    extracted_directory = scan_directory / "repository"
    summary = ingest_repository(repository_path, extracted_directory)
    scan_directory.mkdir(parents=True, exist_ok=True)
    summary_path = scan_directory / "ingestion-summary.json"
    temporary_path = scan_directory / "ingestion-summary.json.tmp"
    temporary_path.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    temporary_path.replace(summary_path)
    return summary
