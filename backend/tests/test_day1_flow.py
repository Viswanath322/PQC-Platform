"""
Day 1 tests: projects, upload, scans, redis queue.

Run from the backend/ folder:
    python -m pip install pytest httpx
    python -m pytest tests -v

Uses a throwaway SQLite DB and upload folder, so it never touches dev.db or storage/.
Redis tests are skipped automatically if Redis/Memurai is not running.
"""
import io
import os
import sys
import tempfile
import uuid
import zipfile
from pathlib import Path

# --- isolate the test environment BEFORE importing the app ---
_tmp = Path(tempfile.mkdtemp(prefix="pqc_test_"))
os.environ["DATABASE_URL"] = f"sqlite:///{(_tmp / 'test.db').as_posix()}"
os.environ["UPLOAD_DIR"] = str(_tmp / "uploads")
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest
from fastapi.testclient import TestClient

from dev_main import app
from app.services.redis_service import get_redis, QUEUE_KEY

client = TestClient(app)
API = "/api/v1"


# ---------- helpers ----------
def make_zip_bytes() -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        z.writestr("demo-banking/app.py", "print('hi')\n")
        z.writestr("demo-banking/requirements.txt", "requests==2.31.0\n")
    return buf.getvalue()


def create_project(name="Demo Banking Application") -> dict:
    r = client.post(f"{API}/projects", json={"name": name, "description": "test"})
    assert r.status_code == 201, r.text
    return r.json()


def upload_zip(filename="demo-banking.zip") -> dict:
    r = client.post(
        f"{API}/uploads",
        files={"file": (filename, make_zip_bytes(), "application/zip")},
    )
    assert r.status_code == 201, r.text
    return r.json()


def create_scan(project_id: int, upload_id: str):
    return client.post(f"{API}/scans", json={"project_id": project_id, "upload_id": upload_id})


def redis_up() -> bool:
    try:
        return bool(get_redis().ping())
    except Exception:
        return False


requires_redis = pytest.mark.skipif(not redis_up(), reason="Redis/Memurai not running")


# ---------- projects ----------
def test_create_and_get_project():
    p = create_project()
    assert p["id"] >= 1
    assert p["name"] == "Demo Banking Application"
    assert p["description"] == "test"
    assert "created_at" in p

    r = client.get(f"{API}/projects/{p['id']}")
    assert r.status_code == 200
    assert r.json()["id"] == p["id"]


def test_list_projects_contains_new_project():
    p = create_project("List Test Project")
    r = client.get(f"{API}/projects")
    assert r.status_code == 200
    assert p["id"] in [x["id"] for x in r.json()]


def test_get_unknown_project_404():
    assert client.get(f"{API}/projects/999999").status_code == 404


def test_create_project_requires_name():
    assert client.post(f"{API}/projects", json={"description": "no name"}).status_code == 422


# ---------- uploads ----------
def test_upload_valid_zip_saved_on_disk():
    up = upload_zip()
    assert up["filename"] == "demo-banking.zip"
    assert up["size_bytes"] > 0
    uuid.UUID(up["upload_id"])  # is a real UUID
    stored = Path(os.environ["UPLOAD_DIR"]) / f"{up['upload_id']}.zip"
    assert stored.exists()
    assert zipfile.is_zipfile(stored)


def test_upload_rejects_non_zip_extension():
    r = client.post(f"{API}/uploads", files={"file": ("notes.txt", b"hello", "text/plain")})
    assert r.status_code == 400


def test_upload_rejects_fake_zip():
    r = client.post(f"{API}/uploads", files={"file": ("fake.zip", b"not really a zip", "application/zip")})
    assert r.status_code == 400


def test_upload_requires_file():
    assert client.post(f"{API}/uploads").status_code == 422


# ---------- scans ----------
def test_create_scan_is_queued_and_retrievable():
    p = create_project()
    up = upload_zip()
    r = create_scan(p["id"], up["upload_id"])
    assert r.status_code == 201, r.text
    scan = r.json()

    uuid.UUID(scan["id"])
    assert scan["status"] == "QUEUED"
    assert scan["project_id"] == p["id"]
    assert scan["started_at"] is None
    assert scan["completed_at"] is None
    assert Path(scan["repository_path"]).exists()

    g = client.get(f"{API}/scans/{scan['id']}")
    assert g.status_code == 200
    assert g.json()["id"] == scan["id"]
    assert g.json()["status"] == "QUEUED"


def test_list_scans_and_project_filter():
    p1, p2 = create_project("P1"), create_project("P2")
    s1 = create_scan(p1["id"], upload_zip()["upload_id"]).json()
    s2 = create_scan(p2["id"], upload_zip()["upload_id"]).json()

    all_ids = [s["id"] for s in client.get(f"{API}/scans").json()]
    assert s1["id"] in all_ids and s2["id"] in all_ids

    only_p1 = [s["id"] for s in client.get(f"{API}/scans", params={"project_id": p1["id"]}).json()]
    assert s1["id"] in only_p1
    assert s2["id"] not in only_p1


def test_scan_unknown_project_404():
    up = upload_zip()
    assert create_scan(999999, up["upload_id"]).status_code == 404


def test_scan_unknown_upload_404():
    p = create_project()
    assert create_scan(p["id"], str(uuid.uuid4())).status_code == 404


@pytest.mark.parametrize("bad_id", ["hello", "../../etc/passwd", "..\\..\\windows\\system32", ""])
def test_scan_invalid_upload_id_400(bad_id):
    p = create_project()
    assert create_scan(p["id"], bad_id).status_code == 400


def test_get_unknown_scan_404():
    assert client.get(f"{API}/scans/{uuid.uuid4()}").status_code == 404


def test_cancel_scan_then_cancel_again_409():
    p = create_project()
    scan = create_scan(p["id"], upload_zip()["upload_id"]).json()

    r = client.post(f"{API}/scans/{scan['id']}/cancel")
    assert r.status_code == 200
    assert r.json()["status"] == "CANCELLED"
    assert r.json()["completed_at"] is not None

    assert client.post(f"{API}/scans/{scan['id']}/cancel").status_code == 409
    assert client.get(f"{API}/scans/{scan['id']}").json()["status"] == "CANCELLED"


def test_cancel_unknown_scan_404():
    assert client.post(f"{API}/scans/{uuid.uuid4()}/cancel").status_code == 404


# ---------- redis ----------
@requires_redis
def test_redis_ping_endpoint_ok():
    r = client.get(f"{API}/redis/ping")
    assert r.status_code == 200
    assert r.json()["redis"] == "ok"
    assert isinstance(r.json()["queue_length"], int)


@requires_redis
def test_creating_scan_pushes_to_redis_queue():
    r = get_redis()
    p = create_project()
    up = upload_zip()
    before = r.llen(QUEUE_KEY)
    scan = create_scan(p["id"], up["upload_id"]).json()
    after = r.llen(QUEUE_KEY)
    try:
        assert after == before + 1
        assert scan["id"] in r.lrange(QUEUE_KEY, 0, -1)
    finally:
        r.lrem(QUEUE_KEY, 0, scan["id"])  # keep the real queue clean


def test_scan_creation_survives_redis_down(monkeypatch):
    """Scan must still be created (QUEUED) even if Redis is unreachable."""
    monkeypatch.setenv("REDIS_URL", "redis://127.0.0.1:1/0")  # nothing listens here
    p = create_project()
    up = upload_zip()
    r = create_scan(p["id"], up["upload_id"])
    assert r.status_code == 201
    assert r.json()["status"] == "QUEUED"