"""
Day 2 QA — Scan processing endpoint tests.
Author: Pushpam (QA + Cyber Security)

Tests POST /scans/{id}/process — triggers the analysis pipeline in background.
Requires the FastAPI backend + MySQL + Redis to be running.
"""

import io
import uuid
import zipfile
import time
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


def _register_and_login() -> str:
    email = f"day2-{uuid.uuid4().hex[:8]}@pqc.example"
    password = "SecureDay2Pass!99"
    requests.post(f"{BASE_URL}/auth/register", json={"email": email, "password": password}, timeout=5)
    login = requests.post(f"{BASE_URL}/auth/login", json={"email": email, "password": password}, timeout=5)
    return login.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _make_vulnerable_zip() -> bytes:
    """Create a ZIP with known-vulnerable Python code for Day 2 analysis."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("src/auth/service.py", (
            'import hashlib\n'
            'SECRET_KEY = "hardcoded_secret_abc123"\n'
            'def login(user, pw):\n'
            '    h = hashlib.md5(pw.encode()).hexdigest()\n'
            '    return h\n'
        ))
        zf.writestr("src/api/routes.py", (
            'import subprocess\n'
            'def run_cmd(name):\n'
            '    return subprocess.check_output(f"ls {name}", shell=True)\n'
        ))
        zf.writestr("README.md", "# Test repository for Day 2 analysis\n")
        zf.writestr("requirements.txt", "flask==2.3.0\n")
    return buf.getvalue()


def _make_clean_zip() -> bytes:
    """Create a ZIP with no vulnerabilities for clean-scan test."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("src/main.py", "def add(a, b):\n    return a + b\n")
        zf.writestr("README.md", "# Clean project\n")
    return buf.getvalue()


def _create_scan(token: str, zip_bytes: bytes) -> str:
    """Helper: register → project → upload → scan → return scan_id."""
    headers = _auth(token)
    project_id = requests.post(
        f"{BASE_URL}/projects",
        json={"name": f"Day2-Test-{uuid.uuid4().hex[:6]}", "description": ""},
        headers=headers, timeout=5,
    ).json()["id"]
    upload_id = requests.post(
        f"{BASE_URL}/uploads",
        files={"file": ("repo.zip", zip_bytes, "application/zip")},
        headers=headers, timeout=10,
    ).json()["upload_id"]
    scan_id = requests.post(
        f"{BASE_URL}/scans",
        json={"project_id": project_id, "upload_id": upload_id},
        headers=headers, timeout=5,
    ).json()["id"]
    return scan_id


@backend_required
def test_process_scan_returns_202():
    token = _register_and_login()
    scan_id = _create_scan(token, _make_vulnerable_zip())
    resp = requests.post(f"{BASE_URL}/scans/{scan_id}/process", headers=_auth(token), timeout=10)
    assert resp.status_code == 202, f"Expected 202, got {resp.status_code}: {resp.text}"


@backend_required
def test_process_scan_transitions_to_completed():
    """
    After triggering /process, the scan should eventually reach COMPLETED.
    Poll for up to 30 seconds.
    """
    token = _register_and_login()
    scan_id = _create_scan(token, _make_vulnerable_zip())
    requests.post(f"{BASE_URL}/scans/{scan_id}/process", headers=_auth(token), timeout=10)

    final_status = None
    for _ in range(30):
        time.sleep(1)
        scan = requests.get(f"{BASE_URL}/scans/{scan_id}", headers=_auth(token), timeout=5).json()
        final_status = scan["status"]
        if final_status in ("COMPLETED", "FAILED", "CANCELLED"):
            break

    assert final_status == "COMPLETED", (
        f"Expected COMPLETED after processing, got {final_status}"
    )


@backend_required
def test_process_scan_produces_findings():
    """A vulnerable ZIP must produce at least one finding after processing."""
    token = _register_and_login()
    scan_id = _create_scan(token, _make_vulnerable_zip())
    requests.post(f"{BASE_URL}/scans/{scan_id}/process", headers=_auth(token), timeout=10)

    # Wait for completion
    for _ in range(30):
        time.sleep(1)
        status = requests.get(f"{BASE_URL}/scans/{scan_id}", headers=_auth(token), timeout=5).json()["status"]
        if status in ("COMPLETED", "FAILED"):
            break

    findings = requests.get(
        f"{BASE_URL}/findings?scan_id={scan_id}",
        headers=_auth(token), timeout=5,
    ).json()
    assert len(findings) > 0, f"Expected findings after scanning vulnerable repo, got 0"


@backend_required
def test_process_clean_scan_zero_findings():
    """A clean repository should complete with zero findings."""
    token = _register_and_login()
    scan_id = _create_scan(token, _make_clean_zip())
    requests.post(f"{BASE_URL}/scans/{scan_id}/process", headers=_auth(token), timeout=10)

    for _ in range(30):
        time.sleep(1)
        status = requests.get(f"{BASE_URL}/scans/{scan_id}", headers=_auth(token), timeout=5).json()["status"]
        if status in ("COMPLETED", "FAILED"):
            break

    findings = requests.get(
        f"{BASE_URL}/findings?scan_id={scan_id}",
        headers=_auth(token), timeout=5,
    ).json()
    real = [f for f in findings if not f.get("is_development", False)]
    assert len(real) == 0, f"Expected 0 real findings on clean repo, got {len(real)}"


@backend_required
def test_findings_paths_are_relative():
    """All finding file_path values must be relative — no absolute host paths."""
    token = _register_and_login()
    scan_id = _create_scan(token, _make_vulnerable_zip())
    requests.post(f"{BASE_URL}/scans/{scan_id}/process", headers=_auth(token), timeout=10)

    for _ in range(30):
        time.sleep(1)
        status = requests.get(f"{BASE_URL}/scans/{scan_id}", headers=_auth(token), timeout=5).json()["status"]
        if status in ("COMPLETED", "FAILED"):
            break

    findings = requests.get(
        f"{BASE_URL}/findings?scan_id={scan_id}",
        headers=_auth(token), timeout=5,
    ).json()
    for f in findings:
        path = f.get("file_path", "")
        assert not path.startswith("/"), f"Absolute path leaked: {path}"
        assert ":\\" not in path and ":/" not in path, f"Windows absolute path leaked: {path}"
        assert "storage" not in path.lower(), f"Storage path leaked: {path}"


@backend_required
def test_findings_evidence_no_full_secret():
    """Finding evidence must not contain full secret values."""
    token = _register_and_login()
    scan_id = _create_scan(token, _make_vulnerable_zip())
    requests.post(f"{BASE_URL}/scans/{scan_id}/process", headers=_auth(token), timeout=10)

    for _ in range(30):
        time.sleep(1)
        status = requests.get(f"{BASE_URL}/scans/{scan_id}", headers=_auth(token), timeout=5).json()["status"]
        if status in ("COMPLETED", "FAILED"):
            break

    findings = requests.get(
        f"{BASE_URL}/findings?scan_id={scan_id}",
        headers=_auth(token), timeout=5,
    ).json()
    for f in findings:
        evidence = f.get("evidence", "") or ""
        assert "hardcoded_secret_abc123" not in evidence, (
            f"Secret value leaked in evidence: {evidence}"
        )


@backend_required
def test_process_nonqueued_scan_returns_409():
    """Calling /process on a non-QUEUED scan must return 409."""
    token = _register_and_login()
    scan_id = _create_scan(token, _make_vulnerable_zip())
    # Cancel it first
    requests.post(f"{BASE_URL}/scans/{scan_id}/cancel", headers=_auth(token), timeout=5)
    resp = requests.post(f"{BASE_URL}/scans/{scan_id}/process", headers=_auth(token), timeout=5)
    assert resp.status_code == 409, f"Expected 409, got {resp.status_code}"


@backend_required
def test_report_endpoint_after_scan():
    """GET /reports/{scan_id} must return a valid report after processing."""
    token = _register_and_login()
    scan_id = _create_scan(token, _make_vulnerable_zip())
    requests.post(f"{BASE_URL}/scans/{scan_id}/process", headers=_auth(token), timeout=10)

    for _ in range(30):
        time.sleep(1)
        status = requests.get(f"{BASE_URL}/scans/{scan_id}", headers=_auth(token), timeout=5).json()["status"]
        if status in ("COMPLETED", "FAILED"):
            break

    report = requests.get(f"{BASE_URL}/reports/{scan_id}", headers=_auth(token), timeout=5)
    assert report.status_code == 200, f"Expected 200, got {report.status_code}: {report.text}"
    body = report.json()
    assert "scan_id" in body
    assert "total_findings" in body
    assert "findings_by_severity" in body
