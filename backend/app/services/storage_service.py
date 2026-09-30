import os
import uuid
import zipfile
from pathlib import Path

from fastapi import HTTPException, UploadFile

STORAGE_DIR = Path(os.getenv("UPLOAD_DIR", "storage/uploads"))
MAX_BYTES = 200 * 1024 * 1024


def save_zip(file: UploadFile) -> dict:
    filename = file.filename or ""
    if not filename.lower().endswith(".zip"):
        raise HTTPException(400, "Only .zip files are allowed")

    STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    upload_id = str(uuid.uuid4())
    dest = STORAGE_DIR / f"{upload_id}.zip"
    size = 0
    too_big = False
    try:
        with dest.open("wb") as out:
            while chunk := file.file.read(1024 * 1024):
                size += len(chunk)
                if size > MAX_BYTES:
                    too_big = True
                    break
                out.write(chunk)

        if too_big:
            raise HTTPException(413, "File too large")
        if not zipfile.is_zipfile(dest):
            raise HTTPException(400, "File is not a valid ZIP")
        return {"upload_id": upload_id, "filename": filename, "size_bytes": size}
    except Exception:
        dest.unlink(missing_ok=True)
        raise


def get_upload_path(upload_id: str) -> Path:
    try:
        parsed_id = uuid.UUID(upload_id)
    except (ValueError, TypeError, AttributeError) as exc:
        raise HTTPException(400, "Invalid upload_id") from exc
    path = STORAGE_DIR / f"{parsed_id}.zip"
    if not path.is_file():
        raise HTTPException(404, "Upload not found")
    return path.resolve()
