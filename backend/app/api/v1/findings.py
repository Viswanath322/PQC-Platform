from fastapi import APIRouter, Depends, HTTPException, Path, Query
from sqlalchemy.orm import Session

from app.api.v1.routes.auth import get_current_user, get_user_organization_id
from app.core.database import get_db
from app.models import User
from app.schemas.finding import FindingEngine, FindingOut, FindingSeverity
from app.schemas.common import UUID_PATTERN
from app.services.finding_service import get_finding, list_findings

router = APIRouter(prefix="/findings", tags=["findings"])


@router.get("", response_model=list[FindingOut])
def read_findings(
    scan_id: str | None = Query(default=None, pattern=UUID_PATTERN),
    severity: str | None = Query(default=None, min_length=3, max_length=8),
    category: str | None = Query(
        default=None,
        min_length=3,
        max_length=20,
        deprecated=True,
        description="Deprecated alias for engine; retained for the Day 1 UI contract",
    ),
    engine: str | None = Query(default=None, min_length=3, max_length=20),
    finding_category: str | None = Query(default=None, min_length=1, max_length=100),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[FindingOut]:
    """List findings scoped to user organization."""
    if severity is not None and severity.lower() not in FindingSeverity.__args__:
        raise HTTPException(status_code=422, detail="Invalid severity")
    if category is not None and category.lower() not in FindingEngine.__args__:
        raise HTTPException(status_code=422, detail="Invalid category; use engine or finding_category")
    if engine is not None and engine.lower() not in FindingEngine.__args__:
        raise HTTPException(status_code=422, detail="Invalid engine")
    if category is not None and engine is not None and category.lower() != engine.lower():
        raise HTTPException(status_code=422, detail="category and engine filters conflict")
    organization_id = get_user_organization_id(user)
    return list_findings(
        db,
        organization_id=organization_id,
        scan_id=scan_id,
        severity=severity,
        category=finding_category,
        engine=engine or category,
        limit=limit,
        offset=offset,
    )


@router.get("/{finding_id}", response_model=FindingOut)
def read_finding(
    finding_id: str = Path(pattern=UUID_PATTERN),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> FindingOut:
    organization_id = get_user_organization_id(user)
    finding = get_finding(db, finding_id, organization_id=organization_id)
    if finding is None:
        raise HTTPException(status_code=404, detail="Finding not found")
    return finding

