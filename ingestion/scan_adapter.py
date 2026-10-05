"""Adapter for the projects/scans upload contract used by the backend API."""

import json
import os
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
    uploads_root: str | Path | None = None,
) -> dict:
    """Load a scan row and ingest its persisted ``repository_path``.

    ``db`` should be the application's SQLAlchemy session configured for its
    database (MySQL in the team integration). The path is read from the row,
    never from an API response or client-supplied request field.
    
    ``uploads_root`` confines the repository_path to the uploads folder (issue #3).
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
    return ingest_scan_upload(repository_path, normalized_scan_id, storage_root, uploads_root)


def ingest_scan_upload(repository_path: str | Path, scan_id: str, storage_root: str | Path, uploads_root: str | Path | None = None) -> dict:
    """Ingest Aakash's saved upload for one UUID scan and persist its summary.

    ``repository_path`` is the scan's uploaded ZIP path (the API's
    ``Scan.repository_path``); ``storage_root`` is the backend storage directory.
    Output is stored at ``<storage_root>/scans/<scan_id>/repository`` and the
    JSON summary at ``<storage_root>/scans/<scan_id>/ingestion-summary.json``.
    
    ``uploads_root`` confines the repository_path to the uploads folder (issue #3).
    If provided, validates that repository_path is inside uploads_root.
    """
    try:
        normalized_scan_id = str(uuid.UUID(scan_id))
    except (ValueError, AttributeError, TypeError) as exc:
        raise ValueError("scan_id must be a valid UUID") from exc

    # Issue #3: Confine repository_path to uploads folder
    repo_path = Path(repository_path)
    if not repo_path.is_absolute():
        raise ValueError("Invalid upload path")
    if uploads_root is not None:
        try:
            uploads = Path(uploads_root).resolve(strict=True)
            lexical_path = Path(os.path.abspath(repo_path))
            lexical_path.relative_to(uploads)
            current = lexical_path
            while current != uploads:
                if current.is_symlink():
                    raise ValueError("Invalid upload path")
                current = current.parent
        except (ValueError, OSError, RuntimeError) as exc:
            raise ValueError("Invalid upload path") from exc
    
    try:
        repo_path = repo_path.resolve(strict=True)
    except (OSError, RuntimeError) as exc:
        raise ValueError("Invalid upload path") from exc
    
    if uploads_root is not None:
        try:
            uploads = Path(uploads_root).resolve(strict=True)
            repo_path.relative_to(uploads)
        except (ValueError, OSError, RuntimeError) as exc:
            raise ValueError("Upload path is outside the uploads folder") from exc

    scan_directory = Path(storage_root).resolve() / "scans" / normalized_scan_id
    summary_path = scan_directory / "ingestion-summary.json"
    
    # Issue #6: If summary already exists, treat as already done (idempotent)
    if summary_path.exists():
        return json.loads(summary_path.read_text(encoding="utf-8"))
    
    extracted_directory = scan_directory / "repository"
    
    try:
        summary = ingest_repository(repo_path, extracted_directory)
        scan_directory.mkdir(parents=True, exist_ok=True)
        temporary_path = scan_directory / "ingestion-summary.json.tmp"
        temporary_path.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
        temporary_path.replace(summary_path)
        return summary
    except Exception:
        # Issue #6: On summary write failure, remove scan folder for clean retry
        import shutil
        shutil.rmtree(scan_directory, ignore_errors=True)
        raise
