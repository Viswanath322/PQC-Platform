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
from app.models import Base, Finding, Organization, Project, Scan, ScanComponent, User
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


FAKE_QUEUE: list[str] = []


@pytest.fixture
def real_queue():
    """Ask for this fixture to use the real enqueue/dequeue code instead of the in-memory fake."""


@pytest.fixture
def real_redis(real_queue):
    if not redis_up():
        pytest.skip("Redis/Memurai not running")
    return get_redis()


@pytest.fixture(autouse=True)
def fake_queue(request, monkeypatch):
    """Scan creation now fails with 503 when Redis is down, so use an in-memory queue unless a test needs real Redis."""
    if "real_queue" in request.fixturenames:
        return
    from app.api.v1 import scans as scans_module

    FAKE_QUEUE.clear()
    monkeypatch.setattr(scans_module, "enqueue_scan", lambda sid, *args: FAKE_QUEUE.append(sid) or True)
    monkeypatch.setattr(scans_module, "dequeue_scan", lambda sid: sid in FAKE_QUEUE and FAKE_QUEUE.remove(sid) or True)


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
    ("GET", f"{API}/findings", {}),
    ("GET", f"{API}/findings/{FAKE}", {}),
    ("GET", f"{API}/reports/{FAKE}", {}),
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
    assert all(status == "PENDING" for status in scan["engine_statuses"].values())
    assert "sast" in scan["engine_statuses"] and "crypto" in scan["engine_statuses"]
    assert scan["id"] in FAKE_QUEUE
    assert scan["upload_id"] == up["upload_id"]      # safe reference instead of the server path
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
    assert client.get(f"{API}/reports/{scan['id']}", headers=bob).status_code == 404
    assert client.get(
        f"{API}/findings/summary", params={"scan_id": scan["id"]}, headers=bob
    ).status_code == 404
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
    report = client.get(f"{API}/reports/not-a-uuid", headers=alice)
    assert report.status_code == 422


def test_validation_errors_do_not_echo_submitted_values(alice):
    marker = "PRIVATE_VALUE_SHOULD_NOT_BE_ECHOED"
    response = client.post(
        f"{API}/projects", json={"name": marker * 20}, headers=alice
    )
    assert response.status_code == 422
    assert marker not in response.text
    assert response.json()["detail"] == "Request validation failed"
    assert response.json()["errors"]


def test_unknown_uuids_are_404(alice):
    p = create_project(alice)
    assert client.get(f"{API}/projects/{uuid.uuid4()}", headers=alice).status_code == 404
    assert create_scan(alice, str(uuid.uuid4()), upload_zip(alice)["upload_id"]).status_code == 404
    assert create_scan(alice, p["id"], str(uuid.uuid4())).status_code == 404
    assert client.get(f"{API}/scans/{uuid.uuid4()}", headers=alice).status_code == 404


def test_empty_report_and_summary_are_valid(alice):
    scan = create_scan(alice, create_project(alice)["id"], upload_zip(alice)["upload_id"]).json()
    report = client.get(f"{API}/reports/{scan['id']}", headers=alice)
    summary = client.get(f"{API}/findings/summary", params={"scan_id": scan["id"]}, headers=alice)
    assert report.status_code == summary.status_code == 200
    assert report.json()["total_findings"] == 0
    assert report.json()["findings"] == []
    assert report.json()["sbom"] == report.json()["cbom"] == []
    assert summary.json()["total_findings"] == 0
    assert summary.json()["by_engine"] == summary.json()["by_severity"] == summary.json()["by_category"] == []


def test_single_engine_report_includes_rule_metadata(alice):
    scan = create_scan(alice, create_project(alice)["id"], upload_zip(alice)["upload_id"]).json()
    with SessionLocal() as db:
        db.add(Finding(
            id=str(uuid.uuid4()), scan_id=scan["id"], engine="sast", category="injection",
            severity="high", title="Unsafe SQL", file_path="src/db.py", line_number=8,
            evidence="query = user_input", rule_id="SAST-INJ-001", rule_version="1.0.0",
            source_engine="sast",
        ))
        db.commit()
    report = client.get(f"{API}/reports/{scan['id']}", headers=alice).json()
    assert report["total_findings"] == len(report["findings"]) == 1
    assert report["findings_by_engine"] == {"sast": 1}
    assert report["findings"][0]["rule_id"] == "SAST-INJ-001"


def test_single_and_multi_engine_report_contract_is_deterministic(alice):
    scan = create_scan(alice, create_project(alice)["id"], upload_zip(alice)["upload_id"]).json()
    with SessionLocal() as db:
        db.add_all([
            Finding(
                id=str(uuid.uuid4()), scan_id=scan["id"], engine="sast", category="injection",
                severity="high", title="Unsafe SQL", file_path="src/db.py", line_number=8,
                evidence="query = user_input", rule_id="SAST-INJ-001", rule_version="1.0.0",
                source_engine="sast", correlation_group_id="00000000-0000-4000-8000-000000000001",
            ),
            Finding(
                id=str(uuid.uuid4()), scan_id=scan["id"], engine="crypto", category="pqc",
                severity="medium", title="RSA use", file_path="src/crypto.py", line_number=14,
                evidence="RSA.generate()", rule_id="CRYPTO-QV-001", rule_version="1.0.0",
                source_engine="crypto",
            ),
            ScanComponent(
                scan_id=scan["id"], component_kind="dependency", component_type="library",
                name="requests", version="2.32.0", purl="pkg:pypi/requests@2.32.0",
                source_file="requirements.txt", detection_method="manifest", confidence=1.0,
            ),
            ScanComponent(
                scan_id=scan["id"], component_kind="crypto", component_type="algorithm",
                name="RSA", source_file="src/crypto.py", line_number=14,
                detection_method="CRYPTO-QV-001", confidence=0.91,
            ),
        ])
        db.commit()

    first = client.get(f"{API}/findings/summary", params={"scan_id": scan["id"]}, headers=alice).json()
    second = client.get(f"{API}/findings/summary", params={"scan_id": scan["id"]}, headers=alice).json()
    assert first == second
    assert first["total_findings"] == 2
    assert first["by_engine"] == [{"key": "crypto", "count": 1}, {"key": "sast", "count": 1}]
    assert first["by_severity"] == [{"key": "high", "count": 1}, {"key": "medium", "count": 1}]

    report = client.get(f"{API}/reports/{scan['id']}", headers=alice).json()
    assert report["total_findings"] == len(report["findings"]) == 2
    assert report["findings_by_engine"] == {"crypto": 1, "sast": 1}
    assert report["findings_by_category"] == {"injection": 1, "pqc": 1}
    assert {item["rule_id"] for item in report["findings"]} == {"SAST-INJ-001", "CRYPTO-QV-001"}
    assert len(report["sbom"]) == len(report["cbom"]) == 1


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
    assert set(r.json()["engine_statuses"].values()) == {"CANCELLED"}
    assert client.post(f"{API}/scans/{scan['id']}/cancel", headers=alice).status_code == 409


def test_redis_failure_returns_503_and_scan_is_marked_failed(alice, monkeypatch):
    from app.api.v1 import scans as scans_module

    monkeypatch.setattr(scans_module, "enqueue_scan", lambda sid, *args: False)
    p = create_project(alice)
    r = create_scan(alice, p["id"], upload_zip(alice)["upload_id"])
    assert r.status_code == 503
    assert "QUEUED" not in r.text
    with SessionLocal() as db:  # nothing may be left saying QUEUED
        rows = db.query(Scan).filter(Scan.project_id == p["id"]).all()
        assert len(rows) == 1 and rows[0].status == "FAILED" and rows[0].completed_at is not None
    listed = client.get(f"{API}/scans", params={"project_id": p["id"]}, headers=alice).json()
    assert [x["status"] for x in listed] == ["FAILED"]


def test_unreachable_redis_returns_503(alice, real_queue, monkeypatch):
    monkeypatch.setenv("REDIS_URL", "redis://127.0.0.1:1/0")  # nothing listens here
    r = create_scan(alice, create_project(alice)["id"], upload_zip(alice)["upload_id"])
    assert r.status_code == 503


def test_cancel_removes_scan_from_queue(alice):
    scan = create_scan(alice, create_project(alice)["id"], upload_zip(alice)["upload_id"]).json()
    assert scan["id"] in FAKE_QUEUE
    assert client.post(f"{API}/scans/{scan['id']}/cancel", headers=alice).status_code == 200
    assert scan["id"] not in FAKE_QUEUE


def test_real_redis_enqueue_and_cancel_dequeue(alice, real_redis, monkeypatch):
    import app.services.redis_service as rs
    from app.services.redis_service import ScanJob

    test_queue = "pqc:scan_queue_test"
    monkeypatch.setattr(rs, "QUEUE_KEY", test_queue)

    scan = create_scan(alice, create_project(alice)["id"], upload_zip(alice)["upload_id"]).json()

    def queued_item_matches(item):
        if item == scan["id"]:  # legacy queue message
            return True
        try:
            return ScanJob.decode(item).scan_id == scan["id"]
        except (ValueError, TypeError):
            return False

    queued_payload = None
    try:
        queued_payload = next(
            item
            for item in real_redis.lrange(test_queue, 0, -1)
            if queued_item_matches(item)
        )
        job = ScanJob.decode(queued_payload)
        assert job.repository_workspace
        assert "sast" in job.selected_engines and "crypto" in job.selected_engines
        assert client.post(f"{API}/scans/{scan['id']}/cancel", headers=alice).status_code == 200
        remaining = real_redis.lrange(test_queue, 0, -1)
        assert not any(queued_item_matches(item) for item in remaining)
    finally:
        if queued_payload is not None:
            real_redis.lrem(test_queue, 0, queued_payload)


def test_real_redis_ping_endpoint(real_redis):
    r = client.get(f"{API}/redis/ping")
    assert r.status_code == 200 and r.json()["redis"] == "ok"


# ---------- QA items 13, 14, 31, 32 ----------
def test_scan_status_is_a_fixed_enum(alice):
    from pydantic import ValidationError
    from app.schemas.scan import ScanOut, ScanStatus

    assert {s.value for s in ScanStatus} == {
        "QUEUED", "INGESTING", "ANALYZING", "PROCESSING", "AI_ANALYSIS", "COMPLETED", "FAILED", "CANCELLED"}
    scan = create_scan(alice, create_project(alice)["id"], upload_zip(alice)["upload_id"]).json()
    assert scan["status"] in {s.value for s in ScanStatus}
    base = {"id": "x", "project_id": "y", "created_at": datetime.now()}
    with pytest.raises(ValidationError):
        ScanOut.model_validate({**base, "status": "WHATEVER"})


def test_nosniff_header_on_all_responses(alice):
    assert client.get(f"{API}/health").headers["X-Content-Type-Options"] == "nosniff"
    assert client.get(f"{API}/projects").headers["X-Content-Type-Options"] == "nosniff"      # 401
    assert client.get(f"{API}/projects", headers=alice).headers["X-Content-Type-Options"] == "nosniff"


def test_lists_are_newest_first_with_stable_tiebreak(alice):
    for i in range(3):
        create_project(alice, f"Order {i}")
    rows = client.get(f"{API}/projects", headers=alice).json()
    keys = [(x["created_at"], x["id"]) for x in rows]
    assert keys == sorted(keys, reverse=True)
