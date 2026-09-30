"""
Day 1 QA — Findings and reports endpoint contract tests.
Author: Pushpam (QA + Cyber Security)
"""

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
    import uuid
    email = f"qa-{uuid.uuid4().hex[:8]}@pqc.example"
    password = "SecureTestPass!99"
    requests.post(f"{BASE_URL}/auth/register", json={"email": email, "password": password}, timeout=5)
    login = requests.post(f"{BASE_URL}/auth/login", json={"email": email, "password": password}, timeout=5)
    return login.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@backend_required
def test_findings_endpoint_returns_list():
    """GET /findings must return a list (empty is valid on Day 1)."""
    token = _register_and_login()
    response = requests.get(f"{BASE_URL}/findings", headers=_auth(token), timeout=5)
    assert response.status_code == 200, response.text
    assert isinstance(response.json(), list)


@backend_required
def test_findings_severity_filter_accepted():
    """Severity filter must be accepted without error."""
    token = _register_and_login()
    for sev in ("critical", "high", "medium", "low"):
        r = requests.get(f"{BASE_URL}/findings?severity={sev}", headers=_auth(token), timeout=5)
        assert r.status_code == 200, f"Severity={sev} returned {r.status_code}"


@backend_required
def test_findings_invalid_severity_returns_422():
    token = _register_and_login()
    r = requests.get(f"{BASE_URL}/findings?severity=UNKNOWN", headers=_auth(token), timeout=5)
    assert r.status_code == 422


@backend_required
def test_report_unknown_scan_returns_404():
    token = _register_and_login()
    r = requests.get(
        f"{BASE_URL}/reports/00000000-0000-0000-0000-000000000099",
        headers=_auth(token),
        timeout=5,
    )
    assert r.status_code == 404


@backend_required
def test_findings_schema_fields_present():
    """
    If findings exist, each must have the required Day 1 fields.
    If none exist, this test passes (empty list is valid for Day 1).
    """
    token = _register_and_login()
    findings = requests.get(f"{BASE_URL}/findings", headers=_auth(token), timeout=5).json()
    required_fields = {
        "finding_id", "scan_id", "engine", "severity", "title",
        "file_path", "line_number", "evidence", "confidence", "recommendation",
    }
    for f in findings:
        missing = required_fields - set(f.keys())
        assert not missing, f"Finding missing fields: {missing}"
