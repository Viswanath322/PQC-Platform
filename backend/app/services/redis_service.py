import os

import redis

QUEUE_KEY = "pqc:scan_queue"


def get_redis() -> redis.Redis:
    return redis.Redis.from_url(
        os.getenv("REDIS_URL", "redis://127.0.0.1:6379/0"),
        decode_responses=True,
        socket_connect_timeout=2,
    )


def enqueue_scan(scan_id: str) -> bool:
    """Queue a scan ID; scan creation remains successful if Redis is unavailable."""
    try:
        get_redis().rpush(QUEUE_KEY, scan_id)
        return True
    except redis.RedisError:
        return False
