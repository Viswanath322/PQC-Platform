import json
import logging
import os
from typing import Any

import redis

QUEUE_KEY = "pqc:scan_queue"
logger = logging.getLogger("pqc.queue")


def get_redis() -> redis.Redis:
    try:
        from app.core.config import get_settings
        url = os.getenv("PQC_REDIS_URL") or os.getenv("REDIS_URL") or get_settings().redis_url
    except Exception:
        url = os.getenv("PQC_REDIS_URL") or os.getenv("REDIS_URL", "redis://127.0.0.1:6379/0")
    return redis.Redis.from_url(
        url,
        decode_responses=True,
        socket_connect_timeout=2,
    )


def enqueue_scan(job: Any) -> bool:
    """Queue a scan analysis job (AnalysisJobPayload, dict, or scan_id string)."""
    try:
        if hasattr(job, "model_dump_json"):
            message = job.model_dump_json()
        elif isinstance(job, dict):
            message = json.dumps(job)
        elif isinstance(job, str):
            if job.strip().startswith("{"):
                message = job
            else:
                from app.schemas.scan import AnalysisJobPayload
                message = AnalysisJobPayload(
                    scan_id=job.strip(),
                    repository_workspace=f"storage/uploads/{job.strip()}.zip",
                ).model_dump_json()
        else:
            message = str(job)

        get_redis().rpush(QUEUE_KEY, message)
        return True
    except redis.RedisError as exc:
        scan_id = getattr(job, "scan_id", str(job))
        logger.warning("Redis enqueue failed for scan %s: %s", scan_id, exc)
        return False


def dequeue_scan(scan_id: str) -> bool:
    """Best-effort removal of a cancelled scan from the pending queue."""
    try:
        r = get_redis()
        # Remove exact raw scan_id match if present
        r.lrem(QUEUE_KEY, 0, scan_id)

        # Also search and remove serialized JSON payloads containing this scan_id
        items = r.lrange(QUEUE_KEY, 0, -1)
        for item in items:
            if scan_id in item:
                try:
                    parsed = json.loads(item)
                    if isinstance(parsed, dict) and parsed.get("scan_id") == scan_id:
                        r.lrem(QUEUE_KEY, 0, item)
                except Exception:
                    # In case of malformed queue item, still remove if substring matches
                    if f'"{scan_id}"' in item:
                        r.lrem(QUEUE_KEY, 0, item)
        return True
    except redis.RedisError as exc:
        logger.warning("Redis dequeue failed for scan %s: %s", scan_id, exc)
        return False


def acquire_scan_lock(scan_id: str, ttl_seconds: int = 3600) -> bool:
    """Atomic distributed lock to prevent duplicate concurrent execution of the same scan."""
    try:
        r = get_redis()
        return bool(r.set(f"pqc:scan:lock:{scan_id}", "processing", nx=True, ex=ttl_seconds))
    except Exception as exc:
        logger.debug("acquire_scan_lock check bypassed (Redis unavailable: %s)", exc)
        return True  # Fallback to DB state transition if Redis is offline


def release_scan_lock(scan_id: str) -> None:
    """Release distributed execution lock for the scan."""
    try:
        get_redis().delete(f"pqc:scan:lock:{scan_id}")
    except Exception:
        pass


def set_scan_cancelled(scan_id: str) -> None:
    """Set fast cancellation marker in Redis for immediate worker abort."""
    try:
        get_redis().set(f"pqc:scan:cancelled:{scan_id}", "1", ex=86400)
    except Exception:
        pass


def is_scan_cancelled_in_redis(scan_id: str) -> bool:
    """Check fast cancellation marker in Redis."""
    try:
        return bool(get_redis().get(f"pqc:scan:cancelled:{scan_id}"))
    except Exception:
        return False

