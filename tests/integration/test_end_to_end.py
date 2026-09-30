"""
Day 1 QA — Full end-to-end integration test.
Author: Pushpam (QA + Cyber Security)

Exercises the complete Day 1 flow:
  register → login → create project → upload ZIP → create scan
  → verify QUEUED in API → retrieve scan → verify status = QUEUED
"""

import io
import uuid
import zipfile
import pytest
import requests

BASE_URL = "http://127.0.0.1:8000/api/v1"


def _backend_is_up() -> bool:
    try:
        r = requests.get(f"{BASE_URL}/health", timeout=3)
        return r.status_code == 200
    except requests.exceptions.ConnectionError:
        return False


backend_required = pytest.mark.skipif(
    not _backend_is_up(),
    reason="BLOCKED: FastAPI backend is not running at http://127.0.0.1:8000",
)


def _make_demo_zip() -> bytes:
    """Create a small demo-banking.zip equivalent for the end-to-end test."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("README.md", "# Demo Banking Application\nTest fixture for Day 1 QA.\n")
        zf.writestr("src/main.py", "# Entry point\nprint('Demo Banking Application')\n")
        zf.writestr("src/auth/login.py", "# Auth module\ndef login(user, pw): pass\n")
        zf.writestr("requirements.txt", "flask==2.3.0\nrequests==2.31.0\n")
    return buf.getvalue()


@backend_required
def test_day1_full_end_to_end_flow():
    """
    THE core Day 1 test:
    health → register → login → create project → upload ZIP
    → create scan → verify QUEUED → retrieve scan → verify QUEUED
    """
    # Step 1: health check
    health = requests.get(f"{BASE_URL}/health", timeout=5)
    assert health.status_code == 200
    assert health.json()["status"] in ("healthy", "ok")

    # Step 2: register user
    email = f"e2e-{uuid.uuid4().hex[:8]}@pqc.example"
    password = "SecureE2EPass!77"
    reg = requests.post(
        f"{BASE_URL}/auth/register",
        json={"email": email, "password": password},
        timeout=5,
    )
    assert reg.status_code == 201, f"Register failed: {reg.text}"

    # Step 3: login
    login = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": email, "password": password},
        timeout=5,
    )
    assert login.status_code == 200, f"Login failed: {login.text}"
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Step 4: create project
    project = requests.post(
        f"{BASE_URL}/projects",
        json={
            "name": "Demo Banking Application",
            "description": "Day 1 end-to-end QA project",
        },
        headers=headers,
        timeout=5,
    )
    assert project.status_code == 201, f"Create project failed: {project.text}"
    project_id = project.json()["id"]
    assert project.json()["name"] == "Demo Banking Application"

    # Step 5: upload ZIP
    upload = requests.post(
        f"{BASE_URL}/uploads",
        files={"file": ("demo-banking.zip", _make_demo_zip(), "application/zip")},
        headers=headers,
        timeout=15,
    )
    assert upload.status_code == 200, f"Upload failed: {upload.text}"
    upload_id = upload.json()["upload_id"]
    assert len(upload_id) > 0

    # Step 6: create scan
    scan_create = requests.post(
        f"{BASE_URL}/scans",
        json={"project_id": project_id, "upload_id": upload_id},
        headers=headers,
        timeout=5,
    )
    assert scan_create.status_code == 201, f"Create scan failed: {scan_create.text}"
    scan = scan_create.json()
    scan_id = scan["id"]

    # Step 7: verify status = QUEUED
    assert scan["status"] == "QUEUED", f"Expected QUEUED, got {scan['status']}"
    assert scan["project_id"] == project_id

    # Step 8: retrieve scan and verify again
    scan_get = requests.get(f"{BASE_URL}/scans/{scan_id}", headers=headers, timeout=5)
    assert scan_get.status_code == 200, f"Get scan failed: {scan_get.text}"
    retrieved = scan_get.json()
    assert retrieved["id"] == scan_id
    assert retrieved["status"] == "QUEUED"

    # Step 9: verify scan appears in list
    scans_list = requests.get(f"{BASE_URL}/scans", headers=headers, timeout=5)
    assert scans_list.status_code == 200
    ids_in_list = [s["id"] for s in scans_list.json()]
    assert scan_id in ids_in_list, "Created scan ID not found in GET /scans list"

    # Step 10: verify findings endpoint is accessible (empty list is valid)
    findings = requests.get(f"{BASE_URL}/findings", headers=headers, timeout=5)
    assert findings.status_code == 200
    assert isinstance(findings.json(), list)
