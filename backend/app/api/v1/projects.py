from fastapi import APIRouter, Depends, HTTPException, Path
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.v1.routes.auth import get_current_user, get_user_organization_id
from app.models import Project, User
from app.schemas.common import UUID_PATTERN
from app.schemas.project import ProjectCreate, ProjectOut

router = APIRouter(prefix="/projects", tags=["projects"])


@router.post("", response_model=ProjectOut, status_code=201)
def create_project(body: ProjectCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    organization_id = get_user_organization_id(user)
    project = Project(name=body.name, description=body.description, organization_id=organization_id)
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.get("", response_model=list[ProjectOut])
def list_projects(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    organization_id = get_user_organization_id(user)
    return (
        db.query(Project)
        .filter(Project.organization_id == organization_id)
        .order_by(Project.created_at.desc(), Project.id.desc())
        .all()
    )


@router.get("/{project_id}", response_model=ProjectOut)
def get_project(
    project_id: str = Path(pattern=UUID_PATTERN),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    project = (
        db.query(Project)
        .filter(Project.id == project_id, Project.organization_id == get_user_organization_id(user))
        .first()
    )
    if project is None:
        raise HTTPException(404, "Project not found")
    return project
