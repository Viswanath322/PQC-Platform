"""
Day 1 QA — Backend health endpoint tests.
Author: Pushpam (QA + Cyber Security)

These tests verify the FastAPI health endpoint responds correctly.
They call the live backend at http://127.0.0.1:8000. Mark as BLOCKED if
the backend is not running.
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


@backend_required
def test_health_returns_200():
    response = requests.get(f"{BASE_URL}/health", timeout=5)
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"


@backend_required
def test_health_returns_healthy_status():
    response = requests.get(f"{BASE_URL}/health", timeout=5)
    body = response.json()
    assert "status" in body, "Response must have a 'status' field"
    assert body["status"] in ("healthy", "ok"), f"Unexpected status value: {body['status']}"


@backend_required
def test_health_response_is_json():
    response = requests.get(f"{BASE_URL}/health", timeout=5)
    assert response.headers.get("content-type", "").startswith("application/json")


@backend_required
def test_health_cors_header_present():
    """The desktop UI calls this from a different origin — CORS must be enabled."""
    response = requests.get(
        f"{BASE_URL}/health",
        headers={"Origin": "http://localhost:5173"},
        timeout=5,
    )
    assert response.status_code == 200
    # FastAPI only sends ACAO for configured origins
    acao = response.headers.get("access-control-allow-origin", "")
    assert acao in ("http://localhost:5173", "*"), (
        f"Expected CORS header for localhost:5173, got: '{acao}'"
    )
