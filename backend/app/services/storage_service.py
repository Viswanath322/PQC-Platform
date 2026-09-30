import os
import re
import hashlib
import uuid
import zipfile
from pathlib import Path

from fastapi import HTTPException, UploadFile

STORAGE_DIR = Path(os.getenv("UPLOAD_DIR", "storage/uploads"))
MAX_BYTES = 200 * 1024 * 1024


def safe_filename(name: str | None) -> str:
    """Return a harmless basename; never echo a client-supplied path."""
    base = re.split(r"[\\/]", name or "")[-1]
    base = re.sub(r"[^A-Za-z0-9._ -]", "_", base).strip(" .") or "upload.zip"
    return base[-100:]


def _organization_storage_dir(organization_id: str | None) -> Path:
    if not organization_id:
        raise HTTPException(403, "User is not assigned to an organization")
    # Hash the database key so it can never become a path component.
    org_key = hashlib.sha256(organization_id.encode("utf-8")).hexdigest()
    return STORAGE_DIR / org_key


def save_zip(file: UploadFile, organization_id: str | None = None) -> dict:
    filename = file.filename or ""
    if not filename.lower().endswith(".zip"):
        raise HTTPException(400, "Only .zip files are allowed")

    storage_dir = _organization_storage_dir(organization_id)
    storage_dir.mkdir(parents=True, exist_ok=True)
    upload_id = str(uuid.uuid4())
    dest = storage_dir / f"{upload_id}.zip"
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
        return {"upload_id": upload_id, "filename": safe_filename(file.filename), "size_bytes": size}
    except Exception:
        dest.unlink(missing_ok=True)
        raise


def get_upload_path(upload_id: str, organization_id: str | None = None) -> Path:
    try:
        parsed_id = uuid.UUID(upload_id)
    except (ValueError, TypeError, AttributeError) as exc:
        raise HTTPException(400, "Invalid upload_id") from exc
    path = _organization_storage_dir(organization_id) / f"{parsed_id}.zip"
    if not path.is_file():
        raise HTTPException(404, "Upload not found")
    return path.resolve()
