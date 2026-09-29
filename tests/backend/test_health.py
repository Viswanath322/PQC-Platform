from backend_helpers import *  # noqa: F401,F403
from tests.conftest import blocked


def test_health_ok(api, openapi):
    require_endpoint(openapi, "get", f"{V1}/health")
    r = api.get(f"{V1}/health")
    assert r.status_code == 200
    assert r.json().get("status") in ("ok", "healthy", "OK")


def test_health_post_not_allowed(api, openapi):
    require_endpoint(openapi, "get", f"{V1}/health")
    assert api.post(f"{V1}/health").status_code == 405


def test_health_no_sensitive_info(api, openapi):
    require_endpoint(openapi, "get", f"{V1}/health")
    body = api.get(f"{V1}/health").text.lower()
    for bad in ("password", "secret", "traceback", "/users/", "mysql://"):
        assert bad not in body


def test_openapi_served_and_lists_day1_routes(openapi):
    """Contract coverage: reports which Day 1 routes exist (informational per-route tests are Blocked)."""
    paths = openapi["paths"]
    missing = [p for p in (f"{V1}/health", f"{V1}/auth/register", f"{V1}/auth/login", f"{V1}/auth/me",
                           f"{V1}/projects", f"{V1}/uploads", f"{V1}/scans", f"{V1}/findings",
                           f"{V1}/reports/{{scan_id}}") if p not in paths]
    if missing:
        blocked(f"Day 1 contract routes not yet implemented on this backend: {missing}")
