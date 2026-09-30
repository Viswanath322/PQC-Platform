from fastapi import APIRouter, File, UploadFile

from app.schemas.scan import UploadOut
from app.services.storage_service import save_zip

router = APIRouter(prefix="/uploads", tags=["uploads"])


@router.post("", response_model=UploadOut, status_code=201)
def upload_repository(file: UploadFile = File(...)):
    return save_zip(file)
