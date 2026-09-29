import re

import pytest
from backend_helpers import *  # noqa: F401,F403

P = f"{V1}/projects"


def test_create_project(api, openapi):
    require_endpoint(openapi, "post", P)
    name = uniq("proj")
    r = api.post(P, json={"name": name, "description": "d"})
    assert r.status_code == 201, r.text
    b = r.json()
    assert isinstance(b["id"], (int, str)) and b["name"] == name and b["description"] == "d"
    assert b["created_at"]


def test_project_id_is_uuid_string(api, openapi, project):
    """Agreed contract (INT-01): ids are UUID strings, same as VARCHAR(36) in the MySQL schema."""
    require_endpoint(openapi, "post", P)
    assert isinstance(project["id"], str) and re.match(UUID_RE, project["id"].lower()), project["id"]


def test_project_ids_are_unique_and_not_guessable(api, openapi, make_project):
    require_endpoint(openapi, "post", P)
    ids = [make_project()["id"] for _ in range(5)]
    assert len(set(ids)) == 5
    assert not all(isinstance(i, int) for i in ids), "sequential integer ids are enumerable"


def test_create_project_without_description(api, openapi):
    require_endpoint(openapi, "post", P)
    r = api.post(P, json={"name": uniq("proj")})
    assert r.status_code == 201
    assert r.json()["description"] is None


@pytest.mark.parametrize("payload", [{}, {"description": "x"}, {"name": None}, {"name": 123},
                                     {"name": ["a"]}, {"name": {"a": 1}}])
def test_create_project_validation_422(api, openapi, payload):
    require_endpoint(openapi, "post", P)
    assert api.post(P, json=payload).status_code == 422


def test_create_project_invalid_json_body(api, openapi):
    require_endpoint(openapi, "post", P)
    r = api.post(P, content=b"{not json", headers={"Content-Type": "application/json"})
    assert r.status_code == 422


def test_create_project_empty_name_rejected(api, openapi):
    require_endpoint(openapi, "post", P)
    r = api.post(P, json={"name": ""})
    assert r.status_code == 422, f"empty name accepted: {r.status_code} {r.text}"


def test_create_project_whitespace_name_rejected(api, openapi):
    require_endpoint(openapi, "post", P)
    r = api.post(P, json={"name": "   "})
    assert r.status_code == 422, f"whitespace-only name accepted: {r.status_code}"


def test_create_project_overlong_name_rejected(api, openapi):
    """DB column is String(255); anything longer must be a 422, never a 500."""
    require_endpoint(openapi, "post", P)
    r = api.post(P, json={"name": "A" * 300})
    assert r.status_code == 422, f"300-char name -> {r.status_code}"


def test_create_project_huge_description_rejected(api, openapi):
    require_endpoint(openapi, "post", P)
    r = api.post(P, json={"name": uniq("proj"), "description": "D" * 2_000_000})
    assert r.status_code in (413, 422), f"2MB description -> {r.status_code}"


def test_create_project_unicode_and_markup_roundtrip(api, openapi):
    require_endpoint(openapi, "post", P)
    name = uniq("proj") + " ☃ <script>alert(1)</script>"
    r = api.post(P, json={"name": name})
    assert r.status_code == 201
    got = api.get(f"{P}/{r.json()['id']}").json()
    assert got["name"] == name  # stored verbatim (UI must escape on render)


def test_sql_injection_in_name_is_inert(api, openapi):
    require_endpoint(openapi, "post", P)
    r = api.post(P, json={"name": "x'); DROP TABLE projects;--"})
    assert r.status_code == 201
    assert api.get(P).status_code == 200


def test_get_project(api, openapi, project):
    require_endpoint(openapi, "get", f"{P}/{{project_id}}")
    r = api.get(f"{P}/{project['id']}")
    assert r.status_code == 200 and r.json()["id"] == project["id"]


def test_get_project_unknown_404(api, openapi, project):
    require_endpoint(openapi, "get", f"{P}/{{project_id}}")
    assert api.get(f"{P}/{unknown_id_like(project['id'])}").status_code == 404


@pytest.mark.parametrize("bad", ["abc", "1.5", "-", "null", "%27%20OR%201%3D1", "0x10"])
def test_get_project_type_confusion_422(api, openapi, bad):
    require_endpoint(openapi, "get", f"{P}/{{project_id}}")
    assert api.get(f"{P}/{bad}").status_code == 422


def test_get_project_huge_int_not_500(api, openapi):
    require_endpoint(openapi, "get", f"{P}/{{project_id}}")
    r = api.get(f"{P}/{10**30}")
    assert r.status_code in (404, 422), f"got {r.status_code}"


def test_list_projects_newest_first_and_contains_new(api, openapi, make_project):
    require_endpoint(openapi, "get", P)
    a, b = make_project(), make_project()
    r = api.get(P)
    assert r.status_code == 200
    ids = [p["id"] for p in r.json()]
    assert ids.index(b["id"]) < ids.index(a["id"])


def test_projects_method_not_allowed(api, openapi):
    require_endpoint(openapi, "get", P)
    assert api.delete(P).status_code == 405
