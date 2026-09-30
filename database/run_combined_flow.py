"""
Combined Flow Verification Script
Executes: register -> login -> project -> upload -> scan -> SELECT scans row
Directly connects to the active database (PostgreSQL 18 / MySQL 8) and Redis.
"""

import io
import os
import sys
import uuid
import zipfile
from pathlib import Path
from dotenv import load_dotenv

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent / "backend"
load_dotenv(backend_dir / ".env")
sys.path.insert(0, str(backend_dir))
repo_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(repo_root))

from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core.config import get_settings
from app.core.database import SessionLocal, engine
from app.main import app
from app.services.redis_service import QUEUE_KEY, get_redis


def make_sample_zip() -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("sample-app/main.py", "print('PQC assessment target')\n")
        z.writestr("sample-app/requirements.txt", "cryptography>=41.0.0\n")
    return buf.getvalue()


def run_flow():
    print("=" * 80)
    print(" COMBINED FLOW VERIFICATION: Register -> Login -> Project -> Upload -> Scan")
    print("=" * 80)

    settings = get_settings()
    dialect = engine.dialect.name
    print(f"[*] Active Database Dialect : {dialect.upper()}")
    print(f"[*] Database URL            : {settings.database_url}")

    with engine.connect() as conn:
        version_row = conn.execute(text("SELECT version()")).fetchone()
        db_version = version_row[0] if version_row else "Unknown"
        print(f"[*] Database Engine Version : {db_version.splitlines()[0]}")

    # Check Redis
    redis_status = "Disconnected"
    try:
        r = get_redis()
        if r.ping():
            redis_status = f"Connected (queue length: {r.llen(QUEUE_KEY)})"
    except Exception as exc:
        redis_status = f"Unavailable ({exc})"
    print(f"[*] Redis Status            : {redis_status}")
    print("-" * 80)

    client = TestClient(app)
    api = "/api/v1"

    # Step 1: Register
    unique_suffix = uuid.uuid4().hex[:8]
    email = f"qa.vamsi.{unique_suffix}@pqc.example"
    password = "CorrectHorse-Battery-99!"
    print(f"\n[Step 1] Registering user: {email}...")
    reg_resp = client.post(f"{api}/auth/register", json={"email": email, "password": password})
    print(f"   --> HTTP Status: {reg_resp.status_code}")
    assert reg_resp.status_code == 201, f"Register failed: {reg_resp.text}"
    user_data = reg_resp.json()
    user_id = user_data["id"]
    org_id = user_data["organization_id"]
    print(f"   --> Registered User ID: {user_id}")
    print(f"   --> Organization ID   : {org_id}")

    # Step 2: Login
    print(f"\n[Step 2] Logging in as: {email}...")
    login_resp = client.post(f"{api}/auth/login", json={"email": email, "password": password})
    print(f"   --> HTTP Status: {login_resp.status_code}")
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print(f"   --> JWT Access Token obtained (length={len(token)}, begins: {token[:20]}...)")

    # Verify /auth/me
    me_resp = client.get(f"{api}/auth/me", headers=headers)
    assert me_resp.status_code == 200
    print(f"   --> Authenticated session verified: {me_resp.json()['email']}")

    # Step 3: Create Project
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


if __name__ == "__main__":
    run_flow()
