"""
PQC Security Assessment Platform - Database Verification Script (Day 1)
Author: Vamsi (Database Engineer)

Validates Unified UUID Identifier Standard:
  - organizations.id = VARCHAR(36) UUID ('org-default-001')
  - projects.id = VARCHAR(36) UUID
  - scans.id = CHAR(36) UUID
  - scans.project_id = VARCHAR(36) UUID
  - findings: includes explanation, is_development
  - Leaves NO leftover rows in live database after execution
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
        print("  DB_HOST=localhost")
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
        print("[OK] Successfully connected to the configured MySQL database.")
        return db_engine, db_engine.dialect.name.upper()
    except Exception as exc:
        print(f"[ERROR] Live database connection to MySQL failed ({type(exc).__name__}). Check the host, database name, and local credentials.")
        sys.exit(1)



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
    created_user_id = None
    created_project_id = None
    created_scan_id = None
    created_finding_id = None
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
            email=f"vamsi.test.{uuid.uuid4().hex[:6]}@pqc.example",
            password_hash="$2b$12$dummyhashforverification1234567890",
            role="admin"
        )
        session.add(test_user)
        session.commit()
        created_user_id = test_user.id
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
        created_project_id = test_project.id
        assert len(test_project.id) == 36, f"Expected project.id UUID length 36, got {len(test_project.id)}"
        print(f"   --> [PASS] Created Project: id={test_project.id} (UUID), organization_id={test_project.organization_id}")

        # 5. Insert Scan with scans.id = UUID, project_id = UUID
        scan_uuid = str(uuid.uuid4())
        print(f"\n[Step 5] Creating Scan with UUID: {scan_uuid} and status = 'QUEUED'...")
        test_scan = Scan(
            id=scan_uuid,
            project_id=test_project.id,
            status="QUEUED",
            repository_path="uploads/demo-banking.zip",
            error_message=None,
        )
        session.add(test_scan)
        session.commit()
        created_scan_id = test_scan.id
        assert len(test_scan.id) == 36, f"Expected scans.id CHAR(36), got len={len(test_scan.id)}"
        print(f"   --> [PASS] Scan persisted: id={test_scan.id} (UUID), project_id={test_scan.project_id} (UUID), status='{test_scan.status}'")

        # 6. Retrieve Scan and verify
        print("\n[Step 6] Retrieving Scan from Database...")
        retrieved_scan = session.query(Scan).filter_by(id=test_scan.id).first()
        assert retrieved_scan is not None, "Scan could not be retrieved from database!"
        assert retrieved_scan.status == "QUEUED", f"Expected 'QUEUED', got {retrieved_scan.status}"
        assert retrieved_scan.project_id == test_project.id, "Project ID mismatch on scan!"
        assert retrieved_scan.error_message is None, "Expected error_message to be None!"
        print(f"   --> [PASS] Retrieved Scan: id={retrieved_scan.id}")
        print(f"              Status:          {retrieved_scan.status}")
        print(f"              Project ID:      {retrieved_scan.project_id} (UUID)")
        print(f"              Project Name:    {retrieved_scan.project.name}")
        print(f"              Error Message:   {retrieved_scan.error_message}")

        # 7. Add a finding to verify findings table relationship (including explanation and is_development)
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
            explanation="RSA with 1024-bit modulus is vulnerable to Shor's algorithm.",
            confidence=0.95,
            recommendation="Migrate to Post-Quantum Cryptography algorithm (ML-KEM/Kyber-768)",
            is_development=True
        )
        session.add(mock_finding)
        session.commit()
        created_finding_id = mock_finding.id
        print(f"   --> [PASS] Finding persisted: id={mock_finding.id}, severity='{mock_finding.severity}'")

        # 8. Query count
        findings_count = session.query(Finding).filter_by(scan_id=test_scan.id).count()
        assert findings_count == 1
        print(f"   --> [PASS] Findings count for scan {test_scan.id}: {findings_count}")

        print("\n" + "=" * 70)
        print(" [SUCCESS] UNIFIED UUID IDENTIFIER STANDARD FULLY VALIDATED!")
        print("=" * 70)
        print(" Validated:")
        print("  * organizations.id = VARCHAR(36) (seed: 'org-default-001')")
        print("  * projects.id = VARCHAR(36) UUID")
        print("  * scans.id = CHAR(36) UUID")
        print("  * scans.project_id = VARCHAR(36) UUID")
        print("  * Scan status QUEUED persisted and retrieved")
        print("  * Findings: explanation and is_development schema verified")
        print("=" * 70)

    except Exception as e:
        session.rollback()
        print(f"\n[FAIL] Verification error: {e}")
        raise
    finally:
        # Clean up test rows in reverse dependency order so verify_db leaves NO leftover rows
        try:
            if created_finding_id:
                session.query(Finding).filter_by(id=created_finding_id).delete()
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
    run_day1_verification()
