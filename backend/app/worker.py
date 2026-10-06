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
from app.services.redis_service import QUEUE_KEY, get_redis
from app.services.scan_worker import process_scan

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("pqc.worker")

_running = True


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

            _, job_item = item
            logger.info("Worker picked up scan job: %s", job_item)

            db = SessionLocal()
            try:
                success = process_scan(job_item, db)
                logger.info("Scan job completed with result: %s", success)
            except Exception as exc:  # noqa: BLE001
                logger.exception("Unexpected error processing scan job: %s", exc)
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
