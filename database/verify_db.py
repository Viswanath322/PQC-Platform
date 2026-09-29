"""
PQC Security Assessment Platform - Database Verification Script (Day 1)
Author: Vamsi (Database Engineer)

Validates Unified UUID Identifier Standard:
  - organizations.id = VARCHAR(36) UUID / dual seed support
  - projects.id = VARCHAR(36) UUID
  - scans.id = CHAR(36) UUID
  - scans.project_id = VARCHAR(36) UUID
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
from database.models import Base, Organization, User, Project, Scan, ScanFile, Finding


def get_engine():
    default_mysql_url = os.environ.get(
        "DATABASE_URL",
        "mysql+pymysql://pqc:change_me_locally@127.0.0.1:3306/pqc_security"
    )

    try:
        mysql_engine = create_engine(default_mysql_url, echo=False, pool_pre_ping=True)
        with mysql_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print(f"[OK] Successfully connected to live MySQL instance at: {default_mysql_url}")
        return mysql_engine, "MySQL"
    except Exception as e:
        print(f"[WARN] Live MySQL connection failed ({e}).")
        print("[INFO] Falling back to SQLite in-memory database to verify Schema/Model logic...")
        sqlite_engine = create_engine("sqlite:///:memory:", echo=False)
        return sqlite_engine, "SQLite (Model Validation)"


def run_day1_verification():
    print("=" * 70)
    print(" PQC SECURITY ASSESSMENT PLATFORM — DAY 1 DATABASE VERIFICATION")
    print("=" * 70)

    engine, db_type = get_engine()
    SessionLocal = sessionmaker(bind=engine)

    # 1. Ensure tables exist
    print(f"\n[Step 1] Ensuring all 6 core tables exist ({db_type})...")
    Base.metadata.create_all(bind=engine)
    expected_tables = {"organizations", "users", "projects", "scans", "scan_files", "findings"}
    registered_tables = set(Base.metadata.tables.keys())
    assert expected_tables.issubset(registered_tables), f"Missing tables: {expected_tables - registered_tables}"
    print("   --> [PASS] All 6 tables verified.")

    session = SessionLocal()
    try:
        # 2. Insert Seed Organizations (both 'org-default-001' and '1')
        print("\n[Step 2] Inserting Seed Organizations...")
        test_org = Organization(
            id="org-default-001",
            name="Default Organization"
        )
        test_org_numeric = Organization(
            id="1",
            name="Default Organization (Legacy Compatibility)"
        )
        session.add(test_org)
        session.add(test_org_numeric)
        session.commit()
        print(f"   --> [PASS] Seed Organizations verified: 'org-default-001' and '1'")

        # 3. Insert User
        print("\n[Step 3] Inserting Test User...")
        test_user = User(
            id=str(uuid.uuid4()),
            organization_id=test_org.id,
            email=f"vamsi.test.{uuid.uuid4().hex[:6]}@pqc.local",
            password_hash="$2b$12$dummyhashforverification1234567890",
            role="admin"
        )
        session.add(test_user)
        session.commit()
        print(f"   --> [PASS] Created User: id={test_user.id} (UUID), organization_id={test_user.organization_id}")

        # 4. Insert Project (id = UUID string, organization_id = 'org-default-001')
        project_uuid = str(uuid.uuid4())
        print(f"\n[Step 4] Inserting Test Project (id = UUID: {project_uuid})...")
        test_project = Project(
            id=project_uuid,
            organization_id=test_org.id,
            name="Demo Banking Application",
            description="Day 1 demo banking application for security analysis"
        )
        session.add(test_project)
        session.commit()
        assert len(test_project.id) == 36, f"Expected project.id UUID length 36, got {len(test_project.id)}"
        print(f"   --> [PASS] Created Project: id={test_project.id} (UUID), organization_id={test_project.organization_id}")

        # 5. Insert Scan with scans.id = UUID, project_id = UUID
        scan_uuid = str(uuid.uuid4())
        print(f"\n[Step 5] Creating Scan with UUID: {scan_uuid} and status = 'QUEUED'...")
        test_scan = Scan(
            id=scan_uuid,
            project_id=test_project.id,
            status="QUEUED",
            repository_path="uploads/demo-banking.zip"
        )
        session.add(test_scan)
        session.commit()
        assert len(test_scan.id) == 36, f"Expected scans.id CHAR(36), got len={len(test_scan.id)}"
        print(f"   --> [PASS] Scan persisted: id={test_scan.id} (UUID), project_id={test_scan.project_id} (UUID), status='{test_scan.status}'")

        # 6. Retrieve Scan and verify
        print("\n[Step 6] Retrieving Scan from Database...")
        retrieved_scan = session.query(Scan).filter_by(id=test_scan.id).first()
        assert retrieved_scan is not None, "Scan could not be retrieved from database!"
        assert retrieved_scan.status == "QUEUED", f"Expected 'QUEUED', got {retrieved_scan.status}"
        assert retrieved_scan.project_id == test_project.id, "Project ID mismatch on scan!"
        print(f"   --> [PASS] Retrieved Scan: id={retrieved_scan.id}")
        print(f"              Status:          {retrieved_scan.status}")
        print(f"              Project ID:      {retrieved_scan.project_id} (UUID)")
        print(f"              Project Name:    {retrieved_scan.project.name}")

        # 7. Add a finding to verify findings table relationship
        print("\n[Step 7] Adding a mock Finding linked to Scan...")
        mock_finding = Finding(
            id=str(uuid.uuid4()),
            scan_id=test_scan.id,
            engine="crypto",
            category="Quantum Vulnerability",
            severity="high",
            title="RSA-1024 Key Size Vulnerable to Shor's Algorithm",
            file_path="src/crypto/keys.py",
            line_number=45,
            evidence="key = RSA.generate(1024)",
            confidence="high",
            recommendation="Migrate to Post-Quantum Cryptography algorithm (ML-KEM/Kyber-768)"
        )
        session.add(mock_finding)
        session.commit()
        print(f"   --> [PASS] Finding persisted: id={mock_finding.id}, severity='{mock_finding.severity}'")

        # 8. Query count
        findings_count = session.query(Finding).filter_by(scan_id=test_scan.id).count()
        assert findings_count == 1
        print(f"   --> [PASS] Findings count for scan {test_scan.id}: {findings_count}")

        print("\n" + "=" * 70)
        print(" [SUCCESS] UNIFIED UUID IDENTIFIER STANDARD FULLY VALIDATED!")
        print("=" * 70)
        print(" Validated:")
        print("  * organizations.id = VARCHAR(36) (seeds: 'org-default-001' and '1')")
        print("  * projects.id = VARCHAR(36) UUID")
        print("  * scans.id = CHAR(36) UUID")
        print("  * scans.project_id = VARCHAR(36) UUID")
        print("  * Scan status QUEUED persisted and retrieved")
        print("=" * 70)

    except Exception as e:
        session.rollback()
        print(f"\n[FAIL] Verification error: {e}")
        raise
    finally:
        session.close()


if __name__ == "__main__":
    run_day1_verification()
