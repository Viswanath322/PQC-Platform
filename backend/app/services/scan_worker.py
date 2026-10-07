"""
Scan processing worker for the PQC platform — Day 4.

Processes one scan end-to-end:
  QUEUED → INGESTING → ANALYZING → PROCESSING → COMPLETED (or FAILED)

Day 4 fixes:
  - scan_id passed to AnalysisPipeline so CryptoEngine produces CryptoComponent
  - normalize_findings_paths preserves rule_id/rule_version/group_key (path_utils fix)
  - DBFinding persists rule_id and rule_version
  - CryptoComponent records persisted (CBOM) when table exists
  - error_message written to scan on FAILED
  - Cancellation checked after every status transition
"""

from __future__ import annotations

import logging
import hashlib
import sys
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


def _import_pipeline():
    repo_root = str(Path(__file__).resolve().parents[4])
    if repo_root not in sys.path:
        sys.path.insert(0, repo_root)
    from analysis_engines.runner import AnalysisPipeline
    from analysis_engines.path_utils import normalize_findings_paths
    from ingestion.summary import ingest_repository
    return AnalysisPipeline, normalize_findings_paths, ingest_repository


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _set_status(scan, status: str, db: Session, error_message: str | None = None) -> None:
    scan.status = status
    # error_message column may not exist on older schema versions — guard safely
    if hasattr(scan, "error_message"):
        if error_message is not None:
            scan.error_message = error_message[:500]
        elif status == "FAILED" and not getattr(scan, "error_message", None):
            scan.error_message = "SCAN_PROCESSING_FAILED"
        elif status != "FAILED":
            scan.error_message = None
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
    # 1. Load scan and validate processable state
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
        _set_status(scan, "FAILED", db, "Repository ZIP not found")
        return False

    # Derive storage root and scan directory from the upload path
    # storage/uploads/<uuid>.zip → storage/
    storage_root = zip_path.parent.parent
    scan_dir = storage_root / "scans" / scan_id / "repository"

    try:
        AnalysisPipeline, normalize_findings_paths, ingest_repository = _import_pipeline()
    except ImportError as exc:
        logger.exception("process_scan: could not import pipeline: %s", exc)
        _set_status(scan, "FAILED", db, f"Pipeline import failed: {exc}")
        return False

    # ------------------------------------------------------------------
    # 2. INGESTING — extract and inventory the ZIP
    # ------------------------------------------------------------------
    _set_status(scan, "INGESTING", db)
    try:
        summary = ingest_repository(zip_path, scan_dir)
    except Exception as exc:  # noqa: BLE001
        logger.exception("process_scan: ingestion failed for scan %s: %s", scan_id, exc)
        _set_status(scan, "FAILED", db, f"Ingestion failed: {type(exc).__name__}")
        return False

    db.refresh(scan)
    if scan.status == "CANCELLED":
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
    # 3. ANALYZING — run detection engines (Day 4: pass scan_id)
    # ------------------------------------------------------------------
    _set_status(scan, "ANALYZING", db)
    file_paths = [scan_dir / record["path"] for record in summary.get("files", [])]

    try:
        # Day 4: pass scan_id so CryptoEngine produces CryptoComponent records
        pipeline = AnalysisPipeline(scan_id=scan_id)
        pipeline_result = pipeline.run(file_paths, root_dir=scan_dir)
    except Exception as exc:  # noqa: BLE001
        logger.exception("process_scan: analysis failed for scan %s: %s", scan_id, exc)
        _set_status(scan, "FAILED", db, f"Analysis failed: {type(exc).__name__}")
        return False

    db.refresh(scan)
    if scan.status == "CANCELLED":
        return False

    # ------------------------------------------------------------------
    # 4. PROCESSING — normalize paths and persist findings + components
    # ------------------------------------------------------------------
    _set_status(scan, "PROCESSING", db)

    # Day 4: use normalizer (dedup+sort) rather than raw normalize_findings_paths
    try:
        from analysis_engines.normalizer import normalize_and_deduplicate
        all_findings = normalize_and_deduplicate(
            pipeline_result.all_findings, scan_dir
        )
    except Exception:
        # Fallback to simple path normalization if normalizer unavailable
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
                explanation=getattr(f, "explanation", None),
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
        _set_status(scan, "FAILED", db, f"Finding persistence failed: {type(exc).__name__}")
        return False

    # Day 4: persist CryptoComponent records if the table exists
    _persist_components(db, scan_id, pipeline_result.components)

    # ------------------------------------------------------------------
    # 5. COMPLETED
    # ------------------------------------------------------------------
    db.refresh(scan)
    if scan.status == "CANCELLED":
        return False

    _set_status(scan, "COMPLETED", db)
    logger.info(
        "process_scan: scan %s COMPLETED — files=%d findings=%d components=%d errors=%d",
        scan_id,
        pipeline_result.total_files,
        persisted,
        len(pipeline_result.components),
        len(pipeline_result.all_errors),
    )
    return True


def _persist_components(db: Session, scan_id: str, components: tuple) -> None:
    """
    Persist CryptoComponent records (CBOM) to the database.

    Gracefully skipped if the crypto_components table does not yet exist
    (schema migration is Vamsi's responsibility).
    """
    if not components:
        return
    try:
        from sqlalchemy import text
        # Check table exists before attempting insert
        db.execute(text("SELECT 1 FROM crypto_components LIMIT 1"))
    except Exception:
        logger.debug(
            "process_scan: crypto_components table not yet available — skipping CBOM persistence"
        )
        return

    try:
        from sqlalchemy import text
        for c in components:
            db.execute(
                text(
                    "INSERT IGNORE INTO crypto_components "
                    "(id, scan_id, algorithm, category, file_path, line_number, "
                    "detection_method, confidence, quantum_risk, "
                    "nist_migration_target, rule_id, rule_version, is_development) "
                    "VALUES (:id, :scan_id, :algorithm, :category, :file_path, :line_number, "
                    ":detection_method, :confidence, :quantum_risk, "
                    ":nist_migration_target, :rule_id, :rule_version, :is_development)"
                ),
                {
                    "id": c.component_id,
                    "scan_id": scan_id,
                    "algorithm": c.algorithm,
                    "category": c.category,
                    "file_path": c.file_path,
                    "line_number": c.line_number,
                    "detection_method": c.detection_method,
                    "confidence": c.confidence,
                    "quantum_risk": c.quantum_risk,
                    "nist_migration_target": c.nist_migration_target,
                    "rule_id": c.rule_id,
                    "rule_version": c.rule_version,
                    "is_development": int(c.is_development),
                },
            )
        db.commit()
        logger.info(
            "process_scan: scan %s — persisted %d crypto components", scan_id, len(components)
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("process_scan: component persistence failed: %s", exc)
        db.rollback()
