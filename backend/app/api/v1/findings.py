from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.finding import FindingOut
from app.services.finding_service import get_finding, list_findings

router = APIRouter(prefix="/findings", tags=["findings"])


@router.get("", response_model=list[FindingOut])
def read_findings(
    severity: str | None = Query(default=None, pattern="^(critical|high|medium|low)$"),
    category: str | None = Query(
        default=None,
        pattern="^(sast|crypto|dependency|configuration)$",
        description="Analysis group (maps to the Finding engine field)",
    ),
    db: Session = Depends(get_db),
) -> list[FindingOut]:
    """List findings; an empty list is a valid Day 1 response."""
    return list_findings(db, severity=severity, category=category)


@router.get("/{finding_id}", response_model=FindingOut)
def read_finding(finding_id: str, db: Session = Depends(get_db)) -> FindingOut:
    finding = get_finding(db, finding_id)
    if finding is None:
        raise HTTPException(status_code=404, detail="Finding not found")
    return finding
