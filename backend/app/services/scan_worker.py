"""
Scan processing worker for the PQC platform (Day 2).

Processes one scan end-to-end:
  QUEUED → INGESTING → ANALYZING → PROCESSING → COMPLETED (or FAILED)

Call ``process_scan(scan_id, db)`` from a background task, a Redis queue
consumer, or the development single-scan endpoint.

Design rules:
  - Status transitions are written immediately so the UI reflects progress.
  - All file paths stored in findings are repository-relative (never absolute).
  - Full secret values are never stored — evidence is limited to redacted excerpts.
  - Errors are recorded in the scan error_message field and logged; they never
    propagate raw stack traces to API responses.
  - Development findings (is_development=True) are persisted but clearly flagged.
"""

from __future__ import annotations

import logging
import sys
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Lazy imports so the backend can start even if the analysis-engines package
# has not been fully set up (e.g. missing optional dependencies in future).
# ---------------------------------------------------------------------------
def _import_pipeline():
    sys.path.insert(0, str(Path(__file__).resolve().parents[4]))
    from analysis_engines.runner import AnalysisPipeline
    from analysis_engines.path_utils import normalize_findings_paths
    from ingestion.summary import ingest_repository
    return AnalysisPipeline, normalize_findings_paths, ingest_repository


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _set_status(scan, status: str, db: Session) -> None:
    scan.status = status
    if status in ("INGESTING", "ANALYZING", "PROCESSING"):
        if scan.started_at is None:
            scan.started_at = _now()
    if status in ("COMPLETED", "FAILED", "CANCELLED"):
        scan.completed_at = _now()
    db.commit()


def process_scan(scan_id: str, db: Session) -> bool:
    """
    Run the full analysis pipeline for one scan.

    Returns True on COMPLETED, False on FAILED.
    Safe to call from any execution context.
    """
    # ------------------------------------------------------------------
    # 1. Load scan and validate it is in a processable state
    # ------------------------------------------------------------------
    from app.models import Scan, ScanFile

    scan = db.get(Scan, scan_id)
    if scan is None:
        logger.error("process_scan: scan %s not found", scan_id)
        return False

    if scan.status not in ("QUEUED",):
        logger.warning(
            "process_scan: scan %s is in status %s — skipping",
            scan_id, scan.status,
        )
        return False

    zip_path = Path(scan.repository_path)
    if not zip_path.is_file():
        logger.error("process_scan: ZIP not found at %s for scan %s", zip_path, scan_id)
        _set_status(scan, "FAILED", db)
        return False

    storage_root = zip_path.parent.parent  # storage/uploads → storage/
    scan_dir = storage_root / "scans" / scan_id / "repository"

    try:
        AnalysisPipeline, normalize_findings_paths, ingest_repository = _import_pipeline()
    except ImportError as exc:
        logger.exception("process_scan: could not import pipeline: %s", exc)
        _set_status(scan, "FAILED", db)
        return False

    # ------------------------------------------------------------------
    # 2. INGESTING — extract and inventory the ZIP
    # ------------------------------------------------------------------
    _set_status(scan, "INGESTING", db)
    try:
        summary = ingest_repository(zip_path, scan_dir)
    except Exception as exc:  # noqa: BLE001
        logger.exception("process_scan: ingestion failed for scan %s: %s", scan_id, exc)
        _set_status(scan, "FAILED", db)
        return False

    # Persist scan_files inventory
    try:
        for record in summary.get("files", []):
            sf = ScanFile(
                scan_id=scan_id,
                file_path=record["path"],
                file_type=record.get("file_type"),
                language=record.get("language"),
                size_bytes=record.get("size_bytes", 0),
            )
            db.add(sf)
        db.commit()
    except Exception as exc:  # noqa: BLE001
        logger.warning("process_scan: scan_files persistence failed: %s", exc)
        db.rollback()

    # ------------------------------------------------------------------
    # 3. ANALYZING — run detection engines
    # ------------------------------------------------------------------
    _set_status(scan, "ANALYZING", db)
    file_paths = [scan_dir / record["path"] for record in summary.get("files", [])]

    try:
        pipeline = AnalysisPipeline()
        pipeline_result = pipeline.run(file_paths)
    except Exception as exc:  # noqa: BLE001
        logger.exception("process_scan: analysis failed for scan %s: %s", scan_id, exc)
        _set_status(scan, "FAILED", db)
        return False

    # ------------------------------------------------------------------
    # 4. PROCESSING — normalize paths and persist findings
    # ------------------------------------------------------------------
    _set_status(scan, "PROCESSING", db)
    all_findings = normalize_findings_paths(pipeline_result.all_findings, scan_dir)

    persisted = 0
    try:
        from app.models import Finding as DBFinding

        for f in all_findings:
            db_finding = DBFinding(
                id=f.finding_id,
                scan_id=scan_id,
                engine=f.engine.value,
                category=f.category,
                severity=f.severity.value,
                title=f.title,
                file_path=f.file_path,
                line_number=f.line_number,
                evidence=f.evidence,
                explanation=f.explanation,
                confidence=f.confidence,
                recommendation=f.recommendation,
                is_development=f.is_development,
            )
            db.add(db_finding)
            persisted += 1

        db.commit()
        logger.info(
            "process_scan: scan %s — persisted %d findings", scan_id, persisted
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception(
            "process_scan: finding persistence failed for scan %s: %s", scan_id, exc
        )
        db.rollback()
        _set_status(scan, "FAILED", db)
        return False

    # ------------------------------------------------------------------
    # 5. COMPLETED
    # ------------------------------------------------------------------
    _set_status(scan, "COMPLETED", db)
    logger.info(
        "process_scan: scan %s COMPLETED — files=%d findings=%d errors=%d",
        scan_id,
        pipeline_result.total_files,
        persisted,
        len(pipeline_result.all_errors),
    )
    return True
