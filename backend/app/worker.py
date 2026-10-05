"""Redis-backed scan queue consumer. Run with ``python -m app.worker``."""

from __future__ import annotations

import logging
import time

import redis

from app.core.database import SessionLocal
from app.models import Scan
from app.services.redis_service import QUEUE_KEY, get_redis
from app.services.scan_worker import process_scan

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def run_worker() -> None:
    """Consume queued scan IDs; reconnect after transient Redis failures."""
    while True:
        try:
            item = get_redis().blpop(QUEUE_KEY, timeout=5)
        except redis.RedisError:
            logger.warning("Redis queue unavailable; checking persisted QUEUED scans")
            item = None
            time.sleep(2)

        scan_id = item[1] if item is not None else None
        if scan_id is None:
            # Aakash's API persists a QUEUED row with X-Queue-Status=deferred
            # when Redis is unavailable. Polling the DB lets that scan recover
            # after Redis returns without requiring the user to upload again.
            db = SessionLocal()
            try:
                pending = db.query(Scan.id).filter(Scan.status == "QUEUED").order_by(Scan.created_at.asc()).first()
                scan_id = pending[0] if pending else None
            except Exception:
                logger.exception("Could not check persisted queued scans")
                db.rollback()
            finally:
                db.close()
            if scan_id is None:
                continue
        db = SessionLocal()
        try:
            scan = db.get(Scan, scan_id)
            if scan is None or scan.status != "QUEUED":
                continue
            process_scan(scan_id, db)
        except Exception:
            logger.exception("Unexpected failure while processing scan %s", scan_id)
            db.rollback()
            scan = db.get(Scan, scan_id)
            if scan is not None and scan.status not in {"COMPLETED", "CANCELLED"}:
                scan.status = "FAILED"
                scan.error_message = "SCAN_PROCESSING_FAILED"
                db.commit()
        finally:
            db.close()


if __name__ == "__main__":
    run_worker()
