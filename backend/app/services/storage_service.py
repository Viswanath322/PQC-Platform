import os
import re
import uuid
import zipfile
from pathlib import Path
from fastapi import UploadFile, HTTPException

STORAGE_DIR = Path(os.getenv("UPLOAD_DIR", "storage/uploads"))
MAX_BYTES = 200 * 1024 * 1024  # 200 MB dev limit


def safe_filename(name: str | None) -> str:
    """Basename only, harmless characters only, max 100 chars (never echo the raw client filename)."""
    base = re.split(r"[\\/]", name or "")[-1]
    base = re.sub(r"[^A-Za-z0-9._ -]", "_", base).strip(" .") or "upload.zip"
    return base[-100:]


def save_zip(file: UploadFile) -> dict:
    if not (file.filename or "").lower().endswith(".zip"):
        raise HTTPException(400, "Only .zip files are allowed")

    STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    upload_id = str(uuid.uuid4())
    dest = STORAGE_DIR / f"{upload_id}.zip"

    size = 0
    too_big = False
    with dest.open("wb") as out:
        while chunk := file.file.read(1024 * 1024):
            size += len(chunk)
            if size > MAX_BYTES:
                too_big = True
                break
            out.write(chunk)

    if too_big:
        dest.unlink(missing_ok=True)
        raise HTTPException(413, "File too large")
    if not zipfile.is_zipfile(dest):
        dest.unlink(missing_ok=True)
        raise HTTPException(400, "File is not a valid ZIP")

    return {"upload_id": upload_id, "filename": safe_filename(file.filename), "size_bytes": size}


def get_upload_path(upload_id: str) -> Path:
    try:
        uuid.UUID(upload_id)  # blocks path tricks like ../../x
    except ValueError:
        raise HTTPException(400, "Invalid upload_id")
    path = STORAGE_DIR / f"{upload_id}.zip"
    if not path.exists():
        raise HTTPException(404, "Upload not found")
    return path.resolve()
