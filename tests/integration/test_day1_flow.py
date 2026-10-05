"""Day 1 end-of-day demo flow over HTTP + MySQL verification.

health -> auth (if any) -> create project -> upload zip -> create scan (QUEUED)
-> GET scan -> row in MySQL with status QUEUED -> queued in Redis -> cancel.

Contract (unified id standard): every primary key is a UUID string (VARCHAR/CHAR(36)); ids are
never integers. Projects must reference a real organization row (FK), and the backend must not
5xx on any input the schema itself accepts.

Steps share state in FLOW; a step whose prerequisite is missing is Blocked, a step that
exists but misbehaves is Failed. API prefix (/api/v1 or none) is discovered from OpenAPI.
"""
import io
import os
import re
import uuid
import zipfile
from pathlib import Path
from urllib.parse import urlparse, unquote

import httpx
import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
try:
    from dotenv import load_dotenv
    load_dotenv(REPO_ROOT / ".env")
except ImportError:
    pass

API_URL = os.getenv("PQC_API_URL", "http://127.0.0.1:8000").rstrip("/")
MYSQL_URL = os.getenv("PQC_MYSQL_URL", "mysql://pqc:change_me_locally@127.0.0.1:3306/pqc_security")
REDIS_URL = os.getenv("PQC_REDIS_URL") or os.getenv("REDIS_URL") or "redis://127.0.0.1:6379/0"
UUID_RE = re.compile(r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$")

pytestmark = pytest.mark.integration
FLOW: dict = {}


def blocked(reason):
    pytest.skip(f"BLOCKED: {reason}")


def _send_token(request):
    """Once test_02 has logged in, every call carries the token unless it sets its own header."""
    if FLOW.get("token") and "authorization" not in request.headers:
        request.headers["Authorization"] = f"Bearer {FLOW['token']}"


@pytest.fixture(scope="module", autouse=True)
def _day1_worker_pause():
    """Coordinate with background workers to keep scan QUEUED until test_09 cancels it."""
    try:
        r = redis_client()
        r.set("pqc:worker:paused", "1")
    except Exception:
        pass
    yield
    try:
        r = redis_client()
        r.delete("pqc:worker:paused")
    except Exception:
        pass


@pytest.fixture(scope="module")
def http():
    c = httpx.Client(base_url=API_URL, timeout=15, event_hooks={"request": [_send_token]})
    try:
        c.get("/openapi.json")
    except httpx.TransportError:
        blocked(f"backend not reachable at {API_URL}")
    yield c
    c.close()


@pytest.fixture(scope="module")
def paths(http):
    return http.get("/openapi.json").json().get("paths", {})


def find(paths, suffix, method):
    for p, ops in paths.items():
        if p.rstrip("/").endswith(suffix) and "{" not in p and method in ops:
            return p
    return None


def mysql_row(sql, args):
    import pymysql
    u = urlparse(MYSQL_URL)
    try:
        conn = pymysql.connect(host=u.hostname, port=u.port or 3306, user=unquote(u.username or ""),
                               password=unquote(u.password or ""), database=u.path.lstrip("/"),
                               connect_timeout=5, cursorclass=pymysql.cursors.DictCursor)
    except Exception as e:  # noqa: BLE001
        blocked(f"MySQL not reachable: {e}")
    with conn, conn.cursor() as c:
        c.execute(sql, args)
        return c.fetchone()


def mysql_exec(sql, args=()):
    import pymysql
    u = urlparse(MYSQL_URL)
    try:
        conn = pymysql.connect(host=u.hostname, port=u.port or 3306, user=unquote(u.username or ""),
                               password=unquote(u.password or ""), database=u.path.lstrip("/"),
                               connect_timeout=5, autocommit=True)
    except Exception as e:  # noqa: BLE001
        blocked(f"MySQL not reachable: {e}")
    with conn, conn.cursor() as c:
        c.execute(sql, args)


def redis_client():
    import redis
    c = redis.Redis.from_url(REDIS_URL, socket_connect_timeout=3, decode_responses=True)
    try:
        c.ping()
    except redis.exceptions.AuthenticationError:
        blocked("Redis requires a password not supplied in PQC_REDIS_URL")
    except redis.exceptions.RedisError as e:
        blocked(f"Redis not reachable at {REDIS_URL}: {e}")
    return c


def make_zip() -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        z.writestr("demo/app.py", "import hashlib\nprint(hashlib.md5(b'x').hexdigest())\n")
        z.writestr("demo/README.md", "# Demo Banking Application\n")
    return buf.getvalue()


def test_01_health(http, paths):
    p = next((x for x in ("/health", "/api/v1/health", "/healthz") if x in paths), None)
    if not p:
        blocked("no health endpoint in OpenAPI (tried /health, /api/v1/health, /healthz)")
    r = http.get(p)
    assert r.status_code == 200, r.text


def _auth_paths(paths):
    reg = find(paths, "/auth/register", "post") or find(paths, "/register", "post")
    login = find(paths, "/auth/login", "post") or find(paths, "/login", "post")
    me = find(paths, "/auth/me", "get") or find(paths, "/me", "get")
    return reg, login, me


def test_02_auth(http, paths):
    reg, login, me = _auth_paths(paths)
    if not (reg and login):
        blocked("auth register/login endpoints not implemented")
    email = f"qa-day1-{uuid.uuid4().hex[:8]}@example.com"
    body = {"email": email, "password": "Qa-Day1-Pass!234"}
    FLOW["auth_email"] = email
    r = http.post(reg, json=body)
    assert r.status_code in (200, 201), f"register: {r.status_code} {r.text}"
    user = r.json()
    assert UUID_RE.match(user["id"]), f"user id is not a UUID: {user['id']!r}"
    assert "password_hash" not in user, "register response leaks password_hash"
    assert http.post(reg, json=body).status_code == 409, "duplicate registration must be 409"
    r = http.post(login, json=body)
    assert r.status_code == 200, r.text
    tok = r.json().get("access_token")
    assert tok, "login returned no access_token"
    FLOW["token"] = tok
    if me:
        r = http.get(me, headers={"Authorization": f"Bearer {tok}"})
        assert r.status_code == 200, r.text
        assert r.json()["email"] == email
    # the user must really be in MySQL, hashed, with a valid organization reference
    row = mysql_row("SELECT id,organization_id,password_hash FROM users WHERE email=%s", (email,))
    assert row is not None, "registered user not found in MySQL users table"
    assert row["id"] == user["id"]
    assert row["password_hash"] and "Qa-Day1-Pass" not in row["password_hash"], "password stored in clear"
    if row["organization_id"] is not None:
        org = mysql_row("SELECT id FROM organizations WHERE id=%s", (row["organization_id"],))
        assert org is not None, "users.organization_id points at a missing organization"


def test_02b_wrong_password_and_bad_token(http, paths):
    reg, login, me = _auth_paths(paths)
    if not (reg and login and FLOW.get("auth_email")):
        blocked("auth not available")
    r = http.post(login, json={"email": FLOW["auth_email"], "password": "not-the-password-123"})
    assert r.status_code == 401, r.text
    if me:
        with httpx.Client(base_url=API_URL, timeout=15) as anon:
            assert anon.get(me).status_code in (401, 403), "/me without a token must be refused"
        assert http.get(me, headers={"Authorization": "Bearer x.y.z"}).status_code == 401


def test_02c_seeded_admin_email_is_accepted_by_login(http, paths):
    """The dev seed creates admin@pqc.local. The API must treat it as a normal (wrong-password) login,
    not reject the address as invalid (422) or crash (5xx)."""
    _, login, _ = _auth_paths(paths)
    if not login:
        blocked("auth login not implemented")
    r = http.post(login, json={"email": "admin@pqc.local", "password": "not-the-password-123"})
    assert r.status_code in (400, 401), f"FINDING: login for seeded address gave {r.status_code}: {r.text[:200]}"


def test_02d_login_survives_foreign_password_hash_format(http, paths):
    """seed.sql stores a bcrypt hash. A hash the verifier does not understand must give 401, never 500."""
    _, login, _ = _auth_paths(paths)
    if not login:
        blocked("auth login not implemented")
    email = f"qa-bcrypt-{uuid.uuid4().hex[:8]}@example.com"
    bcrypt_hash = "$2b$12$e80yq5p5L6iSgGg06xWj3OP0pUcmGv0.7hE5e3rB6eB8uY1vW.oO2"
    mysql_exec("INSERT INTO users (id,email,password_hash,role,created_at,updated_at) VALUES (%s,%s,%s,'user',NOW(6),NOW(6))",
               (str(uuid.uuid4()), email, bcrypt_hash))
    try:
        r = http.post(login, json={"email": email, "password": "Some-Password-12345"})
        assert r.status_code in (400, 401), f"FINDING: bcrypt-hashed user login gave {r.status_code}"
    finally:
        mysql_exec("DELETE FROM users WHERE email=%s", (email,))


def _auth_headers():
    return {"Authorization": f"Bearer {FLOW['token']}"} if FLOW.get("token") else {}


def test_03_create_project(http, paths):
    p = find(paths, "/projects", "post")
    if not p:
        blocked("POST /projects not implemented")
    r = http.post(p, json={"name": "Demo Banking Application", "description": "Day 1 QA demo"}, headers=_auth_headers())
    assert r.status_code in (200, 201), f"{r.status_code} {r.text}"
    body = r.json()
    assert body["name"] == "Demo Banking Application"
    assert isinstance(body["id"], str) and UUID_RE.match(body["id"]), f"project id must be a UUID string, got {body['id']!r}"
    FLOW["project_id"] = body["id"]
    row = mysql_row("SELECT id,name,organization_id FROM projects WHERE id=%s", (body["id"],))
    assert row is not None, "project not found in MySQL projects table"
    assert row["organization_id"] is not None, "project has no organization"
    assert mysql_row("SELECT id FROM organizations WHERE id=%s", (row["organization_id"],)), "organization FK dangling"


def test_03b_project_read_paths(http, paths):
    if "project_id" not in FLOW:
        blocked("project was not created")
    lst = find(paths, "/projects", "get")
    if lst:
        r = http.get(lst)
        assert r.status_code == 200, f"list projects: {r.status_code} {r.text[:200]}"
        assert FLOW["project_id"] in [x["id"] for x in r.json()]
    one = next((x for x in paths if x.rstrip("/").endswith("/projects/{project_id}") and "get" in paths[x]), None)
    if one:
        r = http.get(one.replace("{project_id}", FLOW["project_id"]))
        assert r.status_code == 200, r.text
        assert r.json()["id"] == FLOW["project_id"]
        r = http.get(one.replace("{project_id}", str(uuid.uuid4())))
        assert r.status_code == 404, f"unknown project id must be 404, got {r.status_code}"
        r = http.get(one.replace("{project_id}", "1"))
        assert r.status_code < 500, f"non-UUID project id must not 5xx, got {r.status_code}"


def test_04_upload_zip(http, paths):
    p = find(paths, "/uploads", "post")
    if not p:
        blocked("POST /uploads not implemented")
    r = http.post(p, files={"file": ("demo-banking.zip", make_zip(), "application/zip")}, headers=_auth_headers())
    assert r.status_code in (200, 201), f"{r.status_code} {r.text}"
    FLOW["upload_id"] = r.json()["upload_id"]
    bad = http.post(p, files={"file": ("evil.txt", b"not a zip", "text/plain")})
    assert bad.status_code in (400, 415, 422), f"non-zip upload must be rejected, got {bad.status_code}"


def test_05_create_scan_queued(http, paths):
    p = find(paths, "/scans", "post")
    if not p:
        blocked("POST /scans not implemented")
    if "project_id" not in FLOW or "upload_id" not in FLOW:
        blocked("previous step (project/upload) did not succeed")
    try:
        redis_client().set("pqc:worker:paused", "1")
    except Exception:
        pass
    r = http.post(p, json={"project_id": FLOW["project_id"], "upload_id": FLOW["upload_id"]}, headers=_auth_headers())
    assert r.status_code in (200, 201, 202), f"{r.status_code} {r.text}"
    body = r.json()
    assert body["status"] == "QUEUED"
    assert UUID_RE.match(body["id"]), f"scan id must be a UUID string, got {body['id']!r}"
    assert body["project_id"] == FLOW["project_id"]
    FLOW["scan_id"] = body["id"]


def test_05b_create_scan_rejects_bad_references(http, paths):
    p = find(paths, "/scans", "post")
    if not p:
        blocked("POST /scans not implemented")
    if "upload_id" not in FLOW:
        blocked("no upload to reference")
    r = http.post(p, json={"project_id": str(uuid.uuid4()), "upload_id": FLOW["upload_id"]})
    assert r.status_code in (404, 422), f"unknown project must be 404/422, got {r.status_code} {r.text[:150]}"
    r = http.post(p, json={"project_id": 1, "upload_id": FLOW["upload_id"]})
    assert r.status_code in (404, 422), f"integer project id must be refused cleanly, got {r.status_code}"
    if "project_id" in FLOW:
        r = http.post(p, json={"project_id": FLOW["project_id"], "upload_id": "../../etc/passwd"})
        assert r.status_code in (400, 404, 422), f"path-like upload_id must be refused, got {r.status_code}"


def test_06_get_scan(http, paths):
    if "scan_id" not in FLOW:
        blocked("scan was not created")
    p = next((x for x in paths if x.rstrip("/").endswith("/scans/{scan_id}") and "get" in paths[x]), None)
    if not p:
        blocked("GET /scans/{id} not implemented")
    r = http.get(p.replace("{scan_id}", FLOW["scan_id"]))
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "QUEUED"
    assert r.json()["id"] == FLOW["scan_id"]
    assert http.get(p.replace("{scan_id}", str(uuid.uuid4()))).status_code == 404


def test_06b_list_scans_by_project(http, paths):
    if "scan_id" not in FLOW:
        blocked("scan was not created")
    p = find(paths, "/scans", "get")
    if not p:
        blocked("GET /scans not implemented")
    r = http.get(p, params={"project_id": FLOW["project_id"]})
    assert r.status_code == 200, f"{r.status_code} {r.text[:200]}"
    assert FLOW["scan_id"] in [x["id"] for x in r.json()]


def test_07_scan_row_in_mysql(http):
    if "scan_id" not in FLOW:
        blocked("scan was not created")
    row = mysql_row("SELECT id,project_id,status FROM scans WHERE id=%s", (FLOW["scan_id"],))
    assert row is not None, "scan not found in MySQL scans table"
    assert row["status"] == "QUEUED"
    assert row["project_id"] == FLOW["project_id"], "scans.project_id does not reference the created project"


def test_07b_scan_is_in_redis_queue(http):
    if "scan_id" not in FLOW:
        blocked("scan was not created")
    r = redis_client()
    found = []
    for key in r.scan_iter(match="*", count=200):
        if r.type(key) == "list" and FLOW["scan_id"] in r.lrange(key, 0, -1):
            found.append(key)
    FLOW["queue_keys"] = found
    assert found, "FINDING: scan is QUEUED in MySQL but its id is in no Redis list (never enqueued)"


def test_08_zip_not_stored_in_db(http):
    if "scan_id" not in FLOW:
        blocked("scan was not created")
    row = mysql_row("SELECT repository_path FROM scans WHERE id=%s", (FLOW["scan_id"],))
    assert row and row["repository_path"].endswith(".zip"), "scan should reference the ZIP by path only"


def test_09_cancel_scan(http, paths):
    if "scan_id" not in FLOW:
        blocked("scan was not created")
    p = next((x for x in paths if x.endswith("/cancel") and "post" in paths[x]), None)
    if not p:
        blocked("cancel endpoint not implemented")
    r = http.post(p.replace("{scan_id}", FLOW["scan_id"]))
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "CANCELLED"
    row = mysql_row("SELECT status,completed_at FROM scans WHERE id=%s", (FLOW["scan_id"],))
    assert row["status"] == "CANCELLED"
    assert row["completed_at"] is not None, "cancelled scan has no completed_at"
    again = http.post(p.replace("{scan_id}", FLOW["scan_id"]))
    assert again.status_code == 409, f"cancelling a final scan must be 409, got {again.status_code}"


def test_09b_cancelled_scan_removed_from_queue(http):
    """A cancelled scan must not be picked up by a worker: it should leave the queue (or be skipped by status)."""
    if "queue_keys" not in FLOW or not FLOW["queue_keys"]:
        blocked("scan was never found in a Redis queue")
    r = redis_client()
    still = [k for k in FLOW["queue_keys"] if FLOW["scan_id"] in r.lrange(k, 0, -1)]
    r.delete("pqc:worker:paused")
    if still:
        pytest.xfail(f"FINDING: cancelled scan {FLOW['scan_id']} is still in Redis queue {still}; "
                     "a worker must re-check status before starting it")


def test_99_cleanup():
    """Remove rows and queue entries created by this run (best effort)."""
    import pymysql
    u = urlparse(MYSQL_URL)
    try:
        conn = pymysql.connect(host=u.hostname, port=u.port or 3306, user=unquote(u.username or ""),
                               password=unquote(u.password or ""), database=u.path.lstrip("/"), autocommit=True)
        with conn, conn.cursor() as c:
            if "scan_id" in FLOW:
                c.execute("DELETE FROM scans WHERE id=%s", (FLOW["scan_id"],))
            if "project_id" in FLOW:
                c.execute("DELETE FROM projects WHERE id=%s", (FLOW["project_id"],))
            if "auth_email" in FLOW:
                c.execute("DELETE FROM users WHERE email=%s", (FLOW["auth_email"],))
    except Exception:  # noqa: BLE001
        pass
    try:
        import redis
        r = redis.Redis.from_url(REDIS_URL, socket_connect_timeout=2, decode_responses=True)
        for k in FLOW.get("queue_keys", []):
            r.lrem(k, 0, FLOW["scan_id"])
        r.delete("pqc:worker:paused")
    except Exception:  # noqa: BLE001
        pass
