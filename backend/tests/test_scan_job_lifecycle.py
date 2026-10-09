import sys
import uuid
from pathlib import Path

import pytest
from sqlalchemy import Column, DateTime, JSON, String, Text, create_engine, update
from sqlalchemy.orm import declarative_base, sessionmaker

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "backend"))

from analysis_engines.base.analyzer import AnalysisEngine
from analysis_engines.base.finding import EngineName
from analysis_engines.base.result import AnalysisResult
from analysis_engines.runner import AnalysisPipeline, PipelineResult, ScanCancelledError
from app.services import scan_worker
from app.services.job_retry import retry_unclaimed_job
from app.services.redis_service import ScanJob
from app.services.scan_worker import _record_engine_status, _set_status, mark_unexpected_failure
from database.models import Base as AppBase, Organization, Project, Scan, ScanFile


Base = declarative_base()


class ScanRow(Base):
    __tablename__ = "scan_rows"

    id = Column(String, primary_key=True)
    status = Column(String, nullable=False)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    error_message = Column(Text)
    engine_statuses = Column(JSON)


class FakeEngine(AnalysisEngine):
    def __init__(self, engine_name: EngineName, fail: bool = False):
        self._engine_name = engine_name
        self._fail = fail

    @property
    def name(self) -> EngineName:
        return self._engine_name

    def analyze(self, files) -> AnalysisResult:
        if self._fail:
            raise RuntimeError("fixture engine failure")
        return AnalysisResult(files_processed=1)


@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


@pytest.fixture
def worker_db(tmp_path):
    engine = create_engine("sqlite:///:memory:")
    AppBase.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    zip_path = tmp_path / "uploads" / "org-hash" / "upload.zip"
    zip_path.parent.mkdir(parents=True)
    zip_path.write_bytes(b"fixture archive")
    session.add(Organization(id="org-test", name="Test Org"))
    session.add(Project(id="project-test", organization_id="org-test", name="Test Project"))
    scan = Scan(
        id="scan-test",
        project_id="project-test",
        status="QUEUED",
        repository_path=str(zip_path),
        engine_statuses={"sast": "PENDING", "crypto": "PENDING"},
    )
    session.add(scan)
    session.commit()
    try:
        yield session, scan, zip_path
    finally:
        session.close()
        engine.dispose()


def test_job_payload_round_trip_preserves_bounded_retry_attempt():
    job = ScanJob("scan-1", "C:/scan/repository", ("sast", "crypto"), project_id="project-1")
    retried = job.for_retry()

    assert retried.attempt == 1
    assert ScanJob.decode(retried.encode()) == retried
    assert ScanJob.decode(
        '{"payload_version":1,"scan_id":"old-scan","repository_workspace":"C:/old/repository",'
        '"selected_engines":["sast"]}'
    ).project_id is None
    with pytest.raises(ValueError, match="no project ID"):
        ScanJob("scan-2", "C:/scan/repository", ("sast",))


def test_worker_ingestion_uses_configured_upload_root(monkeypatch, tmp_path):
    from app.services import storage_service
    from ingestion import scan_adapter

    uploads_root = tmp_path / "uploads"
    uploads_root.mkdir()
    scan_id = str(uuid.uuid4())
    expected_workspace = uploads_root / "scans" / scan_id / "repository"
    calls = []

    monkeypatch.setattr(storage_service, "STORAGE_DIR", uploads_root)
    monkeypatch.setattr(
        scan_adapter,
        "ingest_scan_upload",
        lambda archive, ident, storage_root, uploads_root=None: calls.append(
            (archive, ident, storage_root, uploads_root)
        ) or {"files": []},
    )
    _, _, _, ingest_scan = scan_worker._import_pipeline()

    archive = uploads_root / "org" / "upload.zip"
    assert ingest_scan(archive, scan_id, expected_workspace) == {"files": []}
    assert calls == [(archive, scan_id, uploads_root, uploads_root)]

    with pytest.raises(ValueError, match="Invalid scan workspace"):
        ingest_scan(archive, scan_id, tmp_path / "outside" / "repository")


def test_worker_claim_is_atomic_and_cancellation_blocks_progress(db_session):
    scan = ScanRow(
        id="scan-1",
        status="QUEUED",
        engine_statuses={"sast": "PENDING"},
    )
    db_session.add(scan)
    db_session.commit()

    assert _set_status(scan, "INGESTING", db_session)
    assert scan.status == "INGESTING" and scan.started_at is not None
    assert not _set_status(scan, "INGESTING", db_session)

    db_session.execute(update(ScanRow).where(ScanRow.id == scan.id).values(status="ANALYZING"))
    db_session.commit()
    _record_engine_status(scan, "sast", "RUNNING", db_session)
    assert scan.engine_statuses == {"sast": "RUNNING"}

    db_session.execute(update(ScanRow).where(ScanRow.id == scan.id).values(status="CANCELLED"))
    db_session.commit()
    with pytest.raises(ScanCancelledError):
        _record_engine_status(scan, "sast", "COMPLETED", db_session)


def test_pipeline_reports_each_engine_outcome_and_propagates_cancellation():
    pipeline = AnalysisPipeline(
        engines=(FakeEngine(EngineName.SAST), FakeEngine(EngineName.CRYPTO, fail=True))
    )
    statuses = []
    result = pipeline.run([], lambda name, status: statuses.append((name, status)))

    assert statuses == [
        ("sast", "RUNNING"),
        ("sast", "COMPLETED"),
        ("crypto", "RUNNING"),
        ("crypto", "FAILED"),
    ]
    assert result.errors_by_engine["crypto"]

    with pytest.raises(ScanCancelledError):
        pipeline.run([], lambda _name, _status: (_ for _ in ()).throw(ScanCancelledError()))


def test_scan_worker_persists_each_engine_status(worker_db, monkeypatch):
    db, scan, zip_path = worker_db

    class Pipeline:
        DEFAULT_ENGINES = AnalysisPipeline.DEFAULT_ENGINES

        def __init__(self, engines, scan_id=""):
            self.engines = engines
            self.scan_id = scan_id

        def run(self, files, on_engine_status, *, root_dir=None):
            findings = {}
            for engine in self.engines:
                name = engine.name.value
                on_engine_status(name, "RUNNING")
                on_engine_status(name, "COMPLETED")
                findings[name] = ()
            return PipelineResult(
                findings_by_engine=findings,
                files_processed_by_engine={name: 0 for name in findings},
                errors_by_engine={name: () for name in findings},
            )

    monkeypatch.setattr(
        scan_worker,
        "_import_pipeline",
        lambda: (
            Pipeline,
            ScanCancelledError,
            lambda findings, _root: findings,
            lambda _zip, _scan_id, _dir: {"files": []},
        ),
    )
    workspace = zip_path.parent.parent / "scans" / scan.id / "repository"
    job = ScanJob(scan.id, str(workspace), ("sast", "crypto"), project_id=scan.project_id)

    assert scan_worker.process_scan(job, db)
    db.refresh(scan)
    assert scan.status == "COMPLETED"
    assert scan.engine_statuses == {"sast": "COMPLETED", "crypto": "COMPLETED"}


def test_scan_worker_stops_after_cancellation(worker_db, monkeypatch):
    db, scan, zip_path = worker_db

    class CancellingPipeline:
        DEFAULT_ENGINES = AnalysisPipeline.DEFAULT_ENGINES

        def __init__(self, engines, scan_id=""):
            self.engines = engines
            self.scan_id = scan_id

        def run(self, files, on_engine_status, *, root_dir=None):
            engine_name = self.engines[0].name.value
            on_engine_status(engine_name, "RUNNING")
            db.execute(
                update(Scan).where(Scan.id == scan.id).values(
                    status="CANCELLED",
                    engine_statuses={"sast": "CANCELLED", "crypto": "CANCELLED"},
                )
            )
            db.commit()
            on_engine_status(engine_name, "COMPLETED")
            raise AssertionError("cancelled execution should not reach this point")

    monkeypatch.setattr(
        scan_worker,
        "_import_pipeline",
        lambda: (
            CancellingPipeline,
            ScanCancelledError,
            lambda findings, _root: findings,
            lambda _zip, _scan_id, _dir: {"files": []},
        ),
    )
    workspace = zip_path.parent.parent / "scans" / scan.id / "repository"

    assert not scan_worker.process_scan(
        ScanJob(scan.id, str(workspace), ("sast", "crypto"), project_id=scan.project_id),
        db,
    )
    db.refresh(scan)
    assert scan.status == "CANCELLED"


def test_scan_worker_fails_if_file_inventory_cannot_be_saved(worker_db, monkeypatch):
    db, scan, zip_path = worker_db

    class UnusedPipeline:
        DEFAULT_ENGINES = AnalysisPipeline.DEFAULT_ENGINES

        def __init__(self, engines, scan_id=""):
            raise AssertionError("analysis must not run without a persisted file inventory")

    monkeypatch.setattr(
        scan_worker,
        "_import_pipeline",
        lambda: (
            UnusedPipeline,
            ScanCancelledError,
            lambda findings, _root: findings,
            lambda _zip, _dir: {"files": [{"path": "src/main.py", "file_type": "source"}]},
        ),
    )
    original_commit = db.commit

    def fail_inventory_commit():
        if any(isinstance(item, ScanFile) for item in db.new):
            raise RuntimeError("simulated inventory write failure")
        original_commit()

    monkeypatch.setattr(db, "commit", fail_inventory_commit)
    workspace = zip_path.parent.parent / "scans" / scan.id / "repository"

    assert not scan_worker.process_scan(
        ScanJob(scan.id, str(workspace), ("sast", "crypto"), project_id=scan.project_id),
        db,
    )
    db.refresh(scan)
    assert scan.status == "FAILED"
    assert scan.error_message == "Repository file inventory could not be saved."
    assert db.query(ScanFile).filter(ScanFile.scan_id == scan.id).count() == 0


def test_scan_worker_rejects_job_for_another_project(worker_db, monkeypatch):
    db, scan, zip_path = worker_db
    workspace = zip_path.parent.parent / "scans" / scan.id / "repository"
    job = ScanJob(scan.id, str(workspace), ("sast", "crypto"), project_id="other-project")

    assert not scan_worker.process_scan(job, db)
    db.refresh(scan)
    assert scan.status == "FAILED"
    assert scan.error_message == "Invalid scan job project reference"


def test_unexpected_worker_failure_marks_active_scan_and_engine_failed(worker_db):
    db, scan, _zip_path = worker_db
    scan.status = "ANALYZING"
    scan.engine_statuses = {"sast": "RUNNING", "crypto": "COMPLETED"}
    db.commit()

    mark_unexpected_failure(scan.id, db)

    db.refresh(scan)
    assert scan.status == "FAILED"
    assert scan.completed_at is not None
    assert scan.engine_statuses == {"sast": "FAILED", "crypto": "COMPLETED"}


def test_scan_state_survives_database_connection_restart(tmp_path):
    db_path = tmp_path / "restart.db"
    first_engine = create_engine(f"sqlite:///{db_path}")
    AppBase.metadata.create_all(first_engine)
    FirstSession = sessionmaker(bind=first_engine)
    with FirstSession() as first_db:
        first_db.add(Organization(id="org-restart", name="Restart Test"))
        first_db.add(Project(id="project-restart", organization_id="org-restart", name="Restart Test"))
        first_db.add(
            Scan(
                id="scan-restart",
                project_id="project-restart",
                status="ANALYZING",
                repository_path="C:/isolated/repository.zip",
                engine_statuses={"sast": "COMPLETED", "crypto": "RUNNING"},
            )
        )
        first_db.commit()
    first_engine.dispose()

    restarted_engine = create_engine(f"sqlite:///{db_path}")
    RestartedSession = sessionmaker(bind=restarted_engine)
    with RestartedSession() as restarted_db:
        scan = restarted_db.get(Scan, "scan-restart")
        assert scan is not None
        assert scan.status == "ANALYZING"
        assert scan.engine_statuses == {"sast": "COMPLETED", "crypto": "RUNNING"}
    restarted_engine.dispose()


def test_retry_is_bounded_and_only_applies_before_scan_claim(worker_db):
    db, scan, zip_path = worker_db
    job = ScanJob(
        scan.id,
        "C:/scan/repository",
        ("sast", "crypto"),
        project_id=scan.project_id,
    )
    enqueued = []

    assert retry_unclaimed_job(job, db, lambda retry: enqueued.append(retry) or True, 2)
    assert enqueued[0].attempt == 1

    db.execute(update(Scan).where(Scan.id == scan.id).values(status="INGESTING"))
    db.commit()
    assert not retry_unclaimed_job(job, db, lambda retry: enqueued.append(retry) or True, 2)
    assert not retry_unclaimed_job(job.for_retry().for_retry(), db, lambda retry: enqueued.append(retry) or True, 2)
    assert len(enqueued) == 1
