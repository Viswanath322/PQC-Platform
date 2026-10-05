from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.v1.routes.auth import get_current_user, get_user_organization_id
from app.core.database import get_db
from app.models import User
from app.schemas.finding import ReportOut
from app.services.finding_service import get_report_data

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/{scan_id}", response_model=ReportOut)
def read_report(
    scan_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ReportOut:
    """Return the Day 1 JSON report summary for a scan scoped to user organization."""
    organization_id = get_user_organization_id(user)
    result = get_report_data(db, scan_id, organization_id=organization_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Scan not found")
    status, total, counts = result
    return ReportOut(
        scan_id=scan_id,
        status=status,
        generated_at=datetime.now(timezone.utc),
        total_findings=total,
        findings_by_severity=counts,
    )

