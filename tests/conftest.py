"""Shared QA fixtures for the PQC Security Assessment Platform.

Tests talk to running services over the network (HTTP / MySQL / Redis) rather
than importing application code, so the same suite runs against any branch.

Environment variables:
    PQC_API_URL     FastAPI base URL        (default http://127.0.0.1:8000)
    PQC_MYSQL_URL   MySQL connection URL    (default mysql://pqc:change_me_locally@127.0.0.1:3306/pqc_security)
    PQC_REDIS_URL   Redis URL               (default redis://127.0.0.1:6379/0)
    PQC_API_TOKEN   optional bearer token for the API. Without it the suite logs in with
                    PQC_TEST_EMAIL / PQC_TEST_PASSWORD, or registers a throwaway QA user.
    PQC_INGESTION_ROOT  opt-in: directory that contains the `ingestion/` package
                        (e.g. .worktrees/hima); prepended to sys.path so tests/ingestion
                        imports the teammate's code from that checkout. Unset = not delivered.
    PQC_ANALYSIS_ROOT   opt-in: checkout that contains `analysis-engines/` (e.g. .worktrees/harshitha).
                        If it has the `analysis_engines` package facade, the checkout root goes on
                        sys.path; otherwise (older layout) its `analysis-engines/` dir does (the hyphenated dir
                        cannot be imported by name, the team README uses PYTHONPATH the same way).

A test whose target service or endpoint does not exist yet is skipped with a
reason starting with "BLOCKED:" so it is reported as Blocked, not Failed.
"""
import os
import sys
import uuid
import warnings
from pathlib import Path

import httpx
import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
FIXTURES_DIR = Path(__file__).resolve().parent / "fixtures"

API_URL = os.getenv("PQC_API_URL", "http://127.0.0.1:8000").rstrip("/")
MYSQL_URL = os.getenv("PQC_MYSQL_URL", "mysql://pqc:change_me_locally@127.0.0.1:3306/pqc_security")
REDIS_URL = os.getenv("PQC_REDIS_URL", "redis://127.0.0.1:6379/0")


def _prepend_root(var: str, sub: str = ""):
    """Opt-in: put a teammate checkout on sys.path (relative paths resolve from the repo root)."""
    raw = os.getenv(var)
    if not raw:
        return
    sys.dont_write_bytecode = True  # never dirty the teammate checkout with .pyc files
    root = Path(raw)
    root = (root if root.is_absolute() else REPO_ROOT / root).resolve()
    target = root / sub if sub and (root / sub).is_dir() else root
    if (root / "analysis_engines" / "__init__.py").is_file():
        target = root  # newer layout: importable `analysis_engines` package at the checkout root
    if str(target) not in sys.path:
        sys.path.insert(0, str(target))


_prepend_root("PQC_INGESTION_ROOT")
_prepend_root("PQC_ANALYSIS_ROOT", "analysis-engines")


def pytest_configure(config):
    config.addinivalue_line("markers", "security: security / hardening check")
    config.addinivalue_line("markers", "integration: needs several services running together")
    config.addinivalue_line("markers", "desktop: needs the Tauri desktop shell")


def blocked(reason: str):
    """Skip the current test as Blocked (dependency not delivered yet)."""
    pytest.skip(f"BLOCKED: {reason}")


def _find_path(paths: dict, suffix: str, method: str):
    for p, ops in paths.items():
        if p.rstrip("/").endswith(suffix) and "{" not in p and method in ops:
            return p
    return None


def _get_token(client: httpx.Client) -> str | None:
    """Bearer token for the QA user, or None when the backend has no auth.

    PQC_API_TOKEN wins. Otherwise PQC_TEST_EMAIL / PQC_TEST_PASSWORD are used to log in,
    and if those are unset a throwaway user is registered. Failures only warn, so the
    tests themselves show the 401 instead of erroring here.
    """
    if os.getenv("PQC_API_TOKEN"):
        return os.environ["PQC_API_TOKEN"]
    paths = client.get("/openapi.json").json().get("paths", {})
    login = _find_path(paths, "/auth/login", "post")
    if not login:
        return None
    email, password = os.getenv("PQC_TEST_EMAIL"), os.getenv("PQC_TEST_PASSWORD")
    if not (email and password):
        register = _find_path(paths, "/auth/register", "post")
        if not register:
            warnings.warn("backend has login but no register; set PQC_TEST_EMAIL/PQC_TEST_PASSWORD")
            return None
        email, password = f"qa-{uuid.uuid4().hex[:10]}@example.com", f"Qa-{uuid.uuid4().hex}!"
        r = client.post(register, json={"email": email, "password": password})
        if r.status_code not in (200, 201):
            warnings.warn(f"QA user registration failed: {r.status_code} {r.text[:200]}")
            return None
    r = client.post(login, json={"email": email, "password": password})
    token = r.json().get("access_token") if r.status_code == 200 else None
    if not token:
        warnings.warn(f"QA user login failed: {r.status_code} {r.text[:200]}")
    return token


def _client() -> httpx.Client:
    client = httpx.Client(base_url=API_URL, timeout=15)
    try:
        client.get("/openapi.json")
    except httpx.TransportError:
        blocked(f"backend not reachable at {API_URL}")
    return client


@pytest.fixture(scope="session")
def api():
    """Logged-in httpx client for the local FastAPI backend; skips if it is not running.

    On a backend without auth this is just an anonymous client.
    """
    client = _client()
    token = _get_token(client)
    if token:
        client.headers["Authorization"] = f"Bearer {token}"
    yield client
    client.close()


@pytest.fixture(scope="session")
def anon_api():
    """Client that never sends a token, for checks that a route refuses anonymous calls."""
    client = _client()
    yield client
    client.close()


@pytest.fixture(scope="session")
def openapi(api):
    """Parsed OpenAPI document of the running backend."""
    return api.get("/openapi.json").json()


def require_endpoint(openapi: dict, method: str, path: str):
    """Mark the test Blocked if `method path` is not in the backend's OpenAPI spec."""
    ops = openapi.get("paths", {}).get(path, {})
    if method.lower() not in ops:
        blocked(f"{method.upper()} {path} not implemented on this backend yet")
