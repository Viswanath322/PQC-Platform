from fastapi import APIRouter, Depends, File, UploadFile

from app.api.v1.routes.auth import get_current_user, get_user_organization_id
from app.models import User
from app.schemas.scan import UploadOut
from app.services.storage_service import save_zip

router = APIRouter(prefix="/uploads", tags=["uploads"])


@router.post("", response_model=UploadOut, status_code=201)
def upload_repository(file: UploadFile = File(...), user: User = Depends(get_current_user)):
    return save_zip(file, organization_id=get_user_organization_id(user))
