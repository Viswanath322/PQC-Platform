import redis
from fastapi import APIRouter, HTTPException

from app.services.redis_service import QUEUE_KEY, get_redis

router = APIRouter(prefix="/redis", tags=["redis"])


@router.get("/ping")
def redis_ping():
    try:
        client = get_redis()
        return {"redis": "ok" if client.ping() else "down", "queue_length": client.llen(QUEUE_KEY)}
    except redis.RedisError as exc:
        raise HTTPException(503, f"Redis unavailable: {exc}") from exc
