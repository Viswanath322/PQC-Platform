"""
PQC Security Assessment Platform - Database Verification Script (Day 4 Integration)
Author: Vamsi (Database Engineer - Person 10)

Validates Unified UUID Identifier Standard and Day 4 Multi-Engine Schema:
  - 10 Core Tables: organizations, users, projects, scans, scan_files, findings,
                    sbom_components, cbom_components, finding_correlations, scan_components
  - scans: status ENUM, repository_path, engine_statuses JSON
  - findings: rule_id, rule_version, source_engine, group_key, correlation_id, correlation_group_id
  - sbom_components: package_type, version, license, source_file, line_number
  - cbom_components: algorithm, quantum_risk ENUM, nist_migration_target, library
  - scan_components: unified component storage (dependency / crypto) with metadata_json
  - finding_correlations: primary/related finding links
  - ON DELETE CASCADE across all child tables
  - Leaves NO leftover rows in live database after execution
"""

import os
import sys
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
    ScanComponent,
)


def get_engine():
    try:
        from dotenv import load_dotenv
        env_file = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
        if os.path.exists(env_file):
            load_dotenv(env_file)
    except ImportError:
        pass

    url = os.environ.get("DATABASE_URL") or os.environ.get("PQC_MYSQL_URL")
    if not url:
        db_user = os.environ.get("DB_USER") or os.environ.get("MYSQL_USER", "pqc")
        db_password = os.environ.get("DB_PASSWORD") or os.environ.get("MYSQL_PASSWORD", "pqc_dev_pass_123")
        db_host = os.environ.get("DB_HOST") or os.environ.get("MYSQL_HOST", "127.0.0.1")
        db_port = os.environ.get("DB_PORT") or os.environ.get("MYSQL_PORT", "3306")
        db_name = os.environ.get("DB_NAME") or os.environ.get("MYSQL_DATABASE", "pqc_security")

        if db_password is not None:
            from urllib.parse import quote_plus
            safe_password = quote_plus(db_password)
            url = f"mysql+pymysql://{db_user}:{safe_password}@{db_host}:{db_port}/{db_name}"

    if not url:
        raise ValueError("DATABASE_URL or MYSQL connection parameters not configured.")

    return create_engine(url, pool_pre_ping=True)


def run_day4_verification(custom_engine=None):
    engine = custom_engine or get_engine()
    Session = sessionmaker(bind=engine)
    session = Session()

    print("=" * 75)
    print(" PQC PLATFORM — DAY 4 DATABASE VERIFICATION RUNNER")
    print(f" Target Database: {engine.url.database} on {engine.url.host or 'local'}")
    print("=" * 75)

    created_test_org = False
    created_user_id = None
    created_project_id = None
    created_scan_id = None
    created_file_id = None
    created_finding_id_1 = None
    created_finding_id_2 = None
    created_sbom_id = None
    created_cbom_id = None
    created_correlation_id = None
    created_component_id = None

    try:
        # 1. Organization
        print("\n[Step 1] Verifying Default Organization ('org-default-001')...")
        default_org = session.query(Organization).filter_by(id="org-default-001").first()
        if not default_org:
            print("   -> Creating temporary test organization 'org-default-001'...")
            default_org = Organization(id="org-default-001", name="Default Organization")
            session.add(default_org)
            session.commit()
            created_test_org = True
        print(f"   --> [PASS] Organization verified: {default_org}")

        # 2. User
        print("\n[Step 2] Inserting and validating Test User (UUID PK)...")
        test_user = User(
            id=str(uuid.uuid4()),
            organization_id=default_org.id,
            email=f"vamsi_day4_test_{uuid.uuid4().hex[:6]}@pqc.example",
            password_hash="$argon2id$v=19$m=65536,t=3,p=4$dummyhash",
            role="admin",
        )
        session.add(test_user)
        session.commit()
        created_user_id = test_user.id
        print(f"   --> [PASS] User created with UUID: {test_user.id}")

        # 3. Project
        print("\n[Step 3] Inserting and validating Project (UUID PK)...")
        test_project = Project(
            id=str(uuid.uuid4()),
            organization_id=default_org.id,
            name="Day 4 Integration Test Project",
            description="Verification suite project for Day 4 multi-engine contracts",
        )
        session.add(test_project)
        session.commit()
        created_project_id = test_project.id
        print(f"   --> [PASS] Project created with UUID: {test_project.id}")

        # 4. Scan
        print("\n[Step 4] Inserting and validating Scan with engine_statuses JSON...")
        test_scan = Scan(
            id=str(uuid.uuid4()),
            project_id=test_project.id,
            status="ANALYZING",
            repository_path="storage/uploads/test-day4-repo.zip",
            engine_statuses={
                "sast": "COMPLETED",
                "crypto": "ANALYZING",
                "dependency": "QUEUED",
                "configuration": "QUEUED",
            },
        )
        session.add(test_scan)
        session.commit()
        created_scan_id = test_scan.id
        q_scan = session.query(Scan).filter_by(id=test_scan.id).first()
        assert q_scan is not None, "Scan record not found"
        assert q_scan.status == "ANALYZING"
        print(f"   --> [PASS] Scan created with status '{q_scan.status}' and engine_statuses: {q_scan.engine_statuses}")

        # 5. ScanFile
        print("\n[Step 5] Inserting ScanFile...")
        scan_file = ScanFile(
            id=str(uuid.uuid4()),
            scan_id=test_scan.id,
            file_path="src/crypto/handshake.py",
            file_type="source",
            language="python",
            size_bytes=4096,
        )
        session.add(scan_file)
        session.commit()
        created_file_id = scan_file.id
        print(f"   --> [PASS] ScanFile created: {scan_file.file_path}")

        # 6. Findings
        print("\n[Step 6] Inserting Findings with Day 4 rule and correlation fields...")
        finding_1 = Finding(
            id=str(uuid.uuid4()),
            scan_id=test_scan.id,
            engine="crypto",
            category="asymmetric",
            severity="high",
            title="RSA-2048 Deprecated under Quantum Threat",
            file_path="src/crypto/handshake.py",
            line_number=32,
            evidence="crypto_cipher_init(RSA, 2048)",
            explanation="RSA key exchange is vulnerable to Shor's algorithm.",
            confidence=0.95,
            recommendation="Migrate to ML-KEM (FIPS 203).",
            is_development=False,
            rule_id="CRYPTO-RSA-001",
            rule_version="1.0.0",
            source_engine="crypto",
            group_key="CRYPTO-RSA-001:src/crypto/handshake.py",
            correlation_id="corr-handshake-01",
            correlation_group_id="00000000-0000-0000-0005-000000000001",
        )
        finding_2 = Finding(
            id=str(uuid.uuid4()),
            scan_id=test_scan.id,
            engine="sast",
            category="injection",
            severity="critical",
            title="SQL Injection Vulnerability",
            file_path="src/api/auth.py",
            line_number=88,
            evidence="query = f'SELECT * FROM accounts WHERE id={id}'",
            explanation="Unsanitized string interpolation directly in SQL query.",
            confidence=0.99,
            recommendation="Use parameterized prepared statements.",
            is_development=False,
            rule_id="SAST-SQLI-001",
            rule_version="1.0.0",
            source_engine="sast",
            group_key="SAST-SQLI-001:src/api/auth.py",
            correlation_id=None,
            correlation_group_id=None,
        )
        session.add_all([finding_1, finding_2])
        session.commit()
        created_finding_id_1 = finding_1.id
        created_finding_id_2 = finding_2.id

        q_f1 = session.query(Finding).filter_by(id=finding_1.id).first()
        assert q_f1.rule_id == "CRYPTO-RSA-001"
        assert q_f1.source_engine == "crypto"
        assert q_f1.correlation_group_id == "00000000-0000-0000-0005-000000000001"
        print(f"   --> [PASS] Findings persisted: rule_id='{q_f1.rule_id}', source_engine='{q_f1.source_engine}'")

        # 7. SBOMComponent
        print("\n[Step 7] Inserting SBOMComponent...")
        sbom_item = SBOMComponent(
            id=str(uuid.uuid4()),
            scan_id=test_scan.id,
            name="cryptography",
            version="41.0.3",
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
        print(f"   --> [PASS] SBOMComponent persisted: name='{sbom_item.name}', version='{sbom_item.version}'")

        # 8. CBOMComponent
        print("\n[Step 8] Inserting CBOMComponent...")
        cbom_item = CBOMComponent(
            id=str(uuid.uuid4()),
            scan_id=test_scan.id,
            algorithm="RSA-2048",
            category="asymmetric",
            library="cryptography",
            version="41.0.3",
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
        print(f"   --> [PASS] CBOMComponent persisted: algo='{cbom_item.algorithm}', risk='{cbom_item.quantum_risk}'")

        # 9. FindingCorrelation
        print("\n[Step 9] Inserting FindingCorrelation...")
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
        print(f"   --> [PASS] FindingCorrelation persisted: group_key='{correlation.group_key}'")

        # 10. ScanComponent (Unified storage)
        print("\n[Step 10] Inserting ScanComponent (Unified storage)...")
        unified_comp = ScanComponent(
            id=str(uuid.uuid4()),
            scan_id=test_scan.id,
            component_kind="crypto",
            component_type="asymmetric",
            name="RSA-2048",
            version="41.0.3",
            purl=None,
            source_file="src/crypto/handshake.py",
            line_number=32,
            detection_method="engine",
            confidence=0.98,
            metadata_json={"quantum_risk": "quantum_vulnerable", "target": "ML-KEM (FIPS 203)"},
        )
        session.add(unified_comp)
        session.commit()
        created_component_id = unified_comp.id
        print(f"   --> [PASS] ScanComponent persisted: kind='{unified_comp.component_kind}', name='{unified_comp.name}'")

        # 11. Scan-Scoped Query Verification
        print("\n[Step 11] Verifying Scan-Scoped Query Counts...")
        scan_findings_count = session.query(Finding).filter_by(scan_id=test_scan.id).count()
        scan_sbom_count = session.query(SBOMComponent).filter_by(scan_id=test_scan.id).count()
        scan_cbom_count = session.query(CBOMComponent).filter_by(scan_id=test_scan.id).count()
        scan_comp_count = session.query(ScanComponent).filter_by(scan_id=test_scan.id).count()
        scan_corr_count = session.query(FindingCorrelation).filter_by(scan_id=test_scan.id).count()
        assert scan_findings_count == 2
        assert scan_sbom_count == 1
        assert scan_cbom_count == 1
        assert scan_comp_count == 1
        assert scan_corr_count == 1
        print(f"   --> [PASS] Scan {test_scan.id}: {scan_findings_count} findings, {scan_sbom_count} SBOM, {scan_cbom_count} CBOM, {scan_comp_count} unified components, {scan_corr_count} correlations")

        # 12. Test Cascade Deletion: Deleting Scan cleans up all child tables
        print("\n[Step 12] Testing Cascade Deletion on Scan...")
        scan_to_del = session.query(Scan).filter_by(id=test_scan.id).first()
        if scan_to_del:
            session.delete(scan_to_del)
            session.commit()

        leftover_findings = session.query(Finding).filter_by(scan_id=test_scan.id).count()
        leftover_files = session.query(ScanFile).filter_by(scan_id=test_scan.id).count()
        leftover_sbom = session.query(SBOMComponent).filter_by(scan_id=test_scan.id).count()
        leftover_cbom = session.query(CBOMComponent).filter_by(scan_id=test_scan.id).count()
        leftover_comp = session.query(ScanComponent).filter_by(scan_id=test_scan.id).count()
        leftover_corr = session.query(FindingCorrelation).filter_by(scan_id=test_scan.id).count()

        assert leftover_findings == 0, f"Findings orphaned: {leftover_findings}"
        assert leftover_files == 0, f"Files orphaned: {leftover_files}"
        assert leftover_sbom == 0, f"SBOM orphaned: {leftover_sbom}"
        assert leftover_cbom == 0, f"CBOM orphaned: {leftover_cbom}"
        assert leftover_comp == 0, f"Scan components orphaned: {leftover_comp}"
        assert leftover_corr == 0, f"Correlations orphaned: {leftover_corr}"
        print("   --> [PASS] Cascade deletion successfully purged all child records.")

        created_scan_id = None
        created_file_id = None
        created_finding_id_1 = None
        created_finding_id_2 = None
        created_sbom_id = None
        created_cbom_id = None
        created_component_id = None
        created_correlation_id = None

        print("\n" + "=" * 75)
        print(" [SUCCESS] DAY 4 DATABASE SCHEMA & MULTI-ENGINE CONTRACTS VERIFIED!")
        print("=" * 75)
        return True

    except Exception as e:
        session.rollback()
        print(f"\n[FAIL] Verification error: {e}")
        raise
    finally:
        # Strict teardown: ensure zero test leftovers
        try:
            if created_component_id:
                session.query(ScanComponent).filter_by(id=created_component_id).delete()
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
            if created_file_id:
                session.query(ScanFile).filter_by(id=created_file_id).delete()
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
    run_day4_verification()
