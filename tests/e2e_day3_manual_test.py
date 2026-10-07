"""Manual End-to-End Integration Flow for Day 3.

Flow:
Login -> Create Project -> Upload ZIP -> Create Scan -> Redis Queue -> Worker Processing
-> Engine Status -> SAST Analysis -> Crypto Analysis -> Configuration Analysis
-> Dependency Analysis -> Findings -> PQC Assessment -> Crypto Inventory / CBOM -> Reports
"""

import io
import time
import zipfile
import requests

BASE_URL = "http://127.0.0.1:8000"
API = f"{BASE_URL}/api/v1"

def create_sample_repo_zip() -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        # SAST trigger
        zf.writestr(
            "src/service.py",
            "import os\n\ndef query_user(user_input):\n    query = f'SELECT * FROM users WHERE id = {user_input}'\n    return query\n"
        )
        # Crypto trigger (Quantum Vulnerable RSA)
        zf.writestr(
            "src/crypto_handshake.py",
            "from cryptography.hazmat.primitives.asymmetric import rsa\n\ndef generate_key():\n    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)\n    return key\n"
        )
        # Configuration trigger
        zf.writestr(
            "config/settings.py",
            "DEBUG = True\nSECRET_KEY = 'insecure-secret-key-123'\nALLOWED_HOSTS = ['*']\n"
        )
        # Dependency trigger (SBOM)
        zf.writestr(
            "requirements.txt",
            "cryptography==38.0.1\nrequests==2.28.1\nflask==2.2.2\n"
        )
    return buf.getvalue()


def run_e2e_test():
    print("=" * 70)
    print("STARTING DAY 3 END-TO-END VERIFICATION FLOW")
    print("=" * 70)

    # 1. Login
    print("\n[Step 1] Authenticating...")
    login_resp = requests.post(
        f"{API}/auth/login",
        json={"email": "admin@pqc.example", "password": "change_me_locally"},
    )
    if login_resp.status_code != 200:
        # Try registering a new user if admin doesn't authenticate
        import uuid
        unique_email = f"e2e_{uuid.uuid4().hex[:8]}@pqc.example"
        reg_resp = requests.post(
            f"{API}/auth/register",
            json={"email": unique_email, "password": "StrongPassword123!"},
        )
        assert reg_resp.status_code == 201, f"Registration failed: {reg_resp.text}"
        login_resp = requests.post(
            f"{API}/auth/login",
            json={"email": unique_email, "password": "StrongPassword123!"},
        )
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("   --> [PASS] Authenticated successfully")

    # 2. Create Project
    print("\n[Step 2] Creating Project...")
    proj_resp = requests.post(
        f"{API}/projects",
        json={"name": "Day 3 End-to-End Validation", "description": "E2E multi-engine verification project"},
        headers=headers,
    )
    assert proj_resp.status_code == 201, f"Project creation failed: {proj_resp.text}"
    project = proj_resp.json()
    project_id = project["id"]
    print(f"   --> [PASS] Project created: id={project_id}, name='{project['name']}'")

    # 3. Upload ZIP
    print("\n[Step 3] Uploading Repository ZIP...")
    zip_bytes = create_sample_repo_zip()
    upload_resp = requests.post(
        f"{API}/uploads",
        files={"file": ("day3_vulnerable_sample.zip", zip_bytes, "application/zip")},
        headers=headers,
    )
    assert upload_resp.status_code == 201, f"Upload failed: {upload_resp.text}"
    upload = upload_resp.json()
    upload_id = upload["upload_id"]
    print(f"   --> [PASS] Repository uploaded: upload_id={upload_id}, size={upload['size_bytes']} bytes")

    # 4. Create Scan
    print("\n[Step 4] Enqueuing Scan...")
    scan_resp = requests.post(
        f"{API}/scans",
        json={"project_id": project_id, "upload_id": upload_id},
        headers=headers,
    )
    assert scan_resp.status_code == 201, f"Scan creation failed: {scan_resp.text}"
    scan = scan_resp.json()
    scan_id = scan["id"]
    print(f"   --> [PASS] Scan queued: scan_id={scan_id}, status='{scan['status']}'")
    print(f"   --> Initial Engine Statuses: {scan.get('engine_statuses')}")

    # 5. Await Worker Processing & Engine Status Lifecycle
    print("\n[Step 5] Awaiting Worker Execution & Engine Status Lifecycle...")
    max_wait = 40
    start_time = time.time()
    final_scan = None
    while time.time() - start_time < max_wait:
        poll_resp = requests.get(f"{API}/scans/{scan_id}", headers=headers)
        assert poll_resp.status_code == 200, f"Poll scan failed: {poll_resp.text}"
        final_scan = poll_resp.json()
        status = final_scan["status"]
        eng_statuses = final_scan.get("engine_statuses", {})
        print(f"   ... elapsed {int(time.time() - start_time)}s: scan={status}, engines={eng_statuses}")
        if status in ("COMPLETED", "FAILED", "CANCELLED"):
            break
        time.sleep(2)

    assert final_scan["status"] == "COMPLETED", f"Scan did not complete cleanly: {final_scan}"
    print(f"   --> [PASS] Scan COMPLETED successfully!")
    print(f"   --> Final Engine Statuses: {final_scan['engine_statuses']}")
    assert all(st == "COMPLETED" for st in final_scan["engine_statuses"].values()), "Not all engines COMPLETED"

    # 6. Verify Findings
    print("\n[Step 6] Verifying Findings across all Engines...")
    findings_resp = requests.get(f"{API}/findings?scan_id={scan_id}", headers=headers)
    assert findings_resp.status_code == 200, f"Get findings failed: {findings_resp.text}"
    findings = findings_resp.json()
    print(f"   --> Total Findings: {len(findings)}")
    engines_detected = {f["engine"] for f in findings}
    print(f"   --> Engines reporting findings: {engines_detected}")
    for f in findings:
        print(f"       * [{f['engine'].upper()}] [{f['severity'].upper()}] {f['title']} ({f['file_path']}:{f['line_number']})")
        print(f"         Rule: {f.get('rule_id')} (v{f.get('rule_version')})")

    assert "sast" in engines_detected, "SAST engine produced no findings"
    assert "crypto" in engines_detected, "Crypto engine produced no findings"

    # 7. Verify Findings Summary
    print("\n[Step 7] Verifying Findings Summary API...")
    summary_resp = requests.get(f"{API}/findings/summary?scan_id={scan_id}", headers=headers)
    assert summary_resp.status_code == 200, f"Summary failed: {summary_resp.text}"
    summary = summary_resp.json()
    print(f"   --> Summary total_findings: {summary['total_findings']}")
    print(f"   --> By engine: {summary['by_engine']}")
    print(f"   --> By severity: {summary['by_severity']}")

    # 8. Verify Reports API with SBOM / CBOM
    print("\n[Step 8] Verifying Reports API Contract (SBOM & CBOM)...")
    report_resp = requests.get(f"{API}/reports/{scan_id}", headers=headers)
    assert report_resp.status_code == 200, f"Report failed: {report_resp.text}"
    report = report_resp.json()
    print(f"   --> Report status: {report['status']}")
    print(f"   --> Report total_findings: {report['total_findings']}")
    print(f"   --> SBOM components count: {len(report.get('sbom', []))}")
    for comp in report.get("sbom", []):
        print(f"       [SBOM] {comp['name']} ({comp.get('version')}) - {comp.get('source_file')}")
    print(f"   --> CBOM components count: {len(report.get('cbom', []))}")
    for comp in report.get("cbom", []):
        print(f"       [CBOM] {comp['name']} ({comp.get('version')}) - {comp.get('source_file')}")

    print("\n" + "=" * 70)
    print("ALL DAY 3 END-TO-END PIPELINE CHECKS PASSED WITH FLYING COLORS!")
    print("=" * 70)


if __name__ == "__main__":
    run_e2e_test()
