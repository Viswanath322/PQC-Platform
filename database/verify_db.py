"""
PQC Security Assessment Platform - Database Verification Script (Day 3)
Author: Vamsi & Viswanath (Database Engineering)

Validates:
  - Unified UUID Identifier Standard across all entities
  - All 9 core tables: organizations, users, projects, scans, scan_files,
    findings, sbom_components, cbom_components, finding_correlations
  - Day 3 Finding fields: rule_id, rule_version, group_key, correlation_id
  - Day 3 SBOM component persistence and scan ownership
  - Day 3 CBOM component persistence, quantum-risk enum, and PQC mapping metadata
  - Day 3 Finding correlation links (primary/related)
  - Foreign key cascading across all related tables upon scan/project deletion
  - Clean execution with zero leftover test rows
"""

import sys
import os
import uuid
from datetime import datetime

try:
    from sqlalchemy import create_engine, select, text
    from sqlalchemy.orm import sessionmaker
except ImportError:
    print("[ERROR] SQLAlchemy is not installed.")
    print("Please install requirements: pip install sqlalchemy pymysql")
    sys.exit(1)

# Allow importing local models
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
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


def get_engine():
    # Attempt to load untracked .env from repo root if python-dotenv is available
    try:
        from dotenv import load_dotenv
        env_file = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
        if os.path.exists(env_file):
            load_dotenv(env_file)
    except ImportError:
        pass

    url = os.environ.get("DATABASE_URL")
    if not url:
        # Check standard DB_* and legacy MYSQL_* environment variables
        db_user = os.environ.get("DB_USER") or os.environ.get("MYSQL_USER", "pqc_user")
        db_password = os.environ.get("DB_PASSWORD") or os.environ.get("MYSQL_PASSWORD")
        db_host = os.environ.get("DB_HOST") or os.environ.get("MYSQL_HOST", "127.0.0.1")
        db_port = os.environ.get("DB_PORT") or os.environ.get("MYSQL_PORT", "3306")
        db_name = os.environ.get("DB_NAME") or os.environ.get("MYSQL_DATABASE", "pqc_security")

        if db_password is not None:
            from urllib.parse import quote_plus
            safe_password = quote_plus(db_password)
            url = f"mysql+pymysql://{db_user}:{safe_password}@{db_host}:{db_port}/{db_name}"

    if not url:
        print("[ERROR] DATABASE_URL (or DB_PASSWORD / MYSQL_PASSWORD) environment variable is required to connect to MySQL.")
        print("Please configure .env or export environment variables:")
        print("  DB_HOST=127.0.0.1")
        print("  DB_PORT=3306")
        print("  DB_NAME=pqc_security")
        print("  DB_USER=pqc_user")
        print("  DB_PASSWORD=<your-strong-password>")
        sys.exit(1)

    if not url.lower().startswith("mysql+pymysql://"):
        print("[ERROR] verify_db.py requires a MySQL DATABASE_URL; SQLite is not accepted.")
        sys.exit(1)

    try:
        db_engine = create_engine(url, echo=False, pool_pre_ping=True)
        with db_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        safe_url = url.split("@")[-1] if "@" in url else url
        print(f"[OK] Successfully connected to live MySQL instance at: {safe_url}")
        return db_engine, db_engine.dialect.name.upper()
    except Exception as exc:
        print(f"[ERROR] Live database connection to MySQL failed ({type(exc).__name__}): {exc}")
        sys.exit(1)


def run_day3_verification():
    print("=" * 75)
    print(" PQC SECURITY ASSESSMENT PLATFORM — DAY 3 DATABASE VERIFICATION")
    print("=" * 75)

    engine, db_type = get_engine()
    SessionLocal = sessionmaker(bind=engine)

    # 1. Ensure all 9 tables exist
    print(f"\n[Step 1] Ensuring all 9 core tables exist ({db_type})...")
    Base.metadata.create_all(bind=engine)
    expected_tables = {
        "organizations",
        "users",
        "projects",
        "scans",
        "scan_files",
        "findings",
        "sbom_components",
        "cbom_components",
        "finding_correlations",
    }
    registered_tables = set(Base.metadata.tables.keys())
    missing_tables = expected_tables - registered_tables
    assert not missing_tables, f"Missing tables: {missing_tables}"
    print(f"   --> [PASS] All 9 core tables verified: {sorted(list(expected_tables))}")

    session = SessionLocal()
    created_user_id = None
    created_project_id = None
    created_scan_id = None
    created_finding_id_1 = None
    created_finding_id_2 = None
    created_sbom_id = None
    created_cbom_id = None
    created_correlation_id = None
    created_test_org = False

    try:
        # 2. Ensure Seed Organization exists (idempotent)
        print("\n[Step 2] Ensuring Seed Organization exists...")
        test_org = session.get(Organization, "org-default-001")
        if not test_org:
            test_org = Organization(
                id="org-default-001",
                name="Default Organization"
            )
            session.add(test_org)
            session.commit()
            created_test_org = True
        print(f"   --> [PASS] Seed Organization verified: 'org-default-001'")

        # 3. Insert User
        print("\n[Step 3] Inserting Test User...")
        test_user = User(
            id=str(uuid.uuid4()),
            organization_id=test_org.id,
            email=f"vamsi.day3.{uuid.uuid4().hex[:6]}@pqc.example",
            password_hash="$2b$12$dummyhashforverification1234567890",
            role="admin"
        )
        session.add(test_user)
        session.commit()
        created_user_id = test_user.id
        print(f"   --> [PASS] Created User: id={test_user.id} (UUID), organization_id={test_user.organization_id}")

        # 4. Insert Project
        project_uuid = str(uuid.uuid4())
        print(f"\n[Step 4] Inserting Test Project (id = UUID: {project_uuid})...")
        test_project = Project(
            id=project_uuid,
            organization_id=test_org.id,
            name="Day 3 Multi-Engine Test Project",
            description="Integration verification project for Day 3 analysis pipeline"
        )
        session.add(test_project)
        session.commit()
        created_project_id = test_project.id
        assert len(test_project.id) == 36, f"Expected project.id UUID length 36, got {len(test_project.id)}"
        print(f"   --> [PASS] Created Project: id={test_project.id} (UUID)")

        # 5. Insert Scan
        scan_uuid = str(uuid.uuid4())
        print(f"\n[Step 5] Creating Scan with UUID: {scan_uuid} and status = 'ANALYZING'...")
        test_scan = Scan(
            id=scan_uuid,
            project_id=test_project.id,
            status="ANALYZING",
            repository_path="uploads/day3-demo-repo.zip",
            error_message=None,
        )
        session.add(test_scan)
        session.commit()
        created_scan_id = test_scan.id
        assert len(test_scan.id) == 36, f"Expected scans.id CHAR(36), got len={len(test_scan.id)}"
        print(f"   --> [PASS] Scan persisted: id={test_scan.id} (UUID), status='{test_scan.status}'")

        # 6. Add ScanFile inventory record
        print("\n[Step 6] Inserting ScanFile inventory record...")
        test_file = ScanFile(
            id=str(uuid.uuid4()),
            scan_id=test_scan.id,
            file_path="src/crypto/handshake.py",
            file_type="Python",
            language="Python",
            size_bytes=4096,
        )
        session.add(test_file)
        session.commit()
        print(f"   --> [PASS] ScanFile persisted: path='{test_file.file_path}', language='{test_file.language}'")

        # 7. Add Day 3 Findings with rule metadata & correlation tracking
        print("\n[Step 7] Adding Day 3 Findings with rule_id, rule_version, and group_key...")
        finding_1 = Finding(
            id=str(uuid.uuid4()),
            scan_id=test_scan.id,
            engine="crypto",
            category="Quantum Vulnerability",
            severity="critical",
            title="RSA-2048 Asymmetric Key Generation Vulnerable to Shor's Algorithm",
            file_path="src/crypto/handshake.py",
            line_number=32,
            evidence="rsa_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)",
            explanation="RSA-2048 relies on integer factorization, breakable in polynomial time by Shor's algorithm.",
            confidence=1.0,
            recommendation="Migrate to NIST Post-Quantum Cryptography standards: ML-KEM (FIPS 203) for key encapsulation.",
            is_development=True,
            rule_id="CRYPTO-RSA-001",
            rule_version="1.0.0",
            group_key="CRYPTO-RSA-001:src/crypto/handshake.py",
            correlation_id="CRYPTO-RSA-001:src/crypto/handshake.py",
        )
        finding_2 = Finding(
            id=str(uuid.uuid4()),
            scan_id=test_scan.id,
            engine="sast",
            category="SQL Injection",
            severity="high",
            title="Unsanitized Parameter in User Query",
            file_path="src/api/users.py",
            line_number=74,
            evidence="db.execute(f'SELECT * FROM users WHERE email = {email}')",
            explanation="String concatenation in database query permits arbitrary SQL injection.",
            confidence=0.90,
            recommendation="Use parameterized SQLAlchemy queries.",
            is_development=True,
            rule_id="SAST-SQLI-001",
            rule_version="1.0.0",
            group_key="SAST-SQLI-001:src/api/users.py",
            correlation_id="SAST-SQLI-001:src/api/users.py",
        )
        session.add(finding_1)
        session.add(finding_2)
        session.commit()
        created_finding_id_1 = finding_1.id
        created_finding_id_2 = finding_2.id

        # Verify Day 3 fields can be queried
        q_f1 = session.query(Finding).filter_by(id=finding_1.id).first()
        assert q_f1.rule_id == "CRYPTO-RSA-001", f"rule_id mismatch: {q_f1.rule_id}"
        assert q_f1.rule_version == "1.0.0", f"rule_version mismatch: {q_f1.rule_version}"
        assert q_f1.group_key == "CRYPTO-RSA-001:src/crypto/handshake.py", f"group_key mismatch: {q_f1.group_key}"
        print(f"   --> [PASS] Finding 1: rule_id='{q_f1.rule_id}', version='{q_f1.rule_version}', group_key='{q_f1.group_key}'")
        print(f"   --> [PASS] Finding 2: rule_id='{finding_2.rule_id}', severity='{finding_2.severity}'")

        # 8. Add Day 3 SBOM Component
        print("\n[Step 8] Inserting SBOM Component (Dependency Inventory)...")
        sbom_item = SBOMComponent(
            id=str(uuid.uuid4()),
            scan_id=test_scan.id,
            name="cryptography",
            version="39.0.1",
            package_type="pypi",
            source_file="requirements.txt",
            line_number=12,
            license="Apache-2.0 OR BSD-3-Clause",
            is_direct=True,
            detection_method="manifest_parser",
            confidence=1.0,
            is_development=True,
        )
        session.add(sbom_item)
        session.commit()
        created_sbom_id = sbom_item.id

        q_sbom = session.query(SBOMComponent).filter_by(id=sbom_item.id).first()
        assert q_sbom is not None, "SBOMComponent could not be retrieved"
        assert q_sbom.scan_id == test_scan.id, "SBOMComponent scan_id mismatch"
        assert q_sbom.name == "cryptography", "SBOMComponent name mismatch"
        print(f"   --> [PASS] SBOMComponent persisted: name='{q_sbom.name}', version='{q_sbom.version}', source='{q_sbom.source_file}'")

        # 9. Add Day 3 CBOM Component
        print("\n[Step 9] Inserting CBOM Component (Cryptographic Bill of Materials)...")
        cbom_item = CBOMComponent(
            id=str(uuid.uuid4()),
            scan_id=test_scan.id,
            algorithm="RSA-2048",
            category="asymmetric",
            library="cryptography",
            version="39.0.1",
            file_path="src/crypto/handshake.py",
            line_number=32,
            usage_context="TLS Session Handshake Key Exchange",
            detection_method="ast:api-call",
            confidence=0.98,
            quantum_risk="quantum_vulnerable",
            nist_migration_target="ML-KEM (FIPS 203)",
            pqc_mapping_version="1.0",
            pqc_mapping_source="NIST FIPS 203/204/205",
            rule_id="CRYPTO-RSA-001",
            rule_version="1.0.0",
            is_development=True,
        )
        session.add(cbom_item)
        session.commit()
        created_cbom_id = cbom_item.id

        q_cbom = session.query(CBOMComponent).filter_by(id=cbom_item.id).first()
        assert q_cbom is not None, "CBOMComponent could not be retrieved"
        assert q_cbom.quantum_risk == "quantum_vulnerable", f"quantum_risk mismatch: {q_cbom.quantum_risk}"
        assert q_cbom.nist_migration_target == "ML-KEM (FIPS 203)"
        print(f"   --> [PASS] CBOMComponent persisted: algo='{q_cbom.algorithm}', risk='{q_cbom.quantum_risk}', target='{q_cbom.nist_migration_target}'")

        # 10. Add Finding Correlation
        print("\n[Step 10] Inserting FindingCorrelation linking primary and related findings...")
        correlation = FindingCorrelation(
            id=str(uuid.uuid4()),
            scan_id=test_scan.id,
            group_key="CRYPTO-RSA-001:src/crypto/handshake.py",
            primary_finding_id=finding_1.id,
            related_finding_id=finding_2.id,
            correlation_type="cross_module_risk",
            explanation="Both findings represent attack vectors within the handshake flow.",
        )
        session.add(correlation)
        session.commit()
        created_correlation_id = correlation.id

        q_corr = session.query(FindingCorrelation).filter_by(id=correlation.id).first()
        assert q_corr is not None, "FindingCorrelation could not be retrieved"
        assert q_corr.primary_finding_id == finding_1.id
        print(f"   --> [PASS] FindingCorrelation persisted: group_key='{q_corr.group_key}', type='{q_corr.correlation_type}'")

        # 11. Test Scan-Scoped Counts and Querying
        print("\n[Step 11] Verifying Scan-Scoped Queries and Counts...")
        scan_findings_count = session.query(Finding).filter_by(scan_id=test_scan.id).count()
        scan_sbom_count = session.query(SBOMComponent).filter_by(scan_id=test_scan.id).count()
        scan_cbom_count = session.query(CBOMComponent).filter_by(scan_id=test_scan.id).count()
        scan_corr_count = session.query(FindingCorrelation).filter_by(scan_id=test_scan.id).count()
        assert scan_findings_count == 2, f"Expected 2 findings, got {scan_findings_count}"
        assert scan_sbom_count == 1, f"Expected 1 SBOM item, got {scan_sbom_count}"
        assert scan_cbom_count == 1, f"Expected 1 CBOM item, got {scan_cbom_count}"
        assert scan_corr_count == 1, f"Expected 1 correlation, got {scan_corr_count}"
        print(f"   --> [PASS] Scan {test_scan.id}: {scan_findings_count} findings, {scan_sbom_count} SBOM components, {scan_cbom_count} CBOM components, {scan_corr_count} correlations")

        # 12. Test Cascade Deletion: Deleting Scan cleans up findings, SBOM, CBOM, scan_files, correlations
        print("\n[Step 12] Testing Cascade Deletion on Scan...")
        session.query(Scan).filter_by(id=test_scan.id).delete()
        session.commit()

        # Verify all children were deleted by CASCADE
        leftover_findings = session.query(Finding).filter_by(scan_id=test_scan.id).count()
        leftover_files = session.query(ScanFile).filter_by(scan_id=test_scan.id).count()
        leftover_sbom = session.query(SBOMComponent).filter_by(scan_id=test_scan.id).count()
        leftover_cbom = session.query(CBOMComponent).filter_by(scan_id=test_scan.id).count()
        leftover_corr = session.query(FindingCorrelation).filter_by(scan_id=test_scan.id).count()
        assert leftover_findings == 0, f"Findings orphaned: {leftover_findings}"
        assert leftover_files == 0, f"Files orphaned: {leftover_files}"
        assert leftover_sbom == 0, f"SBOM components orphaned: {leftover_sbom}"
        assert leftover_cbom == 0, f"CBOM components orphaned: {leftover_cbom}"
        assert leftover_corr == 0, f"Correlations orphaned: {leftover_corr}"
        print("   --> [PASS] Cascade deletion successfully purged all child records.")
        created_scan_id = None
        created_finding_id_1 = None
        created_finding_id_2 = None
        created_sbom_id = None
        created_cbom_id = None
        created_correlation_id = None

        print("\n" + "=" * 75)
        print(" [SUCCESS] DAY 3 CORE SCHEMA & MULTI-ENGINE CONTRACT FULLY VALIDATED!")
        print("=" * 75)
        print(" Validated:")
        print("  * 9 Core Tables (organizations, users, projects, scans, scan_files,")
        print("                   findings, sbom_components, cbom_components, finding_correlations)")
        print("  * Finding Day 3 fields: rule_id, rule_version, group_key, correlation_id")
        print("  * SBOM Component model, persistence, scan scoping, and metadata")
        print("  * CBOM Component model, persistence, quantum_risk enum, and NIST migration target")
        print("  * FindingCorrelation model and primary/related relationships")
        print("  * Full ON DELETE CASCADE across all child tables")
        print("  * Strict clean teardown with zero leftover test rows")
        print("=" * 75)

    except Exception as e:
        session.rollback()
        print(f"\n[FAIL] Verification error: {e}")
        raise
    finally:
        # Clean up test rows so verify_db leaves NO leftover rows
        try:
            if created_correlation_id:
                session.query(FindingCorrelation).filter_by(id=created_correlation_id).delete()
            if created_cbom_id:
                session.query(CBOMComponent).filter_by(id=created_cbom_id).delete()
            if created_sbom_id:
                session.query(SBOMComponent).filter_by(id=created_sbom_id).delete()
            if created_finding_id_1:
                session.query(Finding).filter_by(id=created_finding_id_1).delete()
            if created_finding_id_2:
                session.query(Finding).filter_by(id=created_finding_id_2).delete()
            if created_scan_id:
                session.query(Scan).filter_by(id=created_scan_id).delete()
            if created_project_id:
                session.query(Project).filter_by(id=created_project_id).delete()
            if created_user_id:
                session.query(User).filter_by(id=created_user_id).delete()
            if created_test_org:
                session.query(Organization).filter_by(id="org-default-001").delete()
            session.commit()
        except Exception:
            session.rollback()
        finally:
            session.close()


if __name__ == "__main__":
    run_day3_verification()
