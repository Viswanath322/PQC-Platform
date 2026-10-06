"""
Combined Flow Verification Script
Executes: register -> login -> project -> upload -> scan -> SELECT scans row
Uses the configured SQLAlchemy database (MySQL for the Day 1 deployment) and Redis.
"""

import io
import os
import sys
import zipfile
from uuid import uuid4
from pathlib import Path
try:
    from dotenv import load_dotenv
except ImportError:  # dotenv is optional when variables are exported by the shell
    def load_dotenv(*args, **kwargs):
        return False

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent / "backend"
load_dotenv(backend_dir / ".env")
sys.path.insert(0, str(backend_dir))
repo_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(repo_root))

from fastapi.testclient import TestClient
from sqlalchemy import text

try:
    from app.core.config import get_settings
    from app.core.database import SessionLocal, engine
    from app.main import app
    from app.services.redis_service import QUEUE_KEY, get_redis
except ImportError as err:
    get_settings = None
    SessionLocal = None
    engine = None
    app = None
    QUEUE_KEY = "pqc:scan_queue"
    get_redis = None


def make_sample_zip() -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("sample-app/main.py", "print('PQC assessment target')\n")
        z.writestr("sample-app/requirements.txt", "cryptography>=41.0.0\n")
    return buf.getvalue()


def run_flow():
    print("=" * 80)
    print(" COMBINED FLOW VERIFICATION: Login -> Project -> Upload -> Scan")
    print("=" * 80)

    if app is None or engine is None:
        print("[ERROR] Backend app or database engine not found.")
        print("run_combined_flow.py requires the backend package to be present.")
        sys.exit(1)

    settings = get_settings()
    dialect = engine.dialect.name
    print(f"[*] Active Database Dialect : {dialect.upper()}")

    with engine.connect() as conn:
        version_row = conn.execute(text("SELECT version()")).fetchone()
        db_version = version_row[0] if version_row else "Unknown"
        print(f"[*] Database Engine Version : {db_version.splitlines()[0]}")

    # Check Redis
    redis_status = "Disconnected"
    try:
        r = get_redis()
        if r and r.ping():
            redis_status = f"Connected (queue length: {r.llen(QUEUE_KEY)})"
    except Exception:
        redis_status = "Unavailable"
    print(f"[*] Redis Status            : {redis_status}")
    print("-" * 80)

    client = TestClient(app)
    api = "/api/v1"

    project_id = None
    scan_id = None
    upload_id = None
    email = os.environ.get("QA_ADMIN_EMAIL", "admin@pqc.example")
    password = os.environ.get("QA_ADMIN_PASSWORD", "change_me_locally")  # pragma: allowlist secret
    org_id = "org-default-001"


    try:
        # The seeded development admin is used because public registration is disabled by default.
        print(f"\n[Step 2] Logging in as: {email}...")
        login_resp = client.post(f"{api}/auth/login", json={"email": email, "password": password})
        print(f"   --> HTTP Status: {login_resp.status_code}")
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        token = login_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("   --> JWT access token obtained.")

        # Verify /auth/me
        me_resp = client.get(f"{api}/auth/me", headers=headers)
        assert me_resp.status_code == 200
        print(f"   --> Authenticated session verified: {me_resp.json()['email']}")

        # Step 3: Create Project
        unique_suffix = uuid4().hex[:8]
        project_name = f"Enterprise Payment Gateway {unique_suffix}"
        print(f"\n[Step 3] Creating Project: '{project_name}'...")
        proj_resp = client.post(
            f"{api}/projects",
            json={"name": project_name, "description": "Core transaction processing service with legacy crypto"},
            headers=headers,
        )
        print(f"   --> HTTP Status: {proj_resp.status_code}")
        assert proj_resp.status_code == 201, f"Project creation failed: {proj_resp.text}"
        project_data = proj_resp.json()
        project_id = project_data["id"]
        print(f"   --> Project Created: ID={project_id}, Name='{project_data['name']}'")

        # Step 4: Upload ZIP
        print(f"\n[Step 4] Uploading repository ZIP package...")
        zip_bytes = make_sample_zip()
        upload_resp = client.post(
            f"{api}/uploads",
            files={"file": ("payment-gateway.zip", zip_bytes, "application/zip")},
            headers=headers,
        )
        print(f"   --> HTTP Status: {upload_resp.status_code}")
        assert upload_resp.status_code == 201, f"Upload failed: {upload_resp.text}"
        upload_data = upload_resp.json()
        upload_id = upload_data["upload_id"]
        print(f"   --> Upload Succeeded: Upload ID={upload_id}, Filename='{upload_data['filename']}'")

        # Step 5: Create Scan
        print(f"\n[Step 5] Triggering Scan for Project={project_id}, Upload={upload_id}...")
        scan_resp = client.post(
            f"{api}/scans",
            json={"project_id": project_id, "upload_id": upload_id},
            headers=headers,
        )
        print(f"   --> HTTP Status: {scan_resp.status_code}")
        assert scan_resp.status_code == 201, f"Scan creation failed: {scan_resp.text}"
        scan_data = scan_resp.json()
        scan_id = scan_data["id"]
        queue_hdr = scan_resp.headers.get("X-Queue-Status", "none")
        print(f"   --> Scan Created: ID={scan_id}, Status='{scan_data['status']}', QueueHeader='{queue_hdr}'")

        # Verify Redis queue
        try:
            r = get_redis()
            if r:
                queued_items = r.lrange(QUEUE_KEY, 0, -1)
                is_queued = scan_id in queued_items
                print(f"   --> Redis Scan Queue verification: Scan in queue = {is_queued} (Queue size: {len(queued_items)})")
        except Exception as exc:
            print(f"   --> Redis Queue check skipped: {exc}")

        # Step 6: Direct Database SELECT
        print("\n" + "=" * 80)
        print(f" [Step 6] DIRECT SQL QUERY: SELECT * FROM scans WHERE id = '{scan_id}'")
        print("=" * 80)

        with engine.connect() as conn:
            result = conn.execute(
                text("SELECT id, project_id, status, repository_path, created_at, started_at, completed_at FROM scans WHERE id = :scan_id"),
                {"scan_id": scan_id},
            )
            row = result.mappings().fetchone()

            if row:
                print("Successfully retrieved scans row from live database:")
                print("-" * 80)
                for col, val in row.items():
                    print(f"  {col:<20} : {val}")
                print("-" * 80)
            else:
                print(f"[FAIL] No scan row found with id {scan_id} in database!")
                sys.exit(1)

        print("\n" + "=" * 80)
        print(" COMBINED FLOW COMPLETED SUCCESSFULLY!")
        print(f" Database used: {dialect.upper()} ({db_version.splitlines()[0]})")
        print("=" * 80)

    finally:
        print("\n" + "-" * 80)
        print(" [CLEANUP] Cleaning up combined flow test artifacts...")
        print("-" * 80)
        # 1. Clean Redis queue
        if scan_id and get_redis:
            try:
                r = get_redis()
                if r:
                    r.lrem(QUEUE_KEY, 0, scan_id)
                    print(f"   --> Removed scan {scan_id} from Redis queue")
            except Exception as exc:
                print(f"   --> Warning: Could not clean Redis queue: {exc}")

        # 2. Clean Database rows (reverse FK dependency order)
        try:
            with engine.begin() as conn:
                if scan_id:
                    conn.execute(text("DELETE FROM findings WHERE scan_id = :sid"), {"sid": scan_id})
                    conn.execute(text("DELETE FROM scan_files WHERE scan_id = :sid"), {"sid": scan_id})
                    conn.execute(text("DELETE FROM scans WHERE id = :sid"), {"sid": scan_id})
                    print(f"   --> Deleted scan row: {scan_id}")
                if project_id:
                    conn.execute(text("DELETE FROM projects WHERE id = :pid"), {"pid": project_id})
                    print(f"   --> Deleted project row: {project_id}")
        except Exception as exc:
            print(f"   --> Warning: Database cleanup error: {exc}")

        # 3. Clean uploaded storage file if any.
        try:
            if upload_id and org_id:
                from app.services.storage_service import get_upload_path
                get_upload_path(upload_id, org_id).unlink(missing_ok=True)
        except Exception:
            pass


if __name__ == "__main__":
    run_flow()

