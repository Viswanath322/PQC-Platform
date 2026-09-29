"""Shared QA fixtures for the PQC Security Assessment Platform.

Tests talk to running services over the network (HTTP / MySQL / Redis) rather
than importing application code, so the same suite runs against any branch.

Environment variables:
    PQC_API_URL     FastAPI base URL        (default http://127.0.0.1:8000)
    PQC_MYSQL_URL   MySQL connection URL    (default mysql://pqc:change_me_locally@127.0.0.1:3306/pqc_security)
    PQC_REDIS_URL   Redis URL               (default redis://127.0.0.1:6379/0)
    PQC_INGESTION_ROOT  opt-in: directory that contains the `ingestion/` package
                        (e.g. .worktrees/hima); prepended to sys.path so tests/ingestion
                        imports the teammate's code from that checkout. Unset = not delivered.
    PQC_ANALYSIS_ROOT   opt-in: checkout that contains `analysis-engines/` (e.g. .worktrees/harshitha);
                        its `analysis-engines/` dir is prepended to sys.path (the hyphenated dir
                        cannot be imported by name, the team README uses PYTHONPATH the same way).

A test whose target service or endpoint does not exist yet is skipped with a
reason starting with "BLOCKED:" so it is reported as Blocked, not Failed.
"""
import os
import sys
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


@pytest.fixture(scope="session")
def api():
    """httpx client for the local FastAPI backend; skips if it is not running."""
    client = httpx.Client(base_url=API_URL, timeout=15)
    try:
        client.get("/openapi.json")
    except httpx.TransportError:
        blocked(f"backend not reachable at {API_URL}")
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
