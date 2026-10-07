"""Bounded retry policy for scan jobs that failed before processing began."""

from sqlalchemy.orm import Session

from app.models import Scan
from app.services.redis_service import ScanJob


def retry_unclaimed_job(job: ScanJob | str, db: Session, enqueue, max_retries: int) -> bool:
    """Retry only if the scan is still QUEUED, before ingestion side effects."""
    if not isinstance(job, ScanJob) or job.attempt >= max_retries:
        return False

    db.rollback()
    scan = db.get(Scan, job.scan_id)
    if scan is None or scan.status != "QUEUED":
        return False
    return enqueue(job.for_retry())
