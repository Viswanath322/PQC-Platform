"""Day 1 end-of-day demo flow over HTTP + MySQL verification.

health -> auth (if any) -> create project -> upload zip -> create scan (QUEUED)
-> GET scan -> row in MySQL with status QUEUED -> cancel.

Steps share state in FLOW; a step whose prerequisite is missing is Blocked, a step that
exists but misbehaves is Failed. API prefix (/api/v1 or none) is discovered from OpenAPI.
"""
import io
import os
import zipfile
from urllib.parse import urlparse, unquote

import httpx
import pytest

API_URL = os.getenv("PQC_API_URL", "http://127.0.0.1:8000").rstrip("/")
MYSQL_URL = os.getenv("PQC_MYSQL_URL", "mysql://pqc:change_me_locally@127.0.0.1:3306/pqc_security")

pytestmark = pytest.mark.integration
FLOW: dict = {}


def blocked(reason):
    pytest.skip(f"BLOCKED: {reason}")


@pytest.fixture(scope="module")
def http():
    c = httpx.Client(base_url=API_URL, timeout=15)
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


def test_02_auth(http, paths):
    reg = find(paths, "/auth/register", "post") or find(paths, "/register", "post")
    login = find(paths, "/auth/login", "post") or find(paths, "/login", "post")
    if not (reg and login):
        blocked("auth register/login endpoints not implemented")
    body = {"email": "qa-day1@pqc.local", "password": "Qa-Day1-Pass!234"}
    r = http.post(reg, json=body)
    assert r.status_code in (200, 201, 409), r.text
    r = http.post(login, json=body)
    assert r.status_code == 200, r.text
    tok = r.json().get("access_token")
    if tok:
        http.headers["Authorization"] = f"Bearer {tok}"


def test_03_create_project(http, paths):
    p = find(paths, "/projects", "post")
    if not p:
        blocked("POST /projects not implemented")
    r = http.post(p, json={"name": "Demo Banking Application", "description": "Day 1 QA demo"})
    assert r.status_code in (200, 201), f"{r.status_code} {r.text}"
    FLOW["project_id"] = r.json()["id"]
    assert r.json()["name"] == "Demo Banking Application"


def test_04_upload_zip(http, paths):
    p = find(paths, "/uploads", "post")
    if not p:
        blocked("POST /uploads not implemented")
    r = http.post(p, files={"file": ("demo-banking.zip", make_zip(), "application/zip")})
    assert r.status_code in (200, 201), f"{r.status_code} {r.text}"
    FLOW["upload_id"] = r.json()["upload_id"]


def test_05_create_scan_queued(http, paths):
    p = find(paths, "/scans", "post")
    if not p:
        blocked("POST /scans not implemented")
    if "project_id" not in FLOW or "upload_id" not in FLOW:
        blocked("previous step (project/upload) did not succeed")
    r = http.post(p, json={"project_id": FLOW["project_id"], "upload_id": FLOW["upload_id"]})
    assert r.status_code in (200, 201, 202), f"{r.status_code} {r.text}"
    assert r.json()["status"] == "QUEUED"
    FLOW["scan_id"] = r.json()["id"]


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


def test_07_scan_row_in_mysql(http):
    if "scan_id" not in FLOW:
        blocked("scan was not created")
    row = mysql_row("SELECT id,project_id,status FROM scans WHERE id=%s", (FLOW["scan_id"],))
    assert row is not None, "scan not found in MySQL scans table"
    assert row["status"] == "QUEUED"


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
    row = mysql_row("SELECT status FROM scans WHERE id=%s", (FLOW["scan_id"],))
    assert row["status"] == "CANCELLED"


def test_99_cleanup():
    """Remove rows created by this run (best effort)."""
    import pymysql
    if "scan_id" not in FLOW:
        return
    u = urlparse(MYSQL_URL)
    try:
        conn = pymysql.connect(host=u.hostname, port=u.port or 3306, user=unquote(u.username or ""),
                               password=unquote(u.password or ""), database=u.path.lstrip("/"), autocommit=True)
        with conn, conn.cursor() as c:
            c.execute("DELETE FROM scans WHERE id=%s", (FLOW["scan_id"],))
            if "project_id" in FLOW:
                c.execute("DELETE FROM projects WHERE id=%s", (FLOW["project_id"],))
    except Exception:  # noqa: BLE001
        pass
