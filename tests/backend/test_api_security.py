"""Cross-cutting API security checks (auth enforcement, info leaks, CORS)."""
import re
import pytest
from backend_helpers import *  # noqa: F401,F403

pytestmark = pytest.mark.security
LEAK = re.compile(r'Traceback|File "/|/Users/|/home/|[A-Za-z]:\\\\|site-packages|sqlalchemy|pymysql|sqlite3?\.', re.I)
NO_AUTH = pytest.mark.xfail(reason="FINDING: no auth enforced yet", strict=False)


@NO_AUTH
@pytest.mark.parametrize("method,path", [("get", "/projects"), ("post", "/projects"),
                                         ("get", "/scans"), ("post", "/scans"),
                                         ("post", "/uploads"), ("get", "/findings")])
def test_endpoint_requires_authentication(anon_api, openapi, method, path):
    require_endpoint(openapi, method, f"{V1}{path}")
    kw = {"json": {}} if method == "post" and path != "/uploads" else {}
    r = getattr(anon_api, method)(f"{V1}{path}", **kw)
    assert r.status_code in (401, 403), f"{method.upper()} {path} unauthenticated -> {r.status_code}"


@NO_AUTH
def test_scan_get_requires_authentication(anon_api, openapi, scan):
    r = anon_api.get(f"{V1}/scans/{scan['id']}")
    assert r.status_code in (401, 403)


@NO_AUTH
def test_redis_ping_requires_authentication(anon_api, openapi):
    require_endpoint(openapi, "get", f"{V1}/redis/ping")
    assert anon_api.get(f"{V1}/redis/ping").status_code in (401, 403)


def test_openapi_docs_exposure_documented(api):
    """Informational: /docs & /openapi.json are public. Acceptable for a localhost dev app; record it."""
    assert api.get("/openapi.json").status_code in (200, 404)


@pytest.mark.parametrize("method,path,kw", [
    ("post", "/projects", {"content": b"{bad", "headers": {"Content-Type": "application/json"}}),
    ("get", "/projects/abc", {}),
    ("post", "/scans", {"json": {"project_id": 1, "upload_id": "../../etc/passwd"}}),
    ("get", "/scans/%00", {}),
    ("post", "/uploads", {"files": {"file": ("x.zip", b"junk", "application/zip")}}),
    ("get", "/nope-" + "x" * 20, {}),
])
def test_error_responses_do_not_leak_internals(api, method, path, kw):
    r = getattr(api, method)(f"{V1}{path}", **kw)
    assert r.status_code < 500, f"{r.status_code}: {r.text[:200]}"
    assert not LEAK.search(r.text), r.text[:300]


def test_not_found_project_error_is_generic(api, openapi):
    require_endpoint(openapi, "get", f"{V1}/projects/{{project_id}}")
    r = api.get(f"{V1}/projects/999999999")
    assert not LEAK.search(r.text)


def test_500_never_returns_traceback(api, openapi):
    """Force a DB-level error (overlong name) and make sure no internals are in the body."""
    require_endpoint(openapi, "post", f"{V1}/projects")
    r = api.post(f"{V1}/projects", json={"name": "A" * 5000})
    assert not LEAK.search(r.text)


def test_cors_does_not_allow_arbitrary_origin(api):
    r = api.get(f"{V1}/projects", headers={"Origin": "http://evil.example"})
    acao = r.headers.get("access-control-allow-origin")
    assert acao not in ("*", "http://evil.example"), f"ACAO={acao}"
    # Allow-Credentials without an Allow-Origin is inert (browsers ignore it), so only ACAO matters.


def test_cors_preflight_from_evil_origin_denied(api):
    r = api.options(f"{V1}/projects", headers={"Origin": "http://evil.example",
                                               "Access-Control-Request-Method": "POST"})
    assert r.headers.get("access-control-allow-origin") not in ("*", "http://evil.example")


def _preflight(api, origin, path="/projects", method="POST"):
    return api.options(f"{V1}{path}", headers={"Origin": origin, "Access-Control-Request-Method": method,
                                               "Access-Control-Request-Headers": "authorization,content-type"})


@pytest.mark.parametrize("origin", [
    "tauri://localhost",
    "http://tauri.localhost",
    "http://localhost:5173",   # devUrl in desktop/src-tauri/tauri.conf.json
    pytest.param("http://localhost:1420", marks=pytest.mark.xfail(
        reason="INFO: 1420 is the Tauri template default, but this repo's devUrl is 5173", strict=False)),
])
def test_cors_allows_desktop_origin(api, origin):
    """The desktop UI (Tauri webview or its dev server) must be able to call the API."""
    r = _preflight(api, origin)
    assert r.headers.get("access-control-allow-origin") == origin, \
        f"{origin} not allowed (status {r.status_code}, headers {dict(r.headers)})"


@pytest.mark.parametrize("origin", ["http://evil.example", "null", "http://localhost.evil.example",
                                    "https://tauri.localhost.evil.example", "tauri://localhost.evil.example"])
def test_cors_preflight_rejects_foreign_origin(api, origin):
    r = _preflight(api, origin)
    assert r.headers.get("access-control-allow-origin") not in ("*", origin)


def test_cors_no_wildcard_with_credentials(api):
    r = _preflight(api, "tauri://localhost")
    assert r.headers.get("access-control-allow-origin") != "*"


def test_responses_contain_no_absolute_paths(api, openapi, scan):
    txt = api.get(f"{V1}/scans/{scan['id']}").text + api.get(f"{V1}/scans").text[:20000]
    assert not re.search(r'"(/Users|/home|/var|/tmp|/private|[A-Za-z]:\\\\)', txt), "absolute server path in API response"


def test_security_headers_present(api):
    r = api.get(f"{V1}/projects")
    missing = [h for h in ("x-content-type-options",) if h not in r.headers]
    assert not missing, f"missing headers: {missing}"


def test_server_header_does_not_disclose_version(api):
    s = api.get(f"{V1}/projects").headers.get("server", "")
    assert not re.search(r"\d+\.\d+", s), s
