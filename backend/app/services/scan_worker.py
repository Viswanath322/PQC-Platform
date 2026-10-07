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

from sqlalchemy import update
from sqlalchemy.orm import Session

from app.services.redis_service import ScanJob

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Lazy imports so the backend can start even if the analysis-engines package
# has not been fully set up (e.g. missing optional dependencies in future).
# ---------------------------------------------------------------------------
def _import_pipeline():
    sys.path.insert(0, str(Path(__file__).resolve().parents[3]))
    from analysis_engines.runner import AnalysisPipeline, ScanCancelledError
    from analysis_engines.path_utils import normalize_findings_paths
    from ingestion.summary import ingest_repository
    return AnalysisPipeline, ScanCancelledError, normalize_findings_paths, ingest_repository


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _set_status(
    scan,
    status: str,
    db: Session,
    error_message: str | None = None,
    engine_statuses: dict[str, str] | None = None,
) -> bool:
    previous_statuses = {
        "INGESTING": ("QUEUED",),
        "ANALYZING": ("INGESTING",),
        "PROCESSING": ("ANALYZING",),
        "COMPLETED": ("PROCESSING",),
        "FAILED": ("QUEUED", "INGESTING", "ANALYZING", "PROCESSING"),
    }.get(status, ())
    if not previous_statuses:
        raise ValueError(f"Unsupported worker status transition to {status}")

    values = {"status": status}
    if error_message is not None:
        values["error_message"] = error_message
    if engine_statuses is not None:
        values["engine_statuses"] = engine_statuses
    if status == "INGESTING":
        values["started_at"] = _now()
    if status in ("COMPLETED", "FAILED"):
        values["completed_at"] = _now()

    result = db.execute(
        update(type(scan))
        .where(type(scan).id == scan.id, type(scan).status.in_(previous_statuses))
        .values(**values)
    )
    db.commit()
    if result.rowcount != 1:
        logger.info("Scan %s status changed concurrently; stopping worker", scan.id)
        return False
    db.refresh(scan)
    return True


def _record_engine_status(scan, engine_name: str, engine_status: str, db: Session) -> None:
    db.refresh(scan)
    if scan.status != "ANALYZING":
        from analysis_engines.runner import ScanCancelledError
        raise ScanCancelledError()

    engine_statuses = dict(scan.engine_statuses or {})
    engine_statuses[engine_name] = engine_status
    result = db.execute(
        update(type(scan))
        .where(type(scan).id == scan.id, type(scan).status == "ANALYZING")
        .values(engine_statuses=engine_statuses)
    )
    db.commit()
    if result.rowcount != 1:
        from analysis_engines.runner import ScanCancelledError
        raise ScanCancelledError()
    db.refresh(scan)


def mark_unexpected_failure(scan_id: str, db: Session) -> None:
    """Move an unexpectedly interrupted active scan to a safe terminal state."""
    from app.models import Scan

    scan = db.get(Scan, scan_id)
    if scan is not None:
        engine_statuses = dict(scan.engine_statuses or {})
        for engine_name, status in engine_statuses.items():
            if status == "RUNNING":
                engine_statuses[engine_name] = "FAILED"
        _set_status(
            scan,
            "FAILED",
            db,
            error_message="Unexpected scan worker failure",
            engine_statuses=engine_statuses,
        )


def process_scan(job_or_scan_id: ScanJob | str, db: Session) -> bool:
    """
    Run the full analysis pipeline for one scan.

    Returns True on COMPLETED, False on FAILED.
    Safe to call from any execution context.
    """
    # ------------------------------------------------------------------
    # 1. Load scan and validate it is in a processable state
    # ------------------------------------------------------------------
    from app.models import Scan, ScanFile

    scan_id = job_or_scan_id.scan_id if isinstance(job_or_scan_id, ScanJob) else job_or_scan_id
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

    # Claim the QUEUED row atomically before doing any work. This prevents two
    # workers from processing the same scan after a duplicate queue delivery.
    if not _set_status(scan, "INGESTING", db):
        return False

    zip_path = Path(scan.repository_path)
    if not zip_path.is_file():
        err = "Uploaded repository is unavailable for processing."
        logger.error("process_scan: repository unavailable for scan %s", scan_id)
        _set_status(scan, "FAILED", db, error_message=err)
        return False

    storage_root = zip_path.parent.parent  # storage/uploads → storage/
    expected_scan_dir = storage_root / "scans" / scan_id / "repository"
    if isinstance(job_or_scan_id, ScanJob):
        scan_dir = Path(job_or_scan_id.repository_workspace)
        if scan_dir.resolve() != expected_scan_dir.resolve():
            logger.error("process_scan: invalid workspace in job payload for scan %s", scan_id)
            _set_status(scan, "FAILED", db, error_message="Invalid scan job workspace")
            return False
        selected_engine_names = job_or_scan_id.selected_engines
    else:
        scan_dir = expected_scan_dir
        selected_engine_names = ()

    try:
        AnalysisPipeline, ScanCancelledError, normalize_findings_paths, ingest_repository = _import_pipeline()
    except ImportError as exc:
        err = "Analysis pipeline is unavailable."
        logger.exception("process_scan: analysis pipeline import failed for scan %s: %s", scan_id, exc)
        _set_status(scan, "FAILED", db, error_message=err)
        return False

    # ------------------------------------------------------------------
    # 2. INGESTING — extract and inventory the ZIP
    # ------------------------------------------------------------------
    try:
        summary = ingest_repository(zip_path, scan_dir)
    except Exception as exc:  # noqa: BLE001
        err = "Repository validation or ingestion failed."
        logger.exception("process_scan: ingestion failed for scan %s: %s", scan_id, exc)
        _set_status(scan, "FAILED", db, error_message=err)
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
    if not _set_status(scan, "ANALYZING", db):
        return False
    file_paths = [scan_dir / record["path"] for record in summary.get("files", [])]

    try:
        if selected_engine_names:
            available = {engine.name.value: engine for engine in AnalysisPipeline.DEFAULT_ENGINES}
            unknown = set(selected_engine_names) - set(available)
            if unknown or len(set(selected_engine_names)) != len(selected_engine_names):
                raise ValueError("Scan job contains unsupported or duplicate engines")
            pipeline = AnalysisPipeline(
                engines=tuple(available[name] for name in selected_engine_names),
                scan_id=scan_id,
            )
        else:
            pipeline = AnalysisPipeline(scan_id=scan_id)
        pipeline_result = pipeline.run(
            file_paths,
            on_engine_status=lambda name, status: _record_engine_status(scan, name, status, db),
            root_dir=scan_dir,
        )
    except ScanCancelledError:
        logger.info("process_scan: scan %s cancelled during engine execution", scan_id)
        return False
    except Exception as exc:  # noqa: BLE001
        err = "Analysis processing failed."
        logger.exception("process_scan: analysis failed for scan %s: %s", scan_id, exc)
        _set_status(scan, "FAILED", db, error_message=err)
        return False

    # ------------------------------------------------------------------
    # 4. PROCESSING — normalize paths and persist findings & components
    # ------------------------------------------------------------------
    if not _set_status(scan, "PROCESSING", db):
        return False
    all_findings = normalize_findings_paths(pipeline_result.all_findings, scan_dir)

    persisted = 0
    try:
        from app.models import Finding as DBFinding, ScanComponent
        from app.services.finding_service import persist_cbom_components, persist_sbom_components

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
                rule_id=f.rule_id,
                rule_version=f.rule_version,
                source_engine=f.source_engine or f.engine.value,
                correlation_group_id=f.correlation_group_id,
            )
            db.add(db_finding)
            persisted += 1

        # Persist CBOM components from CryptoEngine
        if pipeline_result.components:
            persist_cbom_components(db, scan_id, pipeline_result.components)
            for comp in pipeline_result.components:
                db.add(
                    ScanComponent(
                        id=comp.component_id,
                        scan_id=scan_id,
                        component_kind="crypto",
                        component_type="algorithm",
                        name=comp.algorithm,
                        source_file=comp.file_path,
                        line_number=comp.line_number,
                        detection_method=comp.detection_method,
                        confidence=comp.confidence,
                        metadata_json={
                            "quantum_risk": comp.quantum_risk,
                            "nist_migration_target": comp.nist_migration_target,
                            "category": comp.category,
                        },
                    )
                )

        # Inventory SBOM components from dependency manifests
        sbom_list = []
        for file_p in file_paths:
            if file_p.name.lower() == "requirements.txt" and file_p.is_file():
                try:
                    rel_src = str(file_p.relative_to(scan_dir)).replace("\\", "/")
                    for lnum, raw_line in enumerate(file_p.read_text(encoding="utf-8", errors="replace").splitlines(), 1):
                        stripped = raw_line.strip()
                        if stripped and not stripped.startswith("#") and "==" in stripped:
                            pname, pver = stripped.split("==", 1)
                            pname, pver = pname.strip(), pver.strip()
                            comp_dict = {
                                "name": pname,
                                "version": pver,
                                "package_type": "pypi",
                                "source_file": rel_src,
                                "line_number": lnum,
                            }
                            sbom_list.append(comp_dict)
                            db.add(
                                ScanComponent(
                                    scan_id=scan_id,
                                    component_kind="dependency",
                                    component_type="library",
                                    name=pname,
                                    version=pver,
                                    purl=f"pkg:pypi/{pname}@{pver}",
                                    source_file=rel_src,
                                    line_number=lnum,
                                    detection_method="manifest",
                                    confidence=1.0,
                                )
                            )
                except Exception as sbom_err:
                    logger.warning("SBOM parsing error on %s: %s", file_p, sbom_err)
        if sbom_list:
            persist_sbom_components(db, scan_id, sbom_list)

        db.commit()
        logger.info(
            "process_scan: scan %s — persisted %d findings, %d cbom, %d sbom",
            scan_id, persisted, len(pipeline_result.components), len(sbom_list),
        )
    except Exception as exc:  # noqa: BLE001
        err = "Analysis results could not be saved."
        logger.exception(
            "process_scan: finding persistence failed for scan %s: %s", scan_id, exc
        )
        db.rollback()
        _set_status(scan, "FAILED", db, error_message=err)
        return False

    # ------------------------------------------------------------------
    # 5. COMPLETED
    # ------------------------------------------------------------------
    failed_engines = tuple(
        engine_name for engine_name, errors in pipeline_result.errors_by_engine.items() if errors
    )
    for engine_name in pipeline_result.findings_by_engine:
        outcome = "FAILED" if engine_name in failed_engines else "COMPLETED"
        logger.info("Scan %s engine %s: %s", scan_id, engine_name, outcome)

    if failed_engines:
        if not _set_status(
            scan,
            "FAILED",
            db,
            error_message="Analysis engine failure: " + ", ".join(failed_engines),
        ):
            return False
        logger.warning("process_scan: scan %s finished with failed engines: %s", scan_id, failed_engines)
        return False

    if not _set_status(scan, "COMPLETED", db):
        return False
    logger.info(
        "process_scan: scan %s COMPLETED — files=%d findings=%d errors=%d",
        scan_id,
        pipeline_result.total_files,
        persisted,
        len(pipeline_result.all_errors),
    )
    return True
