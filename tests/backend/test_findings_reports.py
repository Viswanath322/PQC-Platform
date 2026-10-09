import re
import pytest
from backend_helpers import *  # noqa: F401,F403

F, R = f"{V1}/findings", f"{V1}/reports"
# Agreed Finding fields, plus `explanation` (added after the first contract review).
FINDING_FIELDS = {"finding_id", "engine", "category", "severity", "title", "file_path",
                  "line_number", "evidence", "explanation", "confidence", "recommendation"}
# The database ENUM is lower case; compare case-insensitively so a change of spelling is not a false failure.
SEVERITIES = {"critical", "high", "medium", "low"}
ENGINES = {"sast", "crypto", "dependency", "configuration"}
ZERO = "00000000-0000-4000-8000-000000000000"


def test_list_findings(api, openapi):
    require_endpoint(openapi, "get", F)
    r = api.get(F)
    assert r.status_code == 200 and isinstance(r.json(), list)
    for f in r.json():
        assert FINDING_FIELDS <= set(f)


def test_findings_severity_filter(api, openapi):
    require_endpoint(openapi, "get", F)
    r = api.get(F, params={"severity": "high"})
    assert r.status_code == 200, r.text
    assert all(str(f["severity"]).lower() == "high" for f in r.json())


def test_findings_category_filter(api, openapi):
    require_endpoint(openapi, "get", F)
    # Day 1 UI "category" maps to the engine field (see docs/api-findings-reports.md).
    r = api.get(F, params={"category": "crypto"})
    assert r.status_code == 200, r.text
    assert all(f["category"] == "crypto" or f.get("engine") == "crypto" for f in r.json())


def test_findings_invalid_severity_rejected(api, openapi):
    require_endpoint(openapi, "get", F)
    assert api.get(F, params={"severity": "BANANA"}).status_code in (400, 422)


def test_findings_filters_combine_and_do_not_widen(api, openapi):
    require_endpoint(openapi, "get", F)
    both = api.get(F, params={"severity": "high", "category": "sast"})
    assert both.status_code == 200, both.text
    sev = {f["finding_id"] for f in api.get(F, params={"severity": "high"}).json()}
    cat = {f["finding_id"] for f in api.get(F, params={"category": "sast"}).json()}
    assert {f["finding_id"] for f in both.json()} == sev & cat


def test_findings_invalid_category_rejected(api, openapi):
    require_endpoint(openapi, "get", F)
    assert api.get(F, params={"category": "BANANA"}).status_code in (400, 422)


@pytest.mark.parametrize("value", ["high' OR '1'='1", "high;DROP TABLE findings", "%", "high\x00"])
def test_findings_severity_injection_payloads_rejected(api, openapi, value):
    require_endpoint(openapi, "get", F)
    r = api.get(F, params={"severity": value})
    assert r.status_code in (400, 422), f"{value!r} -> {r.status_code}"


def test_findings_records_follow_contract(api, openapi):
    """Every returned finding has the agreed fields, valid enums, a UUID id and a relative path."""
    require_endpoint(openapi, "get", F)
    items = api.get(F).json()
    if not items:
        pytest.skip("no findings exist to validate (empty list is valid until engines write rows)")
    for f in items:
        assert FINDING_FIELDS <= set(f), f"missing: {FINDING_FIELDS - set(f)}"
        assert re.match(UUID_RE, f["finding_id"].lower()), f["finding_id"]
        assert str(f["severity"]).lower() in SEVERITIES
        assert str(f["engine"]).lower() in ENGINES
        assert f["title"] and f["file_path"]
        assert f["line_number"] is None or (isinstance(f["line_number"], int) and f["line_number"] >= 1)
        assert not str(f["file_path"]).startswith(("/", "\\")) and ".." not in str(f["file_path"]), f["file_path"]


def test_finding_detail_matches_list_entry(api, openapi):
    require_endpoint(openapi, "get", f"{F}/{{finding_id}}")
    items = api.get(F).json()
    if not items:
        pytest.skip("no findings exist yet")
    one = items[0]
    assert api.get(f"{F}/{one['finding_id']}").json() == one


def test_findings_list_order_is_deterministic(api, openapi):
    require_endpoint(openapi, "get", F)
    items = api.get(F).json()
    if len(items) < 2:
        pytest.skip("need at least two findings")
    # `created_at` is not part of the contract, so only check the list is stable between calls.
    assert [i["finding_id"] for i in api.get(F).json()] == [i["finding_id"] for i in items]


def test_findings_list_is_paginated(openapi):
    require_endpoint(openapi, "get", F)
    params = {p["name"] for p in openapi["paths"][F]["get"].get("parameters", [])}
    assert params & {"limit", "offset", "page", "page_size", "per_page"}


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


def test_report_unknown_uuid_is_generic_404(api, openapi):
    require_endpoint(openapi, "get", f"{R}/{{scan_id}}")
    r = api.get(f"{R}/{ZERO}")
    assert r.status_code == 404 and "Traceback" not in r.text and "sql" not in r.text.lower()


@pytest.mark.parametrize("bad", ["' OR 1=1--", "A" * 5000, "%00"])
def test_report_scan_id_injection_not_500(api, openapi, bad):
    require_endpoint(openapi, "get", f"{R}/{{scan_id}}")
    assert api.get(f"{R}/{bad}").status_code in (400, 404, 422)


def test_report_totals_match_findings(api, openapi):
    """For each scan that has findings, the report counts must equal what /findings returns."""
    require_endpoint(openapi, "get", f"{R}/{{scan_id}}")
    require_endpoint(openapi, "get", F)
    items = [f for f in api.get(F).json() if f.get("scan_id")]
    if not items:
        pytest.skip("no findings with a scan_id to reconcile")
    for sid in {f["scan_id"] for f in items}:
        r = api.get(f"{R}/{sid}")
        assert r.status_code == 200, r.text
        rep = r.json()
        # one page of /findings spans every scan, so fetch this scan on its own
        mine = api.get(F, params={"scan_id": sid, "limit": 500}).json()
        assert rep["total_findings"] == len(mine) == sum(rep["findings_by_severity"].values())
        for sev in SEVERITIES:
            assert rep["findings_by_severity"].get(sev, 0) == sum(1 for f in mine if str(f["severity"]).lower() == sev)
        assert rep["status"]


def test_report_for_queued_scan_not_500(api, openapi, scan):
    require_endpoint(openapi, "get", f"{R}/{{scan_id}}")
    assert api.get(f"{R}/{scan['id']}").status_code in (200, 404, 409)


def test_report_enriched_payload_fields(api, openapi):
    """Verify enriched report includes project_name, target_repository, and findings list."""
    require_endpoint(openapi, "get", f"{R}/{{scan_id}}")
    require_endpoint(openapi, "get", F)
    items = [f for f in api.get(F).json() if f.get("scan_id")]
    if not items:
        pytest.skip("no findings with a scan_id to test enriched report")
    sid = items[0]["scan_id"]
    r = api.get(f"{R}/{sid}")
    assert r.status_code == 200, r.text
    data = r.json()
    assert "project_name" in data and data["project_name"]
    assert "target_repository" in data and data["target_repository"]
    assert "findings" in data and isinstance(data["findings"], list)
    assert len(data["findings"]) == data["total_findings"]
    if data["findings"]:
        f = data["findings"][0]
        assert "finding_id" in f
        assert "title" in f
        assert "severity" in f
        assert "file_path" in f
        assert "explanation" in f or "description" in f


def test_findings_text_search_filter(api, openapi):
    """Verify text search filter q filters findings properly."""
    require_endpoint(openapi, "get", F)
    all_findings = api.get(F).json()
    if not all_findings:
        pytest.skip("no findings available to test search filter")
    first = all_findings[0]
    query_word = first["title"].split()[0]
    r = api.get(f"{F}?q={query_word}")
    assert r.status_code == 200, r.text
    matched = r.json()
    assert len(matched) > 0
    assert any(query_word.lower() in (m["title"] + m["file_path"] + m["explanation"]).lower() for m in matched)
