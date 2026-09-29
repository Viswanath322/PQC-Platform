from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.scan import Project, Scan
from app.schemas.scan import ScanCreate, ScanOut
from app.services.storage_service import get_upload_path
from app.services.redis_service import enqueue_scan

router = APIRouter(prefix="/scans", tags=["scans"])
FINAL_STATES = {"COMPLETED", "FAILED", "CANCELLED"}


@router.post("", response_model=ScanOut, status_code=201)
def create_scan(body: ScanCreate, db: Session = Depends(get_db)):
    if not db.get(Project, body.project_id):
        raise HTTPException(404, "Project not found")
    zip_path = get_upload_path(body.upload_id)

    scan = Scan(project_id=body.project_id, status="QUEUED", repository_path=str(zip_path))
    db.add(scan)
    db.commit()
    db.refresh(scan)
    enqueue_scan(scan.id)
    return scan


@router.get("", response_model=list[ScanOut])
def list_scans(project_id: int | None = None, db: Session = Depends(get_db)):
    q = db.query(Scan)
    if project_id is not None:
        q = q.filter(Scan.project_id == project_id)
    return q.order_by(Scan.created_at.desc()).all()


@router.get("/{scan_id}", response_model=ScanOut)
def get_scan(scan_id: str, db: Session = Depends(get_db)):
    scan = db.get(Scan, scan_id)
    if not scan:
        raise HTTPException(404, "Scan not found")
    return scan


@router.post("/{scan_id}/cancel", response_model=ScanOut)
def cancel_scan(scan_id: str, db: Session = Depends(get_db)):
    scan = db.get(Scan, scan_id)
    if not scan:
        raise HTTPException(404, "Scan not found")
    if scan.status in FINAL_STATES:
        raise HTTPException(409, f"Scan already {scan.status}")
    scan.status = "CANCELLED"
    scan.completed_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()
    db.refresh(scan)
    return scan
