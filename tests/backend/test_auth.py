"""
Day 1 QA — Authentication endpoint tests.
Author: Pushpam (QA + Cyber Security)
"""

import uuid
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


@backend_required
def test_register_new_user():
    """Registering a fresh unique email should return 201 with user data."""
    unique_email = f"qa-test-{uuid.uuid4().hex[:8]}@pqc.example"
    response = requests.post(
        f"{BASE_URL}/auth/register",
        json={"email": unique_email, "password": "SecureTestPass!99"},
        timeout=5,
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["email"] == unique_email


@backend_required
def test_register_duplicate_email_returns_409():
    """Registering the same email twice must return 409 Conflict."""
    email = f"dup-{uuid.uuid4().hex[:8]}@pqc.example"
    payload = {"email": email, "password": "SecureTestPass!99"}
    requests.post(f"{BASE_URL}/auth/register", json=payload, timeout=5)
    second = requests.post(f"{BASE_URL}/auth/register", json=payload, timeout=5)
    assert second.status_code == 409, f"Expected 409, got {second.status_code}"


@backend_required
def test_login_returns_access_token():
    """A registered user must be able to log in and receive a JWT."""
    email = f"login-{uuid.uuid4().hex[:8]}@pqc.example"
    password = "SecureTestPass!99"
    requests.post(f"{BASE_URL}/auth/register", json={"email": email, "password": password}, timeout=5)
    response = requests.post(f"{BASE_URL}/auth/login", json={"email": email, "password": password}, timeout=5)
    assert response.status_code == 200, response.text
    body = response.json()
    assert "access_token" in body, "Response must contain access_token"
    assert len(body["access_token"]) > 10


@backend_required
def test_login_wrong_password_returns_401():
    """Invalid credentials must return 401, not leak user existence."""
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": "nonexistent@pqc.example", "password": "wrongpassword"},
        timeout=5,
    )
    assert response.status_code == 401


@backend_required
def test_me_requires_auth():
    """GET /auth/me without a token must return 403 or 401."""
    response = requests.get(f"{BASE_URL}/auth/me", timeout=5)
    assert response.status_code in (401, 403)


@backend_required
def test_me_returns_current_user():
    """GET /auth/me with a valid token returns the logged-in user."""
    email = f"me-{uuid.uuid4().hex[:8]}@pqc.example"
    password = "SecureTestPass!99"
    requests.post(f"{BASE_URL}/auth/register", json={"email": email, "password": password}, timeout=5)
    login = requests.post(f"{BASE_URL}/auth/login", json={"email": email, "password": password}, timeout=5)
    token = login.json()["access_token"]
    me = requests.get(f"{BASE_URL}/auth/me", headers={"Authorization": f"Bearer {token}"}, timeout=5)
    assert me.status_code == 200, me.text
    assert me.json()["email"] == email
