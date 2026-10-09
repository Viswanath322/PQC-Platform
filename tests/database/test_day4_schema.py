"""
Day 4 MySQL Schema, SQLAlchemy ORM Model, and Migration Verification.
Tests 10 Core Tables, Multi-Engine Result contracts, SBOM/CBOM storage,
Scan engine_statuses, Finding rules and correlations, query indexes, and cascade deletion.
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
from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import sessionmaker

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
    ScanComponent,
)
from database.verify_db import run_day4_verification


CORE_TABLES = [
    "organizations",
    "users",
    "projects",
    "scans",
    "scan_files",
    "findings",
    "sbom_components",
    "cbom_components",
    "finding_correlations",
    "scan_components",
]

FINDINGS_DAY4_COLS = {
    "id",
    "scan_id",
    "engine",
    "category",
    "severity",
    "title",
    "file_path",
    "line_number",
    "evidence",
    "explanation",
    "confidence",
    "recommendation",
    "is_development",
    "rule_id",
    "rule_version",
    "source_engine",
    "group_key",
    "correlation_id",
    "correlation_group_id",
}

SCANS_DAY4_COLS = {
    "id",
    "project_id",
    "status",
    "repository_path",
    "error_message",
    "engine_statuses",
    "created_at",
    "started_at",
    "completed_at",
}


@pytest.fixture(scope="module")
def sqlite_engine():
    """Create in-memory SQLite database with all models created."""
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)
    yield engine
    Base.metadata.drop_all(engine)


@pytest.fixture()
def db_session(sqlite_engine):
    """Provide transactional session for test."""
    Session = sessionmaker(bind=sqlite_engine)
    session = Session()
    yield session
    session.rollback()
    session.close()


def test_orm_core_tables_declared(sqlite_engine):
    """Verify all 10 core tables are mapped in SQLAlchemy metadata."""
    inspector = inspect(sqlite_engine)
    tables = inspector.get_table_names()
    for t in CORE_TABLES:
        assert t in tables, f"Expected table '{t}' in metadata, found {tables}"


def test_findings_columns_declared():
    """Verify Finding model columns include all Day 4 fields."""
    cols = {c.name for c in Finding.__table__.columns}
    missing = FINDINGS_DAY4_COLS - cols
    assert not missing, f"Finding model missing required columns: {missing}"


def test_scans_columns_declared():
    """Verify Scan model columns include engine_statuses JSON."""
    cols = {c.name for c in Scan.__table__.columns}
    missing = SCANS_DAY4_COLS - cols
    assert not missing, f"Scan model missing required columns: {missing}"


def test_schema_sql_has_all_tables_and_indexes():
    """Verify database/schema.sql defines all 10 tables and required indexes."""
    schema_path = REPO_ROOT / "database" / "schema.sql"
    assert schema_path.exists(), "database/schema.sql missing"
    content = schema_path.read_text(encoding="utf-8")

    for t in CORE_TABLES:
        assert f"CREATE TABLE `{t}`" in content or f"CREATE TABLE {t}" in content, f"Table {t} missing in schema.sql"

    # Verify query indexes
    required_indexes = [
        "idx_findings_scan_severity",
        "idx_findings_scan_engine",
        "idx_findings_scan_category",
        "idx_findings_rule_id",
        "idx_findings_correlation_group",
        "idx_findings_group_key",
        "idx_scans_project_status",
    ]
    for idx in required_indexes:
        assert idx in content, f"Index '{idx}' missing in database/schema.sql"


def test_migrations_exist_and_idempotent():
    """Verify migrations 001, 002, 003 exist and have idempotency guards."""
    migrations_dir = REPO_ROOT / "database" / "migrations"
    assert migrations_dir.exists(), "database/migrations/ directory missing"

    for num, name in [
        ("001", "001_day1_core_schema.sql"),
        ("002", "002_day3_expansion.sql"),
        ("003", "003_day4_integration.sql"),
    ]:
        file_path = migrations_dir / name
        assert file_path.exists(), f"Migration {name} missing"
        text = file_path.read_text(encoding="utf-8")
        assert "IF NOT EXISTS" in text, f"Migration {name} missing IF NOT EXISTS idempotency guard"


def test_verify_db_script_runs_cleanly(sqlite_engine):
    """Run verify_db.py test harness against SQLite engine to validate full flow."""
    success = run_day4_verification(custom_engine=sqlite_engine)
    assert success is True


def test_cascade_delete_relationships(db_session):
    """Test full ON DELETE CASCADE tree from Scan to all child entities."""
    org = Organization(id=str(uuid.uuid4()), name="Cascade Test Org")
    proj = Project(id=str(uuid.uuid4()), organization_id=org.id, name="Cascade Test Proj")
    scan = Scan(
        id=str(uuid.uuid4()),
        project_id=proj.id,
        status="COMPLETED",
        repository_path="repo.zip",
        engine_statuses={"sast": "COMPLETED"},
    )
    db_session.add_all([org, proj, scan])
    db_session.flush()

    file = ScanFile(id=str(uuid.uuid4()), scan_id=scan.id, file_path="main.py")
    f1 = Finding(
        id=str(uuid.uuid4()),
        scan_id=scan.id,
        engine="crypto",
        severity="high",
        title="Weak Key",
        file_path="main.py",
        rule_id="RULE-1",
    )
    f2 = Finding(
        id=str(uuid.uuid4()),
        scan_id=scan.id,
        engine="sast",
        severity="medium",
        title="Info Leak",
        file_path="main.py",
        rule_id="RULE-2",
    )
    sbom = SBOMComponent(
        id=str(uuid.uuid4()),
        scan_id=scan.id,
        name="flask",
        version="2.0",
        source_file="requirements.txt",
    )
    cbom = CBOMComponent(
        id=str(uuid.uuid4()),
        scan_id=scan.id,
        algorithm="RSA",
        category="asymmetric",
        file_path="main.py",
        quantum_risk="quantum_vulnerable",
    )
    corr = FindingCorrelation(
        id=str(uuid.uuid4()),
        scan_id=scan.id,
        group_key="RULE-1:main.py",
        primary_finding_id=f1.id,
        related_finding_id=f2.id,
    )
    comp = ScanComponent(
        id=str(uuid.uuid4()),
        scan_id=scan.id,
        component_kind="dependency",
        component_type="pypi",
        name="flask",
        version="2.0",
        source_file="requirements.txt",
        detection_method="manifest_parser",
    )
    db_session.add_all([file, f1, f2, sbom, cbom, corr, comp])
    db_session.commit()

    # Verify counts before delete
    assert db_session.query(ScanFile).filter_by(scan_id=scan.id).count() == 1
    assert db_session.query(Finding).filter_by(scan_id=scan.id).count() == 2
    assert db_session.query(SBOMComponent).filter_by(scan_id=scan.id).count() == 1
    assert db_session.query(CBOMComponent).filter_by(scan_id=scan.id).count() == 1
    assert db_session.query(FindingCorrelation).filter_by(scan_id=scan.id).count() == 1
    assert db_session.query(ScanComponent).filter_by(scan_id=scan.id).count() == 1

    # Delete scan using session.delete to trigger ORM cascades
    db_session.delete(scan)
    db_session.commit()

    # Verify all children were deleted
    assert db_session.query(ScanFile).filter_by(scan_id=scan.id).count() == 0
    assert db_session.query(Finding).filter_by(scan_id=scan.id).count() == 0
    assert db_session.query(SBOMComponent).filter_by(scan_id=scan.id).count() == 0
    assert db_session.query(CBOMComponent).filter_by(scan_id=scan.id).count() == 0
    assert db_session.query(FindingCorrelation).filter_by(scan_id=scan.id).count() == 0
    assert db_session.query(ScanComponent).filter_by(scan_id=scan.id).count() == 0
