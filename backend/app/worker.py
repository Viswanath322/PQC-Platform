"""
Background scan queue worker for the PQC platform.

Consumes scan IDs from the Redis queue `pqc:scan_queue` using BLPOP
and executes the analysis pipeline via `process_scan`.

Usage:
    python -m app.worker
"""

from __future__ import annotations

import logging
import signal
import sys
import time

from app.core.database import SessionLocal
from app.services.job_retry import retry_unclaimed_job
from app.services.redis_service import QUEUE_KEY, ScanJob, enqueue_job, get_redis
from app.services.scan_worker import mark_unexpected_failure, process_scan

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("pqc.worker")

_running = True
MAX_JOB_RETRIES = 2


def _handle_exit(signum, frame):
    global _running
    logger.info("Worker shutting down gracefully (signal %s)...", signum)
    _running = False


def run_worker() -> None:
    signal.signal(signal.SIGINT, _handle_exit)
    signal.signal(signal.SIGTERM, _handle_exit)

    logger.info("PQC scan worker started. Listening on queue '%s'...", QUEUE_KEY)
    r = get_redis()

    while _running:
        try:
            # Allow tests to hold queue consumption during queue-state validation
            if r.get("pqc:worker:paused"):
                time.sleep(0.2)
                continue

            # BLPOP with a timeout so it periodically yields to check _running
            item = r.blpop(QUEUE_KEY, timeout=2)
            if item is None:
                continue

            _, queued_payload = item
            try:
                job = ScanJob.decode(queued_payload)
            except (ValueError, TypeError):
                # Continue accepting scan IDs queued by workers from older builds.
                job = queued_payload
            scan_id = job.scan_id if isinstance(job, ScanJob) else job
            logger.info("Worker picked up scan: %s", scan_id)

            db = SessionLocal()
            try:
                success = process_scan(job, db)
                logger.info("Scan %s completed with result: %s", scan_id, success)
            except Exception as exc:  # noqa: BLE001
                logger.exception("Unexpected error processing scan %s: %s", scan_id, exc)
                try:
                    retry_scheduled = retry_unclaimed_job(job, db, enqueue_job, MAX_JOB_RETRIES)
                    if retry_scheduled:
                        logger.warning(
                            "Scan %s failed before claim; retrying (attempt %d)",
                            scan_id,
                            job.attempt + 1,
                        )
                    if not retry_scheduled:
                        mark_unexpected_failure(scan_id, db)
                except Exception:  # noqa: BLE001
                    logger.exception("Could not mark scan %s as FAILED", scan_id)
            finally:
                db.close()

        except Exception as exc:  # noqa: BLE001
            if not _running:
                break
            logger.warning("Worker loop error (retrying in 2s): %s", exc)
            time.sleep(2)

    logger.info("PQC scan worker stopped.")


if __name__ == "__main__":
    run_worker()
