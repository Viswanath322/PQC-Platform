"""
Day 3 MySQL Schema and SQLAlchemy ORM Model Verification.
Tests multi-engine results, SBOM dependency components, CBOM crypto components,
and finding correlations.
"""

import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))
BACKEND_DIR = REPO_ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import uuid
import pytest
from dbenv import blocked
from database.models import (
    Base,
    Organization,
    User,
    Project,
    Scan,
    ScanFile,
    Finding,
    SBOMComponent,
    CBOMComponent,
    FindingCorrelation,
)

from sqlalchemy.orm import Session


DAY3_TABLES = ["sbom_components", "cbom_components", "finding_correlations"]
DAY3_FINDING_COLS = {"rule_id", "rule_version", "group_key", "correlation_id"}
QUANTUM_RISK_VALUES = {"quantum_vulnerable", "weakened", "safe", "deprecated", "unknown"}


def uid():
    return str(uuid.uuid4())


@pytest.fixture()
def cols(q):
    def get(t):
        return {r["COLUMN_NAME"]: r for r in q(
            "SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=%s", (t,))}
    return get


@pytest.fixture()
def org(run):
    oid = uid()
    run("INSERT INTO organizations (id, name) VALUES (%s, 'QA-DAY3-ORG')", (oid,))
    yield oid
    run("DELETE FROM organizations WHERE id=%s", (oid,))


@pytest.fixture()
def project(run, org):
    pid = uid()
    run("INSERT INTO projects (id, organization_id, name) VALUES (%s, %s, 'QA-DAY3-PROJ')", (pid, org))
    yield pid
    run("DELETE FROM projects WHERE id=%s", (pid,))


@pytest.fixture()
def scan(run, project):
    sid = uid()
    run("INSERT INTO scans (id, project_id, status, repository_path) VALUES (%s, %s, 'ANALYZING', 'uploads/qa.zip')", (sid, project))
    yield sid
    run("DELETE FROM scans WHERE id=%s", (sid,))


@pytest.mark.parametrize("t", DAY3_TABLES)
def test_day3_tables_exist_and_utf8mb4(q, t):
    r = q("SELECT TABLE_COLLATION c, ENGINE e FROM information_schema.TABLES "
          "WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=%s", (t,))
    assert r, f"Day 3 table {t} missing"
    assert r[0]["c"].startswith("utf8mb4"), r[0]
    assert r[0]["e"] == "InnoDB"


def test_findings_table_has_day3_columns(cols):
    finding_cols = set(cols("findings").keys())
    missing = DAY3_FINDING_COLS - finding_cols
    assert not missing, f"findings table missing Day 3 columns: {missing}"


@pytest.mark.parametrize("t", DAY3_TABLES)
def test_day3_tables_pk_is_id(q, t):
    r = q("SELECT COLUMN_NAME c FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() "
          "AND TABLE_NAME=%s AND CONSTRAINT_NAME='PRIMARY'", (t,))
    assert [x["c"] for x in r] == ["id"], f"Table {t} primary key is not 'id'"


def test_day3_foreign_keys_declared(q):
    expected_fks = [
        ("sbom_components", "scan_id", "scans"),
        ("cbom_components", "scan_id", "scans"),
        ("finding_correlations", "scan_id", "scans"),
        ("finding_correlations", "primary_finding_id", "findings"),
        ("finding_correlations", "related_finding_id", "findings"),
    ]
    for child, col, parent in expected_fks:
        r = q("SELECT 1 FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=%s "
              "AND COLUMN_NAME=%s AND REFERENCED_TABLE_NAME=%s", (child, col, parent))
        assert r, f"Missing FK {child}.{col} -> {parent}"


def test_cbom_quantum_risk_enum(cols):
    col = cols("cbom_components")["quantum_risk"]
    ctype = col["COLUMN_TYPE"].lower()
    assert ctype.startswith("enum"), f"quantum_risk is not an enum: {ctype}"
    import re
    enum_vals = set(re.findall(r"'([a-z_]+)'", ctype))
    assert QUANTUM_RISK_VALUES.issubset(enum_vals), f"Missing quantum risk enum values: {QUANTUM_RISK_VALUES - enum_vals}"


def test_sbom_component_roundtrip(run, q, scan):
    sbom_id = uid()
    run(
        "INSERT INTO sbom_components (id, scan_id, name, version, package_type, source_file, line_number) "
        "VALUES (%s, %s, 'cryptography', '41.0.1', 'pypi', 'requirements.txt', 15)",
        (sbom_id, scan),
    )
    rows = q("SELECT name, version, source_file FROM sbom_components WHERE id=%s", (sbom_id,))
    assert len(rows) == 1
    assert rows[0]["name"] == "cryptography"
    assert rows[0]["version"] == "41.0.1"


def test_cbom_component_roundtrip(run, q, scan):
    cbom_id = uid()
    run(
        "INSERT INTO cbom_components (id, scan_id, algorithm, category, `library`, version, file_path, line_number, "
        "detection_method, quantum_risk, nist_migration_target, pqc_mapping_version, pqc_mapping_source, rule_id, rule_version) "
        "VALUES (%s, %s, 'RSA-2048', 'asymmetric', 'cryptography', '41.0.1', 'crypto.py', 42, "
        "'ast:api-call', 'quantum_vulnerable', 'ML-KEM (FIPS 203)', '1.0', 'NIST FIPS 203/204/205', 'CRYPTO-RSA-001', '1.0')",
        (cbom_id, scan),
    )
    rows = q("SELECT algorithm, quantum_risk, nist_migration_target FROM cbom_components WHERE id=%s", (cbom_id,))
    assert len(rows) == 1
    assert rows[0]["algorithm"] == "RSA-2048"
    assert rows[0]["quantum_risk"] == "quantum_vulnerable"
    assert rows[0]["nist_migration_target"] == "ML-KEM (FIPS 203)"


def test_finding_correlation_roundtrip(run, q, scan):
    f1, f2 = uid(), uid()
    run("INSERT INTO findings (id, scan_id, engine, severity, title, file_path, rule_id, group_key) "
        "VALUES (%s, %s, 'crypto', 'high', 'RSA weak', 'a.py', 'CRYPTO-RSA-001', 'grp-1')", (f1, scan))
    run("INSERT INTO findings (id, scan_id, engine, severity, title, file_path, rule_id, group_key) "
        "VALUES (%s, %s, 'crypto', 'high', 'RSA weak 2', 'b.py', 'CRYPTO-RSA-001', 'grp-1')", (f2, scan))
    
    corr_id = uid()
    run("INSERT INTO finding_correlations (id, scan_id, group_key, primary_finding_id, related_finding_id, correlation_type) "
        "VALUES (%s, %s, 'grp-1', %s, %s, 'duplicate_or_variant')", (corr_id, scan, f1, f2))
    
    rows = q("SELECT group_key, primary_finding_id, related_finding_id FROM finding_correlations WHERE id=%s", (corr_id,))
    assert len(rows) == 1
    assert rows[0]["group_key"] == "grp-1"
    assert rows[0]["primary_finding_id"] == f1
    assert rows[0]["related_finding_id"] == f2


def test_scan_delete_cascades_to_day3_tables(run, q, project):
    sid = uid()
    run("INSERT INTO scans (id, project_id, status, repository_path) VALUES (%s, %s, 'COMPLETED', 'uploads/qa.zip')", (sid, project))
    
    f1 = uid()
    run("INSERT INTO findings (id, scan_id, engine, severity, title, file_path) VALUES (%s, %s, 'sast', 'low', 't', 'f')", (f1, sid))
    f2 = uid()
    run("INSERT INTO findings (id, scan_id, engine, severity, title, file_path) VALUES (%s, %s, 'sast', 'low', 't2', 'f2')", (f2, sid))
    
    run("INSERT INTO sbom_components (id, scan_id, name, source_file) VALUES (%s, %s, 'flask', 'req.txt')", (uid(), sid))
    run("INSERT INTO cbom_components (id, scan_id, algorithm, category, file_path, detection_method, quantum_risk) VALUES (%s, %s, 'AES', 'symmetric', 'f.py', 'engine', 'safe')", (uid(), sid))
    run("INSERT INTO finding_correlations (id, scan_id, group_key, primary_finding_id, related_finding_id) VALUES (%s, %s, 'grp', %s, %s)", (uid(), sid, f1, f2))

    # Delete scan
    run("DELETE FROM scans WHERE id=%s", (sid,))
    
    for t in ("findings", "sbom_components", "cbom_components", "finding_correlations"):
        assert q(f"SELECT COUNT(*) n FROM {t} WHERE scan_id=%s", (sid,))[0]["n"] == 0, f"{t} orphaned after scan delete"
