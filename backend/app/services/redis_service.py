import logging
import os
import redis

QUEUE_KEY = "pqc:scan_queue"
logger = logging.getLogger("pqc.queue")


def get_redis() -> redis.Redis:
    # With a password: redis://:change_me_locally@127.0.0.1:6379/0
    return redis.Redis.from_url(
        os.getenv("REDIS_URL", "redis://127.0.0.1:6379/0"),
        decode_responses=True,
        socket_connect_timeout=2,
    )


def enqueue_scan(scan_id: str) -> bool:
    """Push the scan id on the queue. Never raises: the scan row in the DB is the source of truth.
    Returns False (and logs a warning) if Redis is unreachable so the caller can report it."""
    try:
        get_redis().rpush(QUEUE_KEY, scan_id)
        return True
    except redis.RedisError as exc:
        logger.warning("Redis enqueue failed for scan %s: %s", scan_id, exc)
        return False


def dequeue_scan(scan_id: str) -> bool:
    """Remove a (cancelled) scan id from the queue. Best effort."""
    try:
        get_redis().lrem(QUEUE_KEY, 0, scan_id)
        return True
    except redis.RedisError as exc:
        logger.warning("Redis dequeue failed for scan %s: %s", scan_id, exc)
        return False
