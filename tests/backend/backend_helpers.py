"""Shared helpers + fixtures for tests/backend (all traffic goes over HTTP).

Test modules do `from backend_helpers import *` to pick up the fixtures.
"""
import io
import os
import uuid
import zipfile

import pytest

from conftest import require_endpoint  # tests/conftest.py


V1 = "/api/v1"
ALLOWED_STATUSES = {"QUEUED", "INGESTING", "ANALYZING", "PROCESSING", "AI_ANALYSIS",
                    "COMPLETED", "FAILED", "CANCELLED"}
UUID_RE = r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"
# Optional: where the backend stores uploads (lets tests inspect the disk).
UPLOAD_DIR = os.getenv("PQC_UPLOAD_DIR")


def uniq(prefix="qa"):
    return f"{prefix}-{uuid.uuid4().hex[:10]}"


def zip_bytes(files=None) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        for name, data in (files or {"app.py": "print('hi')\n", "README.md": "# demo\n"}).items():
            z.writestr(name, data)
    return buf.getvalue()


@pytest.fixture
def make_project(api, openapi):
    require_endpoint(openapi, "post", f"{V1}/projects")

    def _make(name=None, description="qa project"):
        r = api.post(f"{V1}/projects", json={"name": name or uniq("proj"), "description": description})
        assert r.status_code == 201, r.text
        return r.json()
    return _make


@pytest.fixture
def project(make_project):
    return make_project()


@pytest.fixture
def make_upload(api, openapi, tmp_path):
    require_endpoint(openapi, "post", f"{V1}/uploads")

    def _make(filename=None):
        p = tmp_path / (filename or f"{uniq('repo')}.zip")
        p.write_bytes(zip_bytes())
        with p.open("rb") as fh:
            r = api.post(f"{V1}/uploads", files={"file": (p.name, fh, "application/zip")})
        assert r.status_code == 201, r.text
        return r.json()
    return _make


@pytest.fixture
def upload(make_upload):
    return make_upload()


@pytest.fixture
def make_scan(api, openapi):
    require_endpoint(openapi, "post", f"{V1}/scans")

    def _make(project_id, upload_id):
        r = api.post(f"{V1}/scans", json={"project_id": project_id, "upload_id": upload_id})
        assert r.status_code == 201, r.text
        return r.json()
    return _make


@pytest.fixture
def scan(project, upload, make_scan):
    return make_scan(project["id"], upload["upload_id"])
