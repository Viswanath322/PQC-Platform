"""
Scan processing worker for the PQC platform (Day 3).

Processes one scan end-to-end:
  QUEUED → INGESTING → ANALYZING → PROCESSING → COMPLETED (or FAILED / CANCELLED)

Day 3 Capabilities:
  - Task 27: Stable AnalysisJobPayload validation & consumption.
  - Task 28: Full local pipeline lifecycle with Redis queue coordination.
  - Task 29: Independent engine success/failure; no false COMPLETED if required engine fails.
  - Task 30: Persistent/atomic duplicate execution prevention (DB transition + Redis lock).
  - Task 31: Bounded retry for transient/retryable failures; non-retryables fail immediately.
  - Task 32: Safe idempotent cancellation; CANCELLED is never overwritten by COMPLETED.
  - Task 33: Engine-level statuses persisted and exposed to the UI/API.
"""

from __future__ import annotations

import json
import logging
import os
import re
import sys
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from sqlalchemy import update
from sqlalchemy.orm import Session

from app.schemas.scan import (
    SUPPORTED_ENGINES,
    AnalysisJobPayload,
    EngineStatusEnum,
)
from app.services.redis_service import (
    acquire_scan_lock,
    enqueue_scan,
    is_scan_cancelled_in_redis,
    release_scan_lock,
)

logger = logging.getLogger(__name__)


def _import_pipeline():
    sys.path.insert(0, str(Path(__file__).resolve().parents[3]))
    from analysis_engines.runner import AnalysisPipeline
    from analysis_engines.path_utils import normalize_findings_paths
    from ingestion.summary import ingest_repository
    return AnalysisPipeline, normalize_findings_paths, ingest_repository


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _sanitize_error(error: str) -> str:
    """Redact absolute machine paths, tokens, and secrets from error messages."""
    sanitized = re.sub(r"[A-Za-z]:\\[\w\\\.-]+", "<local-path>", error)
    sanitized = re.sub(r"/(?:Users|home|root|var|tmp)/[\w/\.-]+", "<local-path>", sanitized)
    sanitized = re.sub(r"(token|secret|password|key)=\S+", r"\1=<redacted>", sanitized, flags=re.I)
    return sanitized.strip()[:500]


def is_retryable_error(exc: Exception) -> bool:
    """Determine if a worker failure is transient and eligible for bounded retry."""
    non_retryable_types = (
        FileNotFoundError,
        zipfile.BadZipFile,
        ValueError,
        KeyError,
        TypeError,
    )
    if isinstance(exc, non_retryable_types):
        return False

    msg = str(exc).lower()
    non_retryable_keywords = [
        "cancelled", "zip", "traversal", "symlink", "bomb", "not found",
        "invalid", "malicious", "unauthorized", "syntaxerror",
    ]
    if any(k in msg for k in non_retryable_keywords):
        return False

    # Transient failures (e.g. database disconnects, redis connection drop, temporary resource lock)
    return True


def is_scan_cancelled(scan_id: str, db: Session) -> bool:
    """Check if scan cancellation was requested via Redis flag or DB status."""
    if is_scan_cancelled_in_redis(scan_id):
        return True
    try:
        from app.models import Scan
        status = db.query(Scan.status).filter(Scan.id == scan_id).scalar()
        return status == "CANCELLED"
    except Exception:
        return False


def _set_status(
    scan,
    status: str,
    db: Session,
    error_message: str | None = None,
    engine_statuses: dict[str, str] | None = None,
) -> bool:
    """
    Update scan status safely.
    Guarantees that a CANCELLED scan can NEVER transition to COMPLETED, ANALYZING, or PROCESSING.
    """
    from app.models import Scan

    try:
        # Fresh atomic check of current status from database
        current_status = db.query(Scan.status).filter(Scan.id == scan.id).scalar()
        if current_status == "CANCELLED":
            logger.info("Scan %s is CANCELLED; refusing transition to %s", scan.id, status)
            return False
    except Exception as exc:  # noqa: BLE001
        logger.warning("Could not verify status for scan %s: %s", scan.id, exc)

    now = _now()
    if status == "COMPLETED":
        # Atomic update with WHERE status != 'CANCELLED' to eliminate any race condition
        stmt = (
            update(Scan)
            .where(Scan.id == scan.id, Scan.status != "CANCELLED")
            .values(
                status="COMPLETED",
                completed_at=now,
                error_message=None,
                engine_statuses=json.dumps(engine_statuses) if engine_statuses else scan.engine_statuses,
            )
        )
        res = db.execute(stmt)
        db.commit()
        if res.rowcount == 0:
            logger.warning("Atomic completion refused: scan %s was already CANCELLED", scan.id)
            return False
        return True

    # Standard intermediate status updates
    scan.status = status
    if error_message is not None:
        scan.error_message = _sanitize_error(error_message)
    if engine_statuses is not None:
        scan.engine_statuses = json.dumps(engine_statuses)

    if status in ("INGESTING", "ANALYZING", "PROCESSING") and scan.started_at is None:
        scan.started_at = now
    if status in ("FAILED", "CANCELLED"):
        scan.completed_at = now

    db.commit()
    return True


def process_scan(job: Any, db: Session) -> bool:
    """
    Run the full analysis pipeline for one scan with Day 3 lifecycle guarantees.

    Supports:
      - AnalysisJobPayload instance, JSON string, dictionary, or raw scan_id string.
      - Atomic duplicate execution prevention.
      - Independent engine status tracking.
      - Bounded retry for retryable transient errors.
      - Cancellation protection where CANCELLED is terminal.

    Returns True on COMPLETED, False on FAILED or CANCELLED.
    """
    from app.models import Finding as DBFinding, Scan, ScanFile

    # ------------------------------------------------------------------
    # 1. Parse and validate job payload (Task 27)
    # ------------------------------------------------------------------
    scan_id: str
    selected_engines: list[str] = list(SUPPORTED_ENGINES)
    attempt: int = 1
    max_retries: int = 3

    if isinstance(job, AnalysisJobPayload):
        scan_id = str(job.scan_id)
        selected_engines = job.selected_engines
        attempt = job.attempt
        max_retries = job.max_retries
    elif isinstance(job, dict):
        scan_id = str(job.get("scan_id", ""))
        selected_engines = job.get("selected_engines", list(SUPPORTED_ENGINES))
        attempt = job.get("attempt", 1)
        max_retries = job.get("max_retries", 3)
    elif isinstance(job, str):
        job_str = job.strip()
        if job_str.startswith("{"):
            try:
                parsed = AnalysisJobPayload.model_validate_json(job_str)
                scan_id = str(parsed.scan_id)
                selected_engines = parsed.selected_engines
                attempt = parsed.attempt
                max_retries = parsed.max_retries
            except Exception:
                data = json.loads(job_str)
                scan_id = str(data.get("scan_id", ""))
                selected_engines = data.get("selected_engines", list(SUPPORTED_ENGINES))
                attempt = data.get("attempt", 1)
                max_retries = data.get("max_retries", 3)
        else:
            scan_id = job_str
    else:
        logger.error("process_scan: invalid job payload type: %s", type(job))
        return False

    if not scan_id:
        logger.error("process_scan: missing scan_id in job payload")
        return False

    # ------------------------------------------------------------------
    # 2. Prevent duplicate execution (Task 30)
    # ------------------------------------------------------------------
    # Step A: Distributed lock
    if not acquire_scan_lock(scan_id):
        logger.warning("process_scan: scan %s is currently locked by another worker — skipping", scan_id)
        return False

    try:
        # Step B: Atomic database transition from QUEUED to INGESTING
        # If the scan is already INGESTING, ANALYZING, PROCESSING, COMPLETED, or CANCELLED, this updates 0 rows.
        stmt = (
            update(Scan)
            .where(Scan.id == scan_id, Scan.status == "QUEUED")
            .values(status="INGESTING", started_at=_now(), attempt_count=attempt)
        )
        res = db.execute(stmt)
        db.commit()

        if res.rowcount == 0:
            scan = db.get(Scan, scan_id)
            status_desc = scan.status if scan else "NOT_FOUND"
            logger.warning(
                "process_scan: scan %s is in status %s (not QUEUED) — skipping duplicate execution",
                scan_id, status_desc,
            )
            return False

        scan = db.get(Scan, scan_id)
        if scan is None:
            logger.error("process_scan: scan %s not found in DB", scan_id)
            return False

        if scan.max_retries:
            max_retries = scan.max_retries

        # Initialize engine statuses
        engine_statuses: dict[str, str] = {eng: "QUEUED" for eng in selected_engines}
        scan.engine_statuses = json.dumps(engine_statuses)
        db.commit()

        zip_path = Path(scan.repository_path)
        if not zip_path.is_file():
            err = f"ZIP archive not found at {zip_path}"
            logger.error("process_scan: %s for scan %s", err, scan_id)
            _set_status(scan, "FAILED", db, error_message=err, engine_statuses=engine_statuses)
            return False

        storage_root = zip_path.parent.parent
        scan_dir = storage_root / "scans" / scan_id / "repository"

        try:
            AnalysisPipeline, normalize_findings_paths, ingest_repository = _import_pipeline()
        except ImportError as exc:
            err = f"Could not import analysis pipeline: {exc}"
            logger.exception("process_scan: %s", err)
            _set_status(scan, "FAILED", db, error_message=err, engine_statuses=engine_statuses)
            return False

        # ------------------------------------------------------------------
        # 3. Ingestion Phase (INGESTING)
        # ------------------------------------------------------------------
        if is_scan_cancelled(scan_id, db):
            logger.info("Scan %s cancelled before ingestion; aborting", scan_id)
            _set_status(scan, "CANCELLED", db, engine_statuses=engine_statuses)
            return False

        try:
            summary = ingest_repository(zip_path, scan_dir)
        except Exception as exc:  # noqa: BLE001
            if is_retryable_error(exc):
                raise
            err = f"Ingestion failed: {exc}"
            logger.exception("process_scan: ingestion failed for scan %s: %s", scan_id, exc)
            _set_status(scan, "FAILED", db, error_message=err, engine_statuses=engine_statuses)
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
        # 4. Analysis Phase (ANALYZING) — Independent Engines (Task 29)
        # ------------------------------------------------------------------
        if is_scan_cancelled(scan_id, db):
            logger.info("Scan %s cancelled before analysis; aborting", scan_id)
            _set_status(scan, "CANCELLED", db, engine_statuses=engine_statuses)
            return False

        if not _set_status(scan, "ANALYZING", db, engine_statuses=engine_statuses):
            return False

        file_paths = [scan_dir / record["path"] for record in summary.get("files", [])]

        def on_engine_start(engine_name: str) -> None:
            engine_statuses[engine_name] = EngineStatusEnum.RUNNING.value
            try:
                scan.engine_statuses = json.dumps(engine_statuses)
                db.commit()
            except Exception:
                pass

        def on_engine_complete(engine_name: str, success: bool, error_msg: str | None) -> None:
            engine_statuses[engine_name] = EngineStatusEnum.COMPLETED.value if success else EngineStatusEnum.FAILED.value
            try:
                scan.engine_statuses = json.dumps(engine_statuses)
                db.commit()
            except Exception:
                pass

        try:
            pipeline = AnalysisPipeline(selected_engines=selected_engines)
            pipeline_result = pipeline.run(
                file_paths,
                on_engine_start=on_engine_start,
                on_engine_complete=on_engine_complete,
                is_cancelled=lambda: is_scan_cancelled(scan_id, db),
            )
        except Exception as exc:  # noqa: BLE001
            if is_retryable_error(exc):
                raise
            err = f"Analysis pipeline error: {exc}"
            logger.exception("process_scan: analysis failed for scan %s: %s", scan_id, exc)
            for eng in selected_engines:
                if engine_statuses[eng] in ("QUEUED", "RUNNING"):
                    engine_statuses[eng] = EngineStatusEnum.FAILED.value
            _set_status(scan, "FAILED", db, error_message=err, engine_statuses=engine_statuses)
            return False

        # Sync result engine statuses
        for eng, st in pipeline_result.engine_statuses.items():
            engine_statuses[eng] = st

        # Check for cancellation during analysis
        if is_scan_cancelled(scan_id, db):
            logger.info("Scan %s cancelled during analysis; aborting", scan_id)
            for eng in selected_engines:
                if engine_statuses[eng] in ("QUEUED", "RUNNING"):
                    engine_statuses[eng] = EngineStatusEnum.CANCELLED.value
            _set_status(scan, "CANCELLED", db, engine_statuses=engine_statuses)
            return False

        # ------------------------------------------------------------------
        # 5. Processing Phase (PROCESSING) — Findings Persistence
        # ------------------------------------------------------------------
        if not _set_status(scan, "PROCESSING", db, engine_statuses=engine_statuses):
            return False

        all_findings = normalize_findings_paths(pipeline_result.all_findings, scan_dir)
        persisted = 0
        try:
            for f in all_findings:
                # Deduplicate by finding_id on persistence
                existing = db.get(DBFinding, f.finding_id)
                if existing is not None:
                    continue
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
            logger.info("process_scan: scan %s — persisted %d findings", scan_id, persisted)
        except Exception as exc:  # noqa: BLE001
            err = f"Finding persistence failed: {exc}"
            logger.exception("process_scan: finding persistence failed for scan %s: %s", scan_id, exc)
            db.rollback()
            _set_status(scan, "FAILED", db, error_message=err, engine_statuses=engine_statuses)
            return False

        # ------------------------------------------------------------------
        # 6. Aggregation Rule & Terminal State (Task 29 & Task 32)
        # ------------------------------------------------------------------
        # Check if cancellation was requested at the last moment
        if is_scan_cancelled(scan_id, db):
            logger.info("Scan %s cancelled before completion; maintaining CANCELLED state", scan_id)
            _set_status(scan, "CANCELLED", db, engine_statuses=engine_statuses)
            return False

        # Aggregation Rule:
        # If any selected engine failed, the scan MUST NOT falsely report success.
        failed_engines = [eng for eng, st in engine_statuses.items() if st == EngineStatusEnum.FAILED.value]
        if failed_engines or pipeline_result.all_errors:
            err_summary = f"Analysis completed with engine failures: {', '.join(failed_engines)}" if failed_engines else "; ".join(pipeline_result.all_errors)
            logger.warning("process_scan: scan %s marking FAILED due to engine errors: %s", scan_id, err_summary)
            _set_status(scan, "FAILED", db, error_message=err_summary, engine_statuses=engine_statuses)
            return False

        # All selected engines completed successfully → mark COMPLETED
        if not _set_status(scan, "COMPLETED", db, engine_statuses=engine_statuses):
            logger.warning("process_scan: scan %s could not transition to COMPLETED (terminal state was CANCELLED)", scan_id)
            return False

        logger.info(
            "process_scan: scan %s COMPLETED successfully — files=%d findings=%d engines=%s",
            scan_id, pipeline_result.total_files, persisted, list(engine_statuses.keys()),
        )
        return True

    except Exception as exc:  # noqa: BLE001
        logger.exception("process_scan: unhandled error processing scan %s: %s", scan_id, exc)

        # ------------------------------------------------------------------
        # 7. Safe Bounded Retry (Task 31)
        # ------------------------------------------------------------------
        if is_retryable_error(exc) and attempt < max_retries:
            logger.warning(
                "process_scan: retryable error on scan %s (attempt %d/%d). Scheduling retry...",
                scan_id, attempt, max_retries,
            )
            try:
                # Clean up any partial findings and scan files to prevent duplicate findings
                db.rollback()
                db.query(DBFinding).filter(DBFinding.scan_id == scan_id).delete()
                db.query(ScanFile).filter(ScanFile.scan_id == scan_id).delete()

                scan = db.get(Scan, scan_id)
                if scan:
                    scan.status = "QUEUED"
                    scan.attempt_count = attempt + 1
                    scan.error_message = _sanitize_error(f"Transient error: {exc}. Retrying attempt {attempt + 1}/{max_retries}")
                    db.commit()

                # Re-enqueue with incremented attempt
                retry_job = AnalysisJobPayload(
                    scan_id=scan_id,
                    repository_workspace=str(scan.repository_path) if scan else "",
                    selected_engines=selected_engines,
                    attempt=attempt + 1,
                    max_retries=max_retries,
                )
                enqueue_scan(retry_job)
            except Exception as retry_exc:  # noqa: BLE001
                logger.error("process_scan: failed to schedule retry for scan %s: %s", scan_id, retry_exc)
            return False

        # Non-retryable error OR reached max_retries limit
        try:
            db.rollback()
            scan = db.get(Scan, scan_id)
            if scan and scan.status != "CANCELLED":
                err_text = f"Exceeded max retries ({max_retries}): {exc}" if attempt >= max_retries else str(exc)
                _set_status(scan, "FAILED", db, error_message=err_text)
        except Exception as final_exc:  # noqa: BLE001
            logger.error("process_scan: failed to update FAILED status for scan %s: %s", scan_id, final_exc)
        return False

    finally:
        # Always release the distributed execution lock
        release_scan_lock(scan_id)

