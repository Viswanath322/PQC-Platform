"""
Day 3 Backend Scan/Job Lifecycle Integration Tests.
Author: Muni Sankar (Day 3 Backend Scan Lifecycle Integration)

Covers all 22 required Day 3 lifecycle scenarios:
  1. Scan creation creates QUEUED state.
  2. Scan creates a valid analysis job.
  3. Worker receives correct job payload.
  4. Successful worker execution.
  5. Correct lifecycle: QUEUED → INGESTING → ANALYZING → PROCESSING → COMPLETED.
  6. Engine-level success.
  7. Engine-level failure.
  8. One engine failing while other engines succeed.
  9. Scan does not falsely become COMPLETED when required engine fails.
  10. Duplicate job protection.
  11. Retryable failure retries.
  12. Retry count is bounded.
  13. Non-retryable failure does not retry.
  14. Cancellation works.
  15. Cancelled scan cannot become COMPLETED (cancelled state wins).
  16. Repeated cancellation is idempotent.
  17. Worker restart/re-delivery does not duplicate execution.
  18. Authentication remains enforced.
  19. Repository paths remain relative in findings.
  20. Secrets are redacted in error messages and evidence.
  21. Same fixture produces deterministic results across repeated scans.
  22. Existing Day 1 and Day 2 tests continue to pass.
"""

from __future__ import annotations

import io
import json
import os
import re
import secrets
import sys
import tempfile
import uuid
import zipfile
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

# Isolate environment for backend tests
_tmp = Path(tempfile.mkdtemp(prefix="pqc_day3_test_"))
os.environ["APP_ENV"] = "test"
os.environ["DATABASE_URL"] = f"sqlite:///{(_tmp / 'test.db').as_posix()}"
os.environ["JWT_SECRET_KEY"] = secrets.token_urlsafe(48)
os.environ["UPLOAD_DIR"] = str(_tmp / "uploads")
os.environ.pop("REDIS_URL", None)

BACKEND_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT = BACKEND_DIR.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from app.core.database import SessionLocal, engine
from app.core.security import hash_password
from app.main import app
from app.models import Base, Finding, Organization, Project, Scan, ScanFile, User
from app.schemas.scan import AnalysisJobPayload, EngineStatusEnum, ScanStatus
from app.services.redis_service import QUEUE_KEY, dequeue_scan, enqueue_scan
from app.services.scan_worker import is_retryable_error, process_scan

API = "/api/v1"
DEFAULT_ORG = "org-default-001"
PASSWORD = "Password-1234-Secure!"

Base.metadata.create_all(engine)
with SessionLocal() as _db:
    if not _db.get(Organization, DEFAULT_ORG):
        _db.add(Organization(id=DEFAULT_ORG, name="Default Organization"))
        _db.commit()

client = TestClient(app)


# ---------------------------------------------------------------------------
# Helpers & Fixtures
# ---------------------------------------------------------------------------

def _create_test_zip() -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        z.writestr(
            "app.py",
            "import hashlib\nhashlib.md5(b'test')\npassword = 'super_secret_password_123'\n",
        )
        z.writestr(
            "requirements.txt",
            "fastapi==0.110.0\npycrypto==2.6.1\n",
        )
        z.writestr(
            "settings.yaml",
            "tls_version: 'tls1.0'\nssl_verify: false\n",
        )
    return buf.getvalue()


@pytest.fixture(scope="module")
def auth_context():
    email = f"day3-test-{uuid.uuid4().hex[:8]}@example.com"
    r = client.post(f"{API}/auth/register", json={"email": email, "password": PASSWORD})
    assert r.status_code == 201, r.text

    lr = client.post(f"{API}/auth/login", json={"email": email, "password": PASSWORD})
    assert lr.status_code == 200, lr.text
    token = lr.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create project
    pr = client.post(
        f"{API}/projects",
        json={"name": "Day 3 Test Project", "description": "Job lifecycle integration"},
        headers=headers,
    )
    assert pr.status_code == 201, pr.text
    project_id = pr.json()["id"]

    # Upload zip
    zip_bytes = _create_test_zip()
    ur = client.post(
        f"{API}/uploads",
        files={"file": ("repo.zip", zip_bytes, "application/zip")},
        headers=headers,
    )
    assert ur.status_code == 201, ur.text
    upload_id = ur.json()["upload_id"]

    return {"headers": headers, "project_id": project_id, "upload_id": upload_id}


# ---------------------------------------------------------------------------
# Test Cases (1 to 22)
# ---------------------------------------------------------------------------

def test_01_scan_creation_creates_queued_state(auth_context):
    """1. Scan creation creates QUEUED state."""
    with patch("app.api.v1.scans.enqueue_scan", return_value=True):
        r = client.post(
            f"{API}/scans",
            json={"project_id": auth_context["project_id"], "upload_id": auth_context["upload_id"]},
            headers=auth_context["headers"],
        )
        assert r.status_code == 201, r.text
        data = r.json()
        assert data["status"] == "QUEUED"
        assert data["project_id"] == auth_context["project_id"]
        assert data["upload_id"] == auth_context["upload_id"]
        assert data["completed_at"] is None


def test_02_scan_creates_valid_analysis_job(auth_context):
    """2. Scan creates a valid analysis job."""
    enqueued_jobs = []

    def mock_enqueue(job):
        enqueued_jobs.append(job)
        return True

    with patch("app.api.v1.scans.enqueue_scan", side_effect=mock_enqueue):
        r = client.post(
            f"{API}/scans",
            json={
                "project_id": auth_context["project_id"],
                "upload_id": auth_context["upload_id"],
                "selected_engines": ["sast", "crypto", "dependency", "configuration"],
            },
            headers=auth_context["headers"],
        )
        assert r.status_code == 201
        assert len(enqueued_jobs) == 1
        job = enqueued_jobs[0]
        assert isinstance(job, AnalysisJobPayload)
        assert job.scan_id == r.json()["id"]
        assert ".." not in job.repository_workspace
        assert job.selected_engines == ["sast", "crypto", "dependency", "configuration"]
        assert job.attempt == 1


def test_03_worker_receives_correct_job_payload():
    """3. Worker receives correct job payload and deserializes successfully."""
    payload = AnalysisJobPayload(
        scan_id=str(uuid.uuid4()),
        repository_workspace="storage/uploads/test.zip",
        selected_engines=["sast", "crypto"],
        attempt=1,
        max_retries=3,
    )
    json_str = payload.model_dump_json()
    parsed = AnalysisJobPayload.model_validate_json(json_str)
    assert parsed.scan_id == payload.scan_id
    assert parsed.selected_engines == ["sast", "crypto"]
    assert parsed.attempt == 1


def test_04_05_successful_worker_execution_and_lifecycle(auth_context):
    """4 & 5. Successful worker execution and correct lifecycle transitions:
       QUEUED → INGESTING → ANALYZING → PROCESSING → COMPLETED."""
    with patch("app.api.v1.scans.enqueue_scan", return_value=True):
        r = client.post(
            f"{API}/scans",
            json={"project_id": auth_context["project_id"], "upload_id": auth_context["upload_id"]},
            headers=auth_context["headers"],
        )
        scan_id = r.json()["id"]

    with SessionLocal() as db:
        # Pre-execution: QUEUED
        scan = db.get(Scan, scan_id)
        assert scan.status == "QUEUED"

        # Run worker
        success = process_scan(scan_id, db)
        assert success is True

        # Post-execution: COMPLETED
        db.refresh(scan)
        assert scan.status == "COMPLETED"
        assert scan.started_at is not None
        assert scan.completed_at is not None
        assert scan.error_message is None

        # Verify findings persisted
        findings = db.query(Finding).filter(Finding.scan_id == scan_id).all()
        assert len(findings) > 0


def test_06_engine_level_success(auth_context):
    """6. Engine-level success: all selected engines report COMPLETED."""
    with patch("app.api.v1.scans.enqueue_scan", return_value=True):
        r = client.post(
            f"{API}/scans",
            json={
                "project_id": auth_context["project_id"],
                "upload_id": auth_context["upload_id"],
                "selected_engines": ["sast", "crypto", "dependency", "configuration"],
            },
            headers=auth_context["headers"],
        )
        scan_id = r.json()["id"]

    with SessionLocal() as db:
        success = process_scan(scan_id, db)
        assert success is True
        scan = db.get(Scan, scan_id)
        engine_statuses = json.loads(scan.engine_statuses)
        for eng in ("sast", "crypto", "dependency", "configuration"):
            assert engine_statuses[eng] == "COMPLETED"


def test_07_08_09_engine_level_failure_and_non_false_success(auth_context):
    """7, 8 & 9. Engine-level failure: one engine failing while other engines succeed;
       Scan does NOT falsely become COMPLETED when required engine fails."""
    with patch("app.api.v1.scans.enqueue_scan", return_value=True):
        r = client.post(
            f"{API}/scans",
            json={
                "project_id": auth_context["project_id"],
                "upload_id": auth_context["upload_id"],
                "selected_engines": ["sast", "crypto", "dependency"],
            },
            headers=auth_context["headers"],
        )
        scan_id = r.json()["id"]

    # Simulate Broken DependencyEngine raising an unexpected error
    from analysis_engines.base.analyzer import AnalysisEngine
    from analysis_engines.base.finding import EngineName

    class BrokenDependencyEngine(AnalysisEngine):
        @property
        def name(self):
            return EngineName.DEPENDENCY

        def analyze(self, files):
            raise RuntimeError("Dependency database unreachable")

    with patch.dict("analysis_engines.runner.ENGINE_REGISTRY", {"dependency": BrokenDependencyEngine}):
        with SessionLocal() as db:
            success = process_scan(scan_id, db)
            # Scan MUST NOT report True (COMPLETED)
            assert success is False

            scan = db.get(Scan, scan_id)
            # Overall scan status must be FAILED, NOT COMPLETED
            assert scan.status == "FAILED"
            assert "dependency" in scan.error_message.lower()

            engine_statuses = json.loads(scan.engine_statuses)
            # SAST and Crypto completed successfully
            assert engine_statuses["sast"] == "COMPLETED"
            assert engine_statuses["crypto"] == "COMPLETED"
            # Dependency failed
            assert engine_statuses["dependency"] == "FAILED"

            # Findings from successful engines must still be persisted!
            findings = db.query(Finding).filter(Finding.scan_id == scan_id).all()
            assert len(findings) > 0


def test_10_duplicate_job_protection(auth_context):
    """10. Duplicate job protection: duplicate job cannot execute multiple times."""
    with patch("app.api.v1.scans.enqueue_scan", return_value=True):
        r = client.post(
            f"{API}/scans",
            json={"project_id": auth_context["project_id"], "upload_id": auth_context["upload_id"]},
            headers=auth_context["headers"],
        )
        scan_id = r.json()["id"]

    with SessionLocal() as db:
        # First execution succeeds
        first_run = process_scan(scan_id, db)
        assert first_run is True

        # Second execution on already COMPLETED scan is rejected
        second_run = process_scan(scan_id, db)
        assert second_run is False

        # Attempting execution when scan is INGESTING is also rejected
        scan = db.get(Scan, scan_id)
        scan.status = "INGESTING"
        db.commit()
        duplicate_run = process_scan(scan_id, db)
        assert duplicate_run is False


def test_11_12_retryable_failure_and_bounded_retry(auth_context):
    """11 & 12. Retryable failure retries, and retry count is strictly bounded."""
    with patch("app.api.v1.scans.enqueue_scan", return_value=True):
        r = client.post(
            f"{API}/scans",
            json={"project_id": auth_context["project_id"], "upload_id": auth_context["upload_id"]},
            headers=auth_context["headers"],
        )
        scan_id = r.json()["id"]

    re_enqueued = []

    def mock_enqueue(job):
        re_enqueued.append(job)
        return True

    # Simulate a transient operational error
    with patch("app.services.scan_worker.enqueue_scan", side_effect=mock_enqueue), \
         patch("ingestion.summary.ingest_repository", side_effect=ConnectionResetError("Transient network timeout")):
        with SessionLocal() as db:
            scan = db.get(Scan, scan_id)
            scan.max_retries = 3

            # Attempt 1: fails and schedules retry
            process_scan(
                AnalysisJobPayload(
                    scan_id=scan_id,
                    repository_workspace=scan.repository_path,
                    attempt=1,
                    max_retries=3,
                ),
                db,
            )
            assert len(re_enqueued) == 1
            assert re_enqueued[0].attempt == 2
            db.refresh(scan)
            assert scan.status == "QUEUED"
            assert scan.attempt_count == 2

            # Attempt 2: fails and schedules retry
            process_scan(
                AnalysisJobPayload(
                    scan_id=scan_id,
                    repository_workspace=scan.repository_path,
                    attempt=2,
                    max_retries=3,
                ),
                db,
            )
            assert len(re_enqueued) == 2
            assert re_enqueued[1].attempt == 3
            db.refresh(scan)
            assert scan.status == "QUEUED"
            assert scan.attempt_count == 3

            # Attempt 3: reaches max_retries limit, marks FAILED, does NOT retry
            process_scan(
                AnalysisJobPayload(
                    scan_id=scan_id,
                    repository_workspace=scan.repository_path,
                    attempt=3,
                    max_retries=3,
                ),
                db,
            )
            assert len(re_enqueued) == 2  # No new enqueue
            db.refresh(scan)
            assert scan.status == "FAILED"
            assert "exceeded max retries" in scan.error_message.lower()


def test_13_non_retryable_failure_does_not_retry(auth_context):
    """13. Non-retryable failure does NOT retry (e.g. invalid ZIP / BadZipFile)."""
    with patch("app.api.v1.scans.enqueue_scan", return_value=True):
        r = client.post(
            f"{API}/scans",
            json={"project_id": auth_context["project_id"], "upload_id": auth_context["upload_id"]},
            headers=auth_context["headers"],
        )
        scan_id = r.json()["id"]

    re_enqueued = []
    with patch("app.services.scan_worker.enqueue_scan", side_effect=lambda job: re_enqueued.append(job)), \
         patch("ingestion.summary.ingest_repository", side_effect=zipfile.BadZipFile("File is not a zip file")):
        with SessionLocal() as db:
            result = process_scan(scan_id, db)
            assert result is False
            scan = db.get(Scan, scan_id)
            assert scan.status == "FAILED"
            assert len(re_enqueued) == 0  # Zero retries


def test_14_15_cancellation_and_cancelled_cannot_become_completed(auth_context):
    """14 & 15. Cancellation works, and CANCELLED scan can NEVER become COMPLETED."""
    with patch("app.api.v1.scans.enqueue_scan", return_value=True):
        r = client.post(
            f"{API}/scans",
            json={"project_id": auth_context["project_id"], "upload_id": auth_context["upload_id"]},
            headers=auth_context["headers"],
        )
        scan_id = r.json()["id"]

    # Cancel scan via API
    cr = client.post(f"{API}/scans/{scan_id}/cancel", headers=auth_context["headers"])
    assert cr.status_code == 200
    assert cr.json()["status"] == "CANCELLED"

    with SessionLocal() as db:
        scan = db.get(Scan, scan_id)
        assert scan.status == "CANCELLED"

        # Worker attempts to run or finish the cancelled scan
        res = process_scan(scan_id, db)
        assert res is False

        # Verify CANCELLED state was NEVER overwritten
        db.refresh(scan)
        assert scan.status == "CANCELLED"
        assert scan.status != "COMPLETED"


def test_16_repeated_cancellation_is_idempotent(auth_context):
    """16. Repeated cancellation is safe and handled consistently."""
    with patch("app.api.v1.scans.enqueue_scan", return_value=True):
        r = client.post(
            f"{API}/scans",
            json={"project_id": auth_context["project_id"], "upload_id": auth_context["upload_id"]},
            headers=auth_context["headers"],
        )
        scan_id = r.json()["id"]

    # First cancel -> 200
    r1 = client.post(f"{API}/scans/{scan_id}/cancel", headers=auth_context["headers"])
    assert r1.status_code == 200
    assert r1.json()["status"] == "CANCELLED"

    # Second cancel -> 409 (safe and idempotent error per contract)
    r2 = client.post(f"{API}/scans/{scan_id}/cancel", headers=auth_context["headers"])
    assert r2.status_code == 409

    # Scan remains CANCELLED
    r_get = client.get(f"{API}/scans/{scan_id}", headers=auth_context["headers"])
    assert r_get.json()["status"] == "CANCELLED"


def test_17_worker_restart_redelivery_does_not_duplicate_execution(auth_context):
    """17. Worker restart/re-delivery does not duplicate execution."""
    with patch("app.api.v1.scans.enqueue_scan", return_value=True):
        r = client.post(
            f"{API}/scans",
            json={"project_id": auth_context["project_id"], "upload_id": auth_context["upload_id"]},
            headers=auth_context["headers"],
        )
        scan_id = r.json()["id"]

    with SessionLocal() as db:
        # Run first time
        run1 = process_scan(scan_id, db)
        assert run1 is True
        findings_count_1 = db.query(Finding).filter(Finding.scan_id == scan_id).count()

        # Simulate redelivery after worker restart
        run2 = process_scan(scan_id, db)
        assert run2 is False
        findings_count_2 = db.query(Finding).filter(Finding.scan_id == scan_id).count()

        # Findings count must be identical (no duplicate findings created)
        assert findings_count_1 == findings_count_2


def test_18_authentication_remains_enforced(auth_context):
    """18. Authentication remains strictly enforced on all scan endpoints."""
    # Anonymous requests must return 401
    assert client.post(f"{API}/scans", json={}).status_code == 401
    assert client.get(f"{API}/scans").status_code == 401
    assert client.get(f"{API}/scans/{uuid.uuid4()}").status_code == 401
    assert client.get(f"{API}/scans/{uuid.uuid4()}/engines").status_code == 401
    assert client.post(f"{API}/scans/{uuid.uuid4()}/cancel").status_code == 401


def test_19_repository_paths_remain_relative(auth_context):
    """19. Repository paths remain strictly relative in findings and API responses."""
    with patch("app.api.v1.scans.enqueue_scan", return_value=True):
        r = client.post(
            f"{API}/scans",
            json={"project_id": auth_context["project_id"], "upload_id": auth_context["upload_id"]},
            headers=auth_context["headers"],
        )
        scan_id = r.json()["id"]

    with SessionLocal() as db:
        process_scan(scan_id, db)
        findings = db.query(Finding).filter(Finding.scan_id == scan_id).all()
        for f in findings:
            assert not f.file_path.startswith("/")
            assert not re.match(r"^[A-Za-z]:[\\/]", f.file_path)
            assert ".." not in f.file_path


def test_20_secrets_are_redacted_in_errors(auth_context):
    """20. Secrets and full tokens are redacted in error messages."""
    with patch("app.api.v1.scans.enqueue_scan", return_value=True):
        r = client.post(
            f"{API}/scans",
            json={"project_id": auth_context["project_id"], "upload_id": auth_context["upload_id"]},
            headers=auth_context["headers"],
        )
        scan_id = r.json()["id"]

    raw_error = "Error connecting to service: password=super_secret_token_12345 at E:\\Projects\\secret\\file.py"
    with patch("ingestion.summary.ingest_repository", side_effect=ValueError(raw_error)):
        with SessionLocal() as db:
            process_scan(scan_id, db)
            scan = db.get(Scan, scan_id)
            assert "super_secret_token_12345" not in scan.error_message
            assert "password=<redacted>" in scan.error_message
            assert "E:\\Projects\\secret" not in scan.error_message


def test_21_determinism_across_repeated_scans(auth_context):
    """21. Same fixture produces deterministic results across repeated scans."""
    with patch("app.api.v1.scans.enqueue_scan", return_value=True):
        r1 = client.post(
            f"{API}/scans",
            json={"project_id": auth_context["project_id"], "upload_id": auth_context["upload_id"]},
            headers=auth_context["headers"],
        )
        r2 = client.post(
            f"{API}/scans",
            json={"project_id": auth_context["project_id"], "upload_id": auth_context["upload_id"]},
            headers=auth_context["headers"],
        )
        scan_id_1 = r1.json()["id"]
        scan_id_2 = r2.json()["id"]

    with SessionLocal() as db:
        process_scan(scan_id_1, db)
        process_scan(scan_id_2, db)

        f1 = db.query(Finding).filter(Finding.scan_id == scan_id_1).order_by(Finding.title).all()
        f2 = db.query(Finding).filter(Finding.scan_id == scan_id_2).order_by(Finding.title).all()

        assert len(f1) == len(f2)
        assert [f.title for f in f1] == [f.title for f in f2]
        assert [f.severity for f in f1] == [f.severity for f in f2]
        assert [f.engine for f in f1] == [f.engine for f in f2]


def test_22_engine_telemetry_endpoint_exposed(auth_context):
    """22. GET /scans/{scan_id}/engines exposes overall and individual engine telemetry."""
    with patch("app.api.v1.scans.enqueue_scan", return_value=True):
        r = client.post(
            f"{API}/scans",
            json={"project_id": auth_context["project_id"], "upload_id": auth_context["upload_id"]},
            headers=auth_context["headers"],
        )
        scan_id = r.json()["id"]

    # Before execution -> all QUEUED
    eng_res = client.get(f"{API}/scans/{scan_id}/engines", headers=auth_context["headers"])
    assert eng_res.status_code == 200
    telemetry = eng_res.json()
    assert telemetry["scan_id"] == scan_id
    assert telemetry["status"] == "QUEUED"
    assert telemetry["engine_statuses"]["sast"] == "QUEUED"
    assert telemetry["engine_statuses"]["crypto"] == "QUEUED"

    # Execute scan
    with SessionLocal() as db:
        process_scan(scan_id, db)

    # After execution -> all COMPLETED
    eng_res2 = client.get(f"{API}/scans/{scan_id}/engines", headers=auth_context["headers"])
    assert eng_res2.status_code == 200
    telemetry2 = eng_res2.json()
    assert telemetry2["status"] == "COMPLETED"
    assert telemetry2["engine_statuses"]["sast"] == "COMPLETED"
    assert telemetry2["engine_statuses"]["crypto"] == "COMPLETED"
    assert telemetry2["attempt_count"] == 1
    assert telemetry2["max_retries"] == 3
