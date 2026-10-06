"""Clean all existing projects, scans, findings, components, uploads, and Redis state
for a fresh manual testing session.
"""

import os
import shutil
from pathlib import Path
from sqlalchemy import text
from app.core.database import SessionLocal, engine
from app.services.redis_service import get_redis

def clean_all():
    print("=" * 60)
    print("CLEANING ALL PROJECTS, SCANS, FINDINGS, AND STORAGE")
    print("=" * 60)

    # 1. Database Cleanup
    print("\n[1] Cleaning Database Tables...")
    with engine.connect() as conn:
        conn.execute(text("SET FOREIGN_KEY_CHECKS = 0;"))
        for tbl in [
            "finding_correlations",
            "cbom_components",
            "sbom_components",
            "scan_components",
            "findings",
            "scan_files",
            "scans",
            "projects",
        ]:
            conn.execute(text(f"DELETE FROM {tbl};"))
            print(f"   --> Cleared table: {tbl}")

        # Remove test users, keep default admin
        conn.execute(text("DELETE FROM users WHERE email != 'admin@pqc.example';"))
        
        # Ensure default organization exists
        conn.execute(text("""
            INSERT INTO organizations (id, name, created_at, updated_at)
            VALUES ('org-default-001', 'Default Organization', NOW(6), NOW(6))
            ON DUPLICATE KEY UPDATE name = VALUES(name);
        """))

        # Ensure admin user exists with password 'change_me_locally'
        conn.execute(text("""
            INSERT INTO users (id, organization_id, email, password_hash, role, created_at, updated_at)
            VALUES (
                '00000000-0000-0000-0000-000000000001',
                'org-default-001',
                'admin@pqc.example',
                '$2b$12$gqr69tfBNyDuzh/u4bD0X.wnkuh4IsV53KTl72OC2G05rOMTBec5e',
                'admin',
                NOW(6),
                NOW(6)
            ) ON DUPLICATE KEY UPDATE
                password_hash = VALUES(password_hash),
                organization_id = VALUES(organization_id);
        """))

        conn.execute(text("SET FOREIGN_KEY_CHECKS = 1;"))
        conn.commit()
    print("   --> Database tables reset successfully.")

    # 2. Redis Cleanup
    print("\n[2] Flushing Redis Queue and Keys...")
    try:
        r = get_redis()
        r.flushall()
        print("   --> Redis flushed successfully (0 keys remaining).")
    except Exception as exc:
        print(f"   --> Redis flush warning: {exc}")

    # 3. Storage Cleanup
    print("\n[3] Purging Uploads and Extracted Scans...")
    storage_dir = Path(__file__).resolve().parent / "storage"
    uploads_dir = storage_dir / "uploads"
    if uploads_dir.exists():
        for item in uploads_dir.iterdir():
            try:
                if item.is_file():
                    item.unlink()
                elif item.is_dir():
                    shutil.rmtree(item)
            except Exception as e:
                print(f"   --> Could not remove {item}: {e}")
    uploads_dir.mkdir(parents=True, exist_ok=True)
    (uploads_dir / "scans").mkdir(parents=True, exist_ok=True)
    print("   --> Storage directories cleaned and recreated.")

    # 4. Status Verification
    print("\n[4] Verification:")
    with engine.connect() as conn:
        for tbl in ["projects", "scans", "findings", "scan_components", "users", "organizations"]:
            count = conn.execute(text(f"SELECT COUNT(*) FROM {tbl}")).scalar()
            print(f"   * Table '{tbl}': {count} rows")

    print("\n" + "=" * 60)
    print("CLEANUP COMPLETE! ENVIRONMENT IS READY FOR MANUAL TESTING.")
    print("Admin login: admin@pqc.example / change_me_locally")
    print("=" * 60)

if __name__ == "__main__":
    clean_all()
