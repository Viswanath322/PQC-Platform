import re
import pytest
from backend_helpers import *  # noqa: F401,F403

F, R = f"{V1}/findings", f"{V1}/reports"
FINDING_FIELDS = {"finding_id", "engine", "category", "severity", "title", "file_path",
                  "line_number", "evidence", "confidence", "recommendation"}
SEVERITIES = {"CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"}


def test_list_findings(api, openapi):
    require_endpoint(openapi, "get", F)
    r = api.get(F)
    assert r.status_code == 200 and isinstance(r.json(), list)
    for f in r.json():
        assert FINDING_FIELDS <= set(f)


def test_findings_severity_filter(api, openapi):
    require_endpoint(openapi, "get", F)
    r = api.get(F, params={"severity": "HIGH"})
    assert r.status_code == 200
    assert all(str(f["severity"]).upper() == "HIGH" for f in r.json())


def test_findings_category_filter(api, openapi):
    require_endpoint(openapi, "get", F)
    r = api.get(F, params={"category": "crypto"})
    assert r.status_code == 200
    assert all(f["category"] == "crypto" for f in r.json())


def test_findings_invalid_severity_rejected(api, openapi):
    require_endpoint(openapi, "get", F)
    assert api.get(F, params={"severity": "BANANA"}).status_code in (400, 422)


def test_findings_filter_sql_injection_inert(api, openapi):
    require_endpoint(openapi, "get", F)
    r = api.get(F, params={"category": "' OR 1=1--"})
    assert r.status_code in (200, 400, 422)
    if r.status_code == 200:
        assert r.json() == []


def test_get_finding_unknown_404(api, openapi):
    require_endpoint(openapi, "get", f"{F}/{{finding_id}}")
    assert api.get(f"{F}/does-not-exist-{uniq()}").status_code in (404, 422)


def test_get_finding_path_traversal_id(api, openapi):
    require_endpoint(openapi, "get", f"{F}/{{finding_id}}")
    r = api.get(f"{F}/..%2f..%2fetc%2fpasswd")
    assert r.status_code in (400, 404, 422)
    assert "root:" not in r.text


def test_get_finding_shape(api, openapi):
    require_endpoint(openapi, "get", f"{F}/{{finding_id}}")
    require_endpoint(openapi, "get", F)
    items = api.get(F).json()
    if not items:
        pytest.skip("no findings exist yet to fetch (needs analysis engines)")
    r = api.get(f"{F}/{items[0]['finding_id']}")
    assert r.status_code == 200 and FINDING_FIELDS <= set(r.json())


def test_report_unknown_scan_404(api, openapi):
    require_endpoint(openapi, "get", f"{R}/{{scan_id}}")
    assert api.get(f"{R}/00000000-0000-4000-8000-000000000000").status_code == 404


def test_report_malformed_scan_id(api, openapi):
    require_endpoint(openapi, "get", f"{R}/{{scan_id}}")
    assert api.get(f"{R}/..%2f..%2fetc%2fpasswd").status_code in (400, 404, 422)


def test_report_for_queued_scan_not_500(api, openapi, scan):
    require_endpoint(openapi, "get", f"{R}/{{scan_id}}")
    assert api.get(f"{R}/{scan['id']}").status_code in (200, 404, 409)
