import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.v1.routes.auth import get_current_user, get_user_organization_id
from app.models import Project, Scan, User
from app.schemas.common import UUID_PATTERN
from app.schemas.scan import (
    FINAL_STATUSES,
    SUPPORTED_ENGINES,
    AnalysisJobPayload,
    EngineTelemetryOut,
    ScanCreate,
    ScanOut,
    ScanStatus,
)
from app.services.redis_service import dequeue_scan, enqueue_scan, set_scan_cancelled
from app.services.storage_service import get_upload_path

router = APIRouter(prefix="/scans", tags=["scans"])


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


@router.post("", response_model=ScanOut, status_code=201)
def create_scan(
    body: ScanCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    organization_id = get_user_organization_id(user)
    project = (
        db.query(Project)
        .filter(Project.id == body.project_id, Project.organization_id == organization_id)
        .first()
    )
    if project is None:
        raise HTTPException(404, "Project not found")
    zip_path = get_upload_path(body.upload_id, organization_id=organization_id)

    selected_engines = body.selected_engines or list(SUPPORTED_ENGINES)
    initial_engine_statuses = {eng: "QUEUED" for eng in selected_engines}

    scan = Scan(
        project_id=body.project_id,
        status=ScanStatus.QUEUED.value,
        repository_path=str(zip_path),
        engine_statuses=json.dumps(initial_engine_statuses),
        attempt_count=1,
        max_retries=3,
    )
    db.add(scan)
    db.commit()
    db.refresh(scan)

    job_payload = AnalysisJobPayload(
        scan_id=scan.id,
        repository_workspace=str(zip_path),
        selected_engines=selected_engines,
        attempt=1,
        max_retries=3,
    )

    if not enqueue_scan(job_payload):
        # Never report QUEUED for a scan that is not in the queue: keep the row as FAILED and tell the caller.
        scan.status = ScanStatus.FAILED.value
        scan.completed_at = _utcnow()
        db.commit()
        raise HTTPException(503, "Scan queue is unavailable; the scan was not queued. Please retry.")
    return scan


@router.get("", response_model=list[ScanOut])
def list_scans(
    project_id: str | None = Query(default=None, pattern=UUID_PATTERN),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = db.query(Scan).join(Project).filter(Project.organization_id == get_user_organization_id(user))
    if project_id is not None:
        query = query.filter(Scan.project_id == project_id)
    return query.order_by(Scan.created_at.desc(), Scan.id.desc()).all()


@router.get("/{scan_id}", response_model=ScanOut)
def get_scan(scan_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    scan = (
        db.query(Scan)
        .join(Project)
        .filter(Scan.id == scan_id, Project.organization_id == get_user_organization_id(user))
        .first()
    )
    if scan is None:
        raise HTTPException(404, "Scan not found")
    return scan


@router.get("/{scan_id}/engines", response_model=EngineTelemetryOut)
def get_scan_engine_status(
    scan_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    scan = (
        db.query(Scan)
        .join(Project)
        .filter(Scan.id == scan_id, Project.organization_id == get_user_organization_id(user))
        .first()
    )
    if scan is None:
        raise HTTPException(404, "Scan not found")

    statuses = {}
    if scan.engine_statuses:
        try:
            statuses = json.loads(scan.engine_statuses)
        except Exception:
            statuses = {}
    if not statuses:
        fallback = "COMPLETED" if scan.status == "COMPLETED" else ("QUEUED" if scan.status in ("QUEUED", "INGESTING") else scan.status)
        statuses = {eng: fallback for eng in SUPPORTED_ENGINES}

    return EngineTelemetryOut(
        scan_id=scan.id,
        status=ScanStatus(scan.status),
        engine_statuses=statuses,
        attempt_count=scan.attempt_count or 1,
        max_retries=scan.max_retries or 3,
    )


@router.post("/{scan_id}/cancel", response_model=ScanOut)
def cancel_scan(scan_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    scan = (
        db.query(Scan)
        .join(Project)
        .filter(Scan.id == scan_id, Project.organization_id == get_user_organization_id(user))
        .with_for_update()
        .first()
    )
    if scan is None:
        raise HTTPException(404, "Scan not found")
    if ScanStatus(scan.status) in FINAL_STATUSES:
        raise HTTPException(409, f"Scan already {scan.status}")
    scan.status = ScanStatus.CANCELLED.value
    scan.completed_at = _utcnow()
    db.commit()
    set_scan_cancelled(scan.id)
    dequeue_scan(scan.id)
    return scan
