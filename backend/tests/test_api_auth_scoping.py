"""
Projects / uploads / scans: login required, organization scoping, audit fixes.

Run from the backend/ folder:
    python -m pip install pytest httpx
    python -m pytest tests -v

Uses a throwaway SQLite DB + upload folder + random JWT secret, so it never touches your real
MySQL, .env or storage/. Redis tests are skipped automatically when Redis/Memurai is not running.
"""
import io
import os
import secrets
import sys
import tempfile
import uuid
import zipfile
from datetime import datetime, timedelta, timezone
from pathlib import Path

# ---- isolate the environment BEFORE importing the app ----
_tmp = Path(tempfile.mkdtemp(prefix="pqc_auth_test_"))
os.environ["APP_ENV"] = "test"
os.environ["DATABASE_URL"] = f"sqlite:///{(_tmp / 'test.db').as_posix()}"
os.environ["JWT_SECRET_KEY"] = secrets.token_urlsafe(48)
os.environ["UPLOAD_DIR"] = str(_tmp / "uploads")
os.environ.pop("REDIS_URL", None)
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import jwt
import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.core.database import SessionLocal, engine
from app.core.security import hash_password
from app.main import app
from app.models import Base, Organization, Project, Scan, User
from app.services.redis_service import QUEUE_KEY, get_redis

API = "/api/v1"
DEFAULT_ORG = "org-default-001"
OTHER_ORG = "org-other-002"
PASSWORD = "CorrectHorse-Battery-9"

Base.metadata.create_all(engine)
with SessionLocal() as _db:
    _db.add_all([Organization(id=DEFAULT_ORG, name="Default Organization"),
                 Organization(id=OTHER_ORG, name="Other Organization")])
    _db.commit()

client = TestClient(app)


# ---------- helpers ----------
def make_zip_bytes() -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        z.writestr("demo-banking/app.py", "print('hi')\n")
    return buf.getvalue()


def new_email() -> str:
    return f"user{uuid.uuid4().hex[:10]}@corp.io"


def register_and_login(email: str | None = None) -> dict:
    """Register through the API (always lands in the default org) and return auth headers."""
    email = email or new_email()
    r = client.post(f"{API}/auth/register", json={"email": email, "password": PASSWORD})
    assert r.status_code == 201, r.text
    return login(email)


def login(email: str) -> dict:
    r = client.post(f"{API}/auth/login", json={"email": email, "password": PASSWORD})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def db_user(organization_id: str | None) -> dict:
    """Create a user directly in the DB (register can only create default-org users)."""
    email = new_email()
    with SessionLocal() as db:
        db.add(User(email=email, password_hash=hash_password(PASSWORD), organization_id=organization_id))
        db.commit()
    return login(email)


def create_project(h, name="Demo Banking Application") -> dict:
    r = client.post(f"{API}/projects", json={"name": name, "description": "test"}, headers=h)
    assert r.status_code == 201, r.text
    return r.json()


def upload_zip(h, filename="demo-banking.zip") -> dict:
    r = client.post(f"{API}/uploads", files={"file": (filename, make_zip_bytes(), "application/zip")}, headers=h)
    assert r.status_code == 201, r.text
    return r.json()


def create_scan(h, project_id, upload_id):
    return client.post(f"{API}/scans", json={"project_id": project_id, "upload_id": upload_id}, headers=h)


def redis_up() -> bool:
    try:
        return bool(get_redis().ping())
    except Exception:
        return False


requires_redis = pytest.mark.skipif(not redis_up(), reason="Redis/Memurai not running")


@pytest.fixture(scope="module")
def alice():  # default org
    return register_and_login()


@pytest.fixture(scope="module")
def bob():  # a different organization
    return db_user(OTHER_ORG)


# ---------- 1. unauthenticated requests are rejected ----------
FAKE = str(uuid.uuid4())
PROTECTED = [
    ("POST", f"{API}/projects", {"json": {"name": "x"}}),
    ("GET", f"{API}/projects", {}),
    ("GET", f"{API}/projects/{FAKE}", {}),
    ("POST", f"{API}/uploads", {"files": {"file": ("a.zip", b"x", "application/zip")}}),
    ("POST", f"{API}/scans", {"json": {"project_id": FAKE, "upload_id": FAKE}}),
    ("GET", f"{API}/scans", {}),
    ("GET", f"{API}/scans/{FAKE}", {}),
    ("POST", f"{API}/scans/{FAKE}/cancel", {}),
]


@pytest.mark.parametrize("method,url,kwargs", PROTECTED)
def test_no_token_is_401(method, url, kwargs):
    assert client.request(method, url, **kwargs).status_code == 401


@pytest.mark.parametrize("method,url,kwargs", PROTECTED)
def test_garbage_token_is_401(method, url, kwargs):
    r = client.request(method, url, headers={"Authorization": "Bearer not.a.token"}, **kwargs)
    assert r.status_code == 401


def _token(sub, secret=None, exp_delta=timedelta(minutes=5)):
    s = get_settings()
    return jwt.encode({"sub": sub, "exp": datetime.now(timezone.utc) + exp_delta},
                      secret or s.jwt_secret_key, algorithm="HS256")


def test_expired_wrong_secret_and_unknown_user_tokens_are_401(alice):
    me = client.get(f"{API}/auth/me", headers=alice).json()
    for tok in (
        _token(me["id"], exp_delta=timedelta(minutes=-5)),          # expired
        _token(me["id"], secret="x" * 48),                            # signed with the wrong secret
        _token(str(uuid.uuid4())),                                    # user does not exist
    ):
        r = client.get(f"{API}/projects", headers={"Authorization": f"Bearer {tok}"})
        assert r.status_code == 401


def test_user_without_organization_gets_403():
    h = db_user(None)
    assert client.get(f"{API}/projects", headers=h).status_code == 403
    assert client.post(f"{API}/projects", json={"name": "x"}, headers=h).status_code == 403


# ---------- 2. new users and their projects land in org-default-001 ----------
def test_registered_user_is_in_default_org(alice):
    assert client.get(f"{API}/auth/me", headers=alice).json()["organization_id"] == DEFAULT_ORG


def test_project_gets_the_users_org(alice, bob):
    pa, pb = create_project(alice), create_project(bob)
    with SessionLocal() as db:
        assert db.get(Project, pa["id"]).organization_id == DEFAULT_ORG
        assert db.get(Project, pb["id"]).organization_id == OTHER_ORG


# ---------- 3. happy path (logged in) ----------
def test_full_flow_project_upload_scan(alice):
    p = create_project(alice)
    uuid.UUID(p["id"])
    up = upload_zip(alice)
    r = create_scan(alice, p["id"], up["upload_id"])
    assert r.status_code == 201, r.text
    scan = r.json()
    assert scan["status"] == "QUEUED" and scan["project_id"] == p["id"]
    assert r.headers["X-Queue-Status"] in {"enqueued", "deferred"}
    assert "repository_path" not in scan and "storage" not in str(scan).lower()
    with SessionLocal() as db:  # saved for ingestion, just not exposed
        assert Path(db.get(Scan, scan["id"]).repository_path).exists()
    got = client.get(f"{API}/scans/{scan['id']}", headers=alice)
    assert got.status_code == 200 and got.json()["status"] == "QUEUED"
    assert scan["id"] in [s["id"] for s in client.get(f"{API}/scans", headers=alice).json()]
    assert scan["id"] in [s["id"] for s in client.get(f"{API}/scans", params={"project_id": p["id"]}, headers=alice).json()]


# ---------- 4. users cannot reach another organization's data ----------
def test_cross_org_isolation(alice, bob):
    p = create_project(alice)
    up = upload_zip(alice)
    scan = create_scan(alice, p["id"], up["upload_id"]).json()

    # bob (other org) cannot see alice's project or scan...
    assert client.get(f"{API}/projects/{p['id']}", headers=bob).status_code == 404
    assert p["id"] not in [x["id"] for x in client.get(f"{API}/projects", headers=bob).json()]
    assert client.get(f"{API}/scans/{scan['id']}", headers=bob).status_code == 404
    assert scan["id"] not in [x["id"] for x in client.get(f"{API}/scans", headers=bob).json()]
    assert scan["id"] not in [x["id"] for x in
                              client.get(f"{API}/scans", params={"project_id": p["id"]}, headers=bob).json()]
    # ...cannot cancel it...
    assert client.post(f"{API}/scans/{scan['id']}/cancel", headers=bob).status_code == 404
    assert client.get(f"{API}/scans/{scan['id']}", headers=alice).json()["status"] == "QUEUED"
    # ...cannot start a scan on alice's project...
    own_upload = upload_zip(bob)
    assert create_scan(bob, p["id"], own_upload["upload_id"]).status_code == 404
    # ...and cannot use alice's uploaded ZIP, even in his own project.
    pb = create_project(bob)
    assert create_scan(bob, pb["id"], up["upload_id"]).status_code == 404
    # bob's own scan works
    assert create_scan(bob, pb["id"], own_upload["upload_id"]).status_code == 201


def test_same_org_users_share_data():
    u1, u2 = register_and_login(), register_and_login()
    p = create_project(u1)
    assert client.get(f"{API}/projects/{p['id']}", headers=u2).status_code == 200


# ---------- 5. validation + audit fixes ----------
@pytest.mark.parametrize("bad", ["", "   "])
def test_project_name_empty_rejected(alice, bad):
    assert client.post(f"{API}/projects", json={"name": bad}, headers=alice).status_code == 422


def test_project_name_trimmed_and_limited(alice):
    assert create_project(alice, "  Trim Me  ")["name"] == "Trim Me"
    assert client.post(f"{API}/projects", json={"name": "x" * 256}, headers=alice).status_code == 422


def test_non_uuid_ids_are_422_not_500(alice):
    up = upload_zip(alice)
    assert client.get(f"{API}/projects/1", headers=alice).status_code == 422
    assert create_scan(alice, "not-a-uuid", up["upload_id"]).status_code == 422
    p = create_project(alice)
    for bad in ("hello", "../../etc/passwd"):
        assert create_scan(alice, p["id"], bad).status_code == 422
    assert client.get(f"{API}/scans", params={"project_id": "abc"}, headers=alice).status_code == 422


def test_unknown_uuids_are_404(alice):
    p = create_project(alice)
    assert client.get(f"{API}/projects/{uuid.uuid4()}", headers=alice).status_code == 404
    assert create_scan(alice, str(uuid.uuid4()), upload_zip(alice)["upload_id"]).status_code == 404
    assert create_scan(alice, p["id"], str(uuid.uuid4())).status_code == 404
    assert client.get(f"{API}/scans/{uuid.uuid4()}", headers=alice).status_code == 404


def test_upload_rejects_bad_files(alice):
    r = client.post(f"{API}/uploads", files={"file": ("notes.txt", b"hi", "text/plain")}, headers=alice)
    assert r.status_code == 400
    r = client.post(f"{API}/uploads", files={"file": ("fake.zip", b"not a zip", "application/zip")}, headers=alice)
    assert r.status_code == 400
    assert client.post(f"{API}/uploads", headers=alice).status_code == 422


@pytest.mark.parametrize("raw", ["../../evil<script>.zip", "..\\..\\win\\evil.zip", "C:\\Users\\x\\my repo.zip"])
def test_upload_filename_sanitized(alice, raw):
    name = upload_zip(alice, raw)["filename"]
    assert "/" not in name and "\\" not in name and "<" not in name and ".." not in name
    assert name.lower().endswith(".zip")


def test_cancel_then_cancel_again_409(alice):
    scan = create_scan(alice, create_project(alice)["id"], upload_zip(alice)["upload_id"]).json()
    r = client.post(f"{API}/scans/{scan['id']}/cancel", headers=alice)
    assert r.status_code == 200 and r.json()["status"] == "CANCELLED" and r.json()["completed_at"]
    assert client.post(f"{API}/scans/{scan['id']}/cancel", headers=alice).status_code == 409


def test_queue_header_deferred_when_redis_down(alice, monkeypatch):
    monkeypatch.setenv("REDIS_URL", "redis://127.0.0.1:1/0")
    r = create_scan(alice, create_project(alice)["id"], upload_zip(alice)["upload_id"])
    assert r.status_code == 201 and r.json()["status"] == "QUEUED"
    assert r.headers["X-Queue-Status"] == "deferred"


@requires_redis
def test_enqueue_header_and_cancel_dequeues(alice):
    rc = get_redis()
    scan_resp = create_scan(alice, create_project(alice)["id"], upload_zip(alice)["upload_id"])
    scan = scan_resp.json()
    try:
        assert scan_resp.headers["X-Queue-Status"] == "enqueued"
        assert scan["id"] in rc.lrange(QUEUE_KEY, 0, -1)
        assert client.post(f"{API}/scans/{scan['id']}/cancel", headers=alice).status_code == 200
        assert scan["id"] not in rc.lrange(QUEUE_KEY, 0, -1)
    finally:
        rc.lrem(QUEUE_KEY, 0, scan["id"])


@requires_redis
def test_redis_ping_endpoint():
    r = client.get(f"{API}/redis/ping")
    assert r.status_code == 200 and r.json()["redis"] == "ok"