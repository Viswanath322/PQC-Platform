from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.v1.routes.auth import get_current_user, get_user_organization_id
from app.models import Project, Scan, User
from app.schemas.common import UUID_PATTERN
from app.schemas.scan import ScanCreate, ScanOut
from app.services.redis_service import dequeue_scan, enqueue_scan
from app.services.storage_service import get_upload_path

router = APIRouter(prefix="/scans", tags=["scans"])
FINAL_STATES = {"COMPLETED", "FAILED", "CANCELLED"}


@router.post("", response_model=ScanOut, status_code=201)
def create_scan(
    body: ScanCreate,
    response: Response,
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
    scan = Scan(project_id=body.project_id, status="QUEUED", repository_path=str(zip_path))
    db.add(scan)
    db.commit()
    db.refresh(scan)
    response.headers["X-Queue-Status"] = "enqueued" if enqueue_scan(scan.id) else "deferred"
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
    return query.order_by(Scan.created_at.desc()).all()


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


@router.post("/{scan_id}/cancel", response_model=ScanOut)
def cancel_scan(scan_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    scan = (
        db.query(Scan)
        .join(Project)
        .filter(Scan.id == scan_id, Project.organization_id == get_user_organization_id(user))
        .first()
    )
    if scan is None:
        raise HTTPException(404, "Scan not found")
    if scan.status in FINAL_STATES:
        raise HTTPException(409, f"Scan already {scan.status}")
    scan.status = "CANCELLED"
    scan.completed_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()
    db.refresh(scan)
    dequeue_scan(scan.id)
    return scan
