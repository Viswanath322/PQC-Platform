import re
import time
from datetime import datetime

import pytest
from backend_helpers import *  # noqa: F401,F403

S = f"{V1}/scans"
NIL = "00000000-0000-4000-8000-000000000000"


def test_create_scan_is_queued(api, openapi, project, upload):
    require_endpoint(openapi, "post", S)
    r = api.post(S, json={"project_id": project["id"], "upload_id": upload["upload_id"]})
    assert r.status_code == 201, r.text
    b = r.json()
    assert re.match(UUID_RE, b["id"])
    assert b["status"] == "QUEUED"
    assert b["project_id"] == project["id"]
    assert b["created_at"] and b["completed_at"] is None
    datetime.fromisoformat(b["created_at"])


def test_scan_response_has_no_absolute_server_path(api, openapi, scan):
    """repository_path leaks the server's absolute filesystem path."""
    require_endpoint(openapi, "post", S)
    p = scan.get("repository_path") or ""
    assert not (p.startswith("/") or re.match(r"^[A-Za-z]:\\", p)), f"absolute path leaked: {p}"


@pytest.mark.parametrize("payload", [{}, {"project_id": 1}, {"upload_id": NIL},
                                     {"project_id": "abc", "upload_id": NIL},
                                     {"project_id": None, "upload_id": NIL},
                                     {"project_id": 1, "upload_id": None},
                                     {"project_id": 1, "upload_id": 123}])
def test_create_scan_validation_422(api, openapi, payload):
    require_endpoint(openapi, "post", S)
    assert api.post(S, json=payload).status_code == 422


@pytest.mark.parametrize("bad", ["not-a-uuid", "../../etc/passwd", "..%2f..%2fetc%2fpasswd",
                                 "", "' OR 1=1--", "A" * 5000])
def test_create_scan_bad_upload_id_400(api, openapi, project, bad):
    require_endpoint(openapi, "post", S)
    r = api.post(S, json={"project_id": project["id"], "upload_id": bad})
    assert r.status_code in (400, 422), f"{bad[:30]!r} -> {r.status_code}"


def test_create_scan_unknown_upload_404(api, openapi, project):
    require_endpoint(openapi, "post", S)
    r = api.post(S, json={"project_id": project["id"], "upload_id": "12345678-1234-4234-8234-123456789abc"})
    assert r.status_code == 404


def test_create_scan_unknown_project_404(api, openapi, project, upload):
    require_endpoint(openapi, "post", S)
    r = api.post(S, json={"project_id": unknown_id_like(project["id"]), "upload_id": upload["upload_id"]})
    assert r.status_code == 404


def test_create_scan_huge_project_id_not_500(api, openapi, upload):
    require_endpoint(openapi, "post", S)
    r = api.post(S, json={"project_id": 10**30, "upload_id": upload["upload_id"]})
    assert r.status_code in (404, 422), f"got {r.status_code}"


def test_create_scan_negative_project_id(api, openapi, upload):
    require_endpoint(openapi, "post", S)
    r = api.post(S, json={"project_id": -1, "upload_id": upload["upload_id"]})
    assert r.status_code in (404, 422)


def test_two_scans_same_upload_get_distinct_ids(api, openapi, project, upload, make_scan):
    require_endpoint(openapi, "post", S)
    a = make_scan(project["id"], upload["upload_id"])
    b = make_scan(project["id"], upload["upload_id"])
    assert a["id"] != b["id"]


def test_get_scan(api, openapi, scan):
    require_endpoint(openapi, "get", f"{S}/{{scan_id}}")
    r = api.get(f"{S}/{scan['id']}")
    assert r.status_code == 200 and r.json()["id"] == scan["id"]
    assert r.json()["status"] in ALLOWED_STATUSES


def test_get_scan_unknown_404(api, openapi):
    require_endpoint(openapi, "get", f"{S}/{{scan_id}}")
    assert api.get(f"{S}/{NIL}").status_code == 404


@pytest.mark.parametrize("bad", ["123", "not-a-uuid", "%27%20OR%201%3D1", "..%2f..%2fetc%2fpasswd"])
def test_get_scan_malformed_id_is_client_error(api, openapi, bad):
    require_endpoint(openapi, "get", f"{S}/{{scan_id}}")
    assert api.get(f"{S}/{bad}").status_code in (400, 404, 422)


def test_list_scans_and_filter_by_project(api, openapi, make_project, make_upload, make_scan):
    require_endpoint(openapi, "get", S)
    p1, p2 = make_project(), make_project()
    up = make_upload()
    s1 = make_scan(p1["id"], up["upload_id"])
    s2 = make_scan(p2["id"], up["upload_id"])
    r = api.get(S, params={"project_id": p1["id"]})
    assert r.status_code == 200
    ids = {s["id"] for s in r.json()}
    assert s1["id"] in ids and s2["id"] not in ids
    assert all(s["project_id"] == p1["id"] for s in r.json())
    allids = {s["id"] for s in api.get(S).json()}
    assert {s1["id"], s2["id"]} <= allids


def test_list_scans_filter_unknown_project_empty(api, openapi, project):
    require_endpoint(openapi, "get", S)
    r = api.get(S, params={"project_id": unknown_id_like(project["id"])})
    assert r.status_code == 200 and r.json() == []


def test_list_scans_filter_type_confusion_422(api, openapi):
    require_endpoint(openapi, "get", S)
    assert api.get(S, params={"project_id": "abc"}).status_code == 422


def test_list_scans_newest_first(api, openapi, project, upload, make_scan):
    require_endpoint(openapi, "get", S)
    a = make_scan(project["id"], upload["upload_id"])
    time.sleep(0.05)
    b = make_scan(project["id"], upload["upload_id"])
    ids = [s["id"] for s in api.get(S, params={"project_id": project["id"]}).json()]
    assert ids.index(b["id"]) < ids.index(a["id"])


def test_all_listed_statuses_in_allowed_set(api, openapi, scan):
    require_endpoint(openapi, "get", S)
    for s in api.get(S).json():
        assert s["status"] in ALLOWED_STATUSES, s


def test_cancel_scan(api, openapi, scan):
    require_endpoint(openapi, "post", f"{S}/{{scan_id}}/cancel")
    r = api.post(f"{S}/{scan['id']}/cancel")
    assert r.status_code == 200, r.text
    b = r.json()
    assert b["status"] == "CANCELLED" and b["completed_at"]
    assert api.get(f"{S}/{scan['id']}").json()["status"] == "CANCELLED"


def test_cancel_twice_409(api, openapi, scan):
    require_endpoint(openapi, "post", f"{S}/{{scan_id}}/cancel")
    assert api.post(f"{S}/{scan['id']}/cancel").status_code == 200
    assert api.post(f"{S}/{scan['id']}/cancel").status_code == 409


def test_cancel_unknown_404(api, openapi):
    require_endpoint(openapi, "post", f"{S}/{{scan_id}}/cancel")
    assert api.post(f"{S}/{NIL}/cancel").status_code == 404


def test_cancel_via_get_not_allowed(api, openapi, scan):
    require_endpoint(openapi, "post", f"{S}/{{scan_id}}/cancel")
    assert api.get(f"{S}/{scan['id']}/cancel").status_code in (404, 405)


def test_cancel_does_not_touch_other_scans(api, openapi, project, upload, make_scan):
    require_endpoint(openapi, "post", f"{S}/{{scan_id}}/cancel")
    a, b = make_scan(project["id"], upload["upload_id"]), make_scan(project["id"], upload["upload_id"])
    api.post(f"{S}/{a['id']}/cancel")
    assert api.get(f"{S}/{b['id']}").json()["status"] == "QUEUED"


def test_scan_with_deleted_upload_reference_not_a_path(api, openapi, project):
    """Upload id that looks like a UUID-with-suffix must not resolve to another file."""
    require_endpoint(openapi, "post", S)
    r = api.post(S, json={"project_id": project["id"], "upload_id": f"{NIL}/../{NIL}"})
    assert r.status_code in (400, 422)
