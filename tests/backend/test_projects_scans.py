"""
Day 1 QA — Projects, uploads, and scans endpoint tests.
Author: Pushpam (QA + Cyber Security)
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


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #

def _register_and_login() -> str:
    """Register a fresh user and return their JWT."""
    email = f"qa-{uuid.uuid4().hex[:8]}@pqc.example"
    password = "SecureTestPass!99"
    requests.post(f"{BASE_URL}/auth/register", json={"email": email, "password": password}, timeout=5)
    login = requests.post(f"{BASE_URL}/auth/login", json={"email": email, "password": password}, timeout=5)
    return login.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _make_zip(filename: str = "hello.py", content: str = "print('hello')\n") -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr(filename, content)
    return buf.getvalue()


# --------------------------------------------------------------------------- #
# Projects
# --------------------------------------------------------------------------- #

@backend_required
def test_create_project_returns_201():
    token = _register_and_login()
    response = requests.post(
        f"{BASE_URL}/projects",
        json={"name": "QA Test Project", "description": "Created by Pushpam QA test"},
        headers=_auth(token),
        timeout=5,
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert "id" in body
    assert body["name"] == "QA Test Project"


@backend_required
def test_list_projects_returns_list():
    token = _register_and_login()
    response = requests.get(f"{BASE_URL}/projects", headers=_auth(token), timeout=5)
    assert response.status_code == 200
    assert isinstance(response.json(), list)


@backend_required
def test_get_project_by_id():
    token = _register_and_login()
    create = requests.post(
        f"{BASE_URL}/projects",
        json={"name": "GetById Project", "description": "test"},
        headers=_auth(token),
        timeout=5,
    )
    project_id = create.json()["id"]
    get = requests.get(f"{BASE_URL}/projects/{project_id}", headers=_auth(token), timeout=5)
    assert get.status_code == 200
    assert get.json()["id"] == project_id


# --------------------------------------------------------------------------- #
# Uploads
# --------------------------------------------------------------------------- #

@backend_required
def test_upload_valid_zip_returns_upload_id():
    token = _register_and_login()
    zip_bytes = _make_zip()
    response = requests.post(
        f"{BASE_URL}/uploads",
        files={"file": ("demo-banking.zip", zip_bytes, "application/zip")},
        headers=_auth(token),
        timeout=10,
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert "upload_id" in body
    assert body["filename"].endswith(".zip") or body["filename"] == "demo-banking.zip"


@backend_required
def test_upload_non_zip_returns_400():
    token = _register_and_login()
    response = requests.post(
        f"{BASE_URL}/uploads",
        files={"file": ("readme.txt", b"not a zip", "text/plain")},
        headers=_auth(token),
        timeout=5,
    )
    assert response.status_code == 400, f"Expected 400 for non-ZIP, got {response.status_code}"


# --------------------------------------------------------------------------- #
# Scans
# --------------------------------------------------------------------------- #

@backend_required
def test_create_scan_stores_queued_status():
    """Core Day 1 requirement: create project → upload ZIP → create scan → status = QUEUED."""
    token = _register_and_login()

    # Step 1: create project
    project = requests.post(
        f"{BASE_URL}/projects",
        json={"name": "Scan Flow Project", "description": "Day 1 end-to-end"},
        headers=_auth(token),
        timeout=5,
    ).json()
    project_id = project["id"]

    # Step 2: upload ZIP
    upload = requests.post(
        f"{BASE_URL}/uploads",
        files={"file": ("repo.zip", _make_zip(), "application/zip")},
        headers=_auth(token),
        timeout=10,
    ).json()
    upload_id = upload["upload_id"]

    # Step 3: create scan
    scan_resp = requests.post(
        f"{BASE_URL}/scans",
        json={"project_id": project_id, "upload_id": upload_id},
        headers=_auth(token),
        timeout=5,
    )
    assert scan_resp.status_code == 201, scan_resp.text
    scan = scan_resp.json()
    assert "id" in scan
    assert scan["status"] == "QUEUED", f"Expected QUEUED, got {scan['status']}"
    assert scan["project_id"] == project_id


@backend_required
def test_get_scan_by_id():
    token = _register_and_login()
    project_id = requests.post(
        f"{BASE_URL}/projects",
        json={"name": "GetScan Project", "description": ""},
        headers=_auth(token),
        timeout=5,
    ).json()["id"]
    upload_id = requests.post(
        f"{BASE_URL}/uploads",
        files={"file": ("r.zip", _make_zip(), "application/zip")},
        headers=_auth(token),
        timeout=10,
    ).json()["upload_id"]
    scan_id = requests.post(
        f"{BASE_URL}/scans",
        json={"project_id": project_id, "upload_id": upload_id},
        headers=_auth(token),
        timeout=5,
    ).json()["id"]

    get = requests.get(f"{BASE_URL}/scans/{scan_id}", headers=_auth(token), timeout=5)
    assert get.status_code == 200
    assert get.json()["id"] == scan_id
    assert get.json()["status"] == "QUEUED"


@backend_required
def test_list_scans_returns_list():
    token = _register_and_login()
    response = requests.get(f"{BASE_URL}/scans", headers=_auth(token), timeout=5)
    assert response.status_code == 200
    assert isinstance(response.json(), list)


@backend_required
def test_cancel_scan():
    token = _register_and_login()
    project_id = requests.post(
        f"{BASE_URL}/projects",
        json={"name": "Cancel Project", "description": ""},
        headers=_auth(token),
        timeout=5,
    ).json()["id"]
    upload_id = requests.post(
        f"{BASE_URL}/uploads",
        files={"file": ("r.zip", _make_zip(), "application/zip")},
        headers=_auth(token),
        timeout=10,
    ).json()["upload_id"]
    scan_id = requests.post(
        f"{BASE_URL}/scans",
        json={"project_id": project_id, "upload_id": upload_id},
        headers=_auth(token),
        timeout=5,
    ).json()["id"]

    cancel = requests.post(f"{BASE_URL}/scans/{scan_id}/cancel", headers=_auth(token), timeout=5)
    assert cancel.status_code == 200
    assert cancel.json()["status"] == "CANCELLED"
