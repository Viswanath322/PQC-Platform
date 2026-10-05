import os
import logging

import redis

QUEUE_KEY = "pqc:scan_queue"
logger = logging.getLogger("pqc.queue")


def get_redis() -> redis.Redis:
    return redis.Redis.from_url(
        os.getenv("REDIS_URL") or "redis://127.0.0.1:6379/0",
        decode_responses=True,
        socket_connect_timeout=2,
    )


def enqueue_scan(scan_id: str) -> bool:
    """Queue a scan ID; scan creation remains successful if Redis is unavailable."""
    try:
        get_redis().rpush(QUEUE_KEY, scan_id)
        return True
    except redis.RedisError as exc:
        logger.warning("Redis enqueue failed for scan %s: %s", scan_id, exc)
        return False


def dequeue_scan(scan_id: str) -> bool:
    """Best-effort removal of a cancelled scan from the pending queue."""
    try:
        get_redis().lrem(QUEUE_KEY, 0, scan_id)
        return True
    except redis.RedisError as exc:
        logger.warning("Redis dequeue failed for scan %s: %s", scan_id, exc)
        return False
