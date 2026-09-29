"""Integration consistency: Harshitha's Finding vs Sathwik's FindingOut API schema vs Vamsi's `findings` table.

Reads the sibling worktrees as text (no imports of their code). Blocked if a worktree is absent.
Override locations with PQC_API_SCHEMA_FILE / PQC_DB_SCHEMA_FILE.
"""
import ast
import dataclasses
import os
import re
from pathlib import Path

import pytest

from tests.conftest import REPO_ROOT, blocked

API_FILE = Path(os.getenv("PQC_API_SCHEMA_FILE", REPO_ROOT / ".worktrees/sathwik/backend/app/schemas/finding.py"))
DB_FILE = Path(os.getenv("PQC_DB_SCHEMA_FILE", REPO_ROOT / ".worktrees/vamsi/database/schema.sql"))


@pytest.fixture(scope="module")
def api():
    if not API_FILE.is_file():
        blocked(f"Sathwik's schema not found at {API_FILE}")
    tree = ast.parse(API_FILE.read_text())
    out = {"literals": {}, "fields": {}}
    for node in tree.body:
        if isinstance(node, ast.Assign) and isinstance(node.value, ast.Subscript) and "Literal" in ast.unparse(node.value):
            out["literals"][node.targets[0].id] = {ast.literal_eval(e) for e in node.value.slice.elts}
        if isinstance(node, ast.ClassDef) and node.name == "FindingOut":
            for st in node.body:
                if isinstance(st, ast.AnnAssign):
                    out["fields"][st.target.id] = ast.unparse(st.annotation)
    assert out["fields"], "FindingOut not found"
    return out


@pytest.fixture(scope="module")
def db():
    if not DB_FILE.is_file():
        blocked(f"Vamsi's schema not found at {DB_FILE}")
    sql = DB_FILE.read_text()
    m = re.search(r"CREATE TABLE `findings` \((.*?)\)\s*ENGINE", sql, re.S)
    assert m, "findings table not found"
    cols = {}
    for line in m.group(1).splitlines():
        c = re.match(r"\s*`(\w+)`\s+(ENUM\(.*?\)|[A-Z]+(?:\(\d+\))?)", line + ("" if "ENUM(" not in line else ""), re.S)
        if c:
            cols[c.group(1)] = c.group(2)
    enums = {name: set(re.findall(r"'(\w+)'", body)) for name, body in
             re.findall(r"`(\w+)` ENUM\((.*?)\)", m.group(1), re.S)}
    return {"cols": cols, "enums": enums, "sql": m.group(1)}


def test_engine_enum_matches_api_and_db(lib, api, db):
    engines = {e.value for e in lib.EngineName}
    assert engines == api["literals"]["FindingEngine"] == db["enums"]["engine"]


def test_severity_enum_matches_api_and_db(lib, api, db):
    sev = {s.value for s in lib.Severity}
    assert sev == api["literals"]["FindingSeverity"] == db["enums"]["severity"]


def test_shared_field_names_present_in_api(lib, api):
    """Names the engine emits, minus finding_id (mapped to `id` in DB, kept as finding_id in API)."""
    eng = {f.name for f in dataclasses.fields(lib.Finding)} - {"is_development"}
    missing = eng - set(api["fields"])
    assert not missing, f"engine fields absent from FindingOut: {missing}"


def test_shared_field_names_present_in_db(lib, db):
    eng = {f.name for f in dataclasses.fields(lib.Finding)} - {"is_development", "finding_id"}
    missing = eng - set(db["cols"])
    assert not missing, f"engine fields absent from findings table: {missing}"
    assert "id" in db["cols"]


@pytest.mark.xfail(reason="FINDING AE-04: Finding.confidence is float 0..1 but FindingOut.confidence is `str | None` "
                          "and findings.confidence is VARCHAR(50)", strict=False)
def test_confidence_type_agrees(lib, api, db):
    ann = api["fields"]["confidence"]
    assert "float" in ann or "int" in ann, f"API confidence is `{ann}`, engine emits float"
    assert not db["cols"]["confidence"].startswith("VARCHAR"), db["cols"]["confidence"]


@pytest.mark.xfail(reason="FINDING AE-06: Finding.is_development has no column/field in API or DB, so a DummyEngine "
                          "finding is indistinguishable from a real one once persisted", strict=False)
def test_development_flag_survives_persistence(lib, api, db):
    assert "is_development" in api["fields"] and "is_development" in db["cols"]


def test_line_number_semantics_agree(api, db):
    assert "ge=1" in API_FILE.read_text().split("line_number")[1].split("\n")[0]
    assert db["cols"]["line_number"].startswith("INT")


def test_finding_service_columns_exist_in_db(db):
    """FINDING AE-05: Sathwik's SELECT names `explanation`, Vamsi's findings table has no such column."""
    svc = REPO_ROOT / ".worktrees/sathwik/backend/app/services/finding_service.py"
    if not svc.is_file():
        blocked("finding_service.py not found")
    m = re.search(r'"SELECT (.*?) "\s*"FROM findings"', svc.read_text(), re.S)
    assert m
    cols = [c.strip() for c in re.split(r",", re.sub(r'"\s*\n\s*"', "", m.group(1)))]
    cols = [re.split(r"\s+AS\s+", c)[0].strip('" ') for c in cols]
    missing = [c for c in cols if c and c not in db["cols"]]
    assert not missing, f"finding_service selects columns missing from findings table: {missing}"
