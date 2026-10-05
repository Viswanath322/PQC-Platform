from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.v1.routes.auth import get_current_user, get_user_organization_id
from app.models import User
from app.schemas.finding import FindingEngine, FindingOut, FindingSeverity
from app.services.finding_service import get_finding, list_findings

router = APIRouter(prefix="/findings", tags=["findings"])


@router.get("", response_model=list[FindingOut])
def read_findings(
    severity: str | None = Query(default=None, min_length=3, max_length=8),
    engine: str | None = Query(default=None, min_length=3, max_length=20),
    finding_category: str | None = Query(default=None, min_length=1, max_length=100),
    scan_id: str | None = Query(default=None, min_length=36, max_length=36),
    include_dev: bool = Query(default=False),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[FindingOut]:
    """List findings; an empty list is a valid Day 1 response."""
    if severity is not None and severity.lower() not in FindingSeverity.__args__:
        raise HTTPException(status_code=422, detail="Invalid severity")
    if engine is not None and engine.lower() not in FindingEngine.__args__:
        raise HTTPException(status_code=422, detail="Invalid engine")
    return list_findings(
        db,
        organization_id=get_user_organization_id(user),
        scan_id=scan_id,
        include_dev=include_dev,
        severity=severity,
        category=finding_category,
        engine=engine,
        limit=limit,
        offset=offset,
    )


@router.get("/{finding_id}", response_model=FindingOut)
def read_finding(
    finding_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> FindingOut:
    finding = get_finding(db, finding_id, organization_id=get_user_organization_id(user))
    if finding is None:
        raise HTTPException(status_code=404, detail="Finding not found")
    return finding
