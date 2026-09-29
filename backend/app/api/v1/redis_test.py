import redis
from fastapi import APIRouter, HTTPException
from app.services.redis_service import get_redis, QUEUE_KEY

router = APIRouter(prefix="/redis", tags=["redis"])


@router.get("/ping")
def redis_ping():
    try:
        r = get_redis()
        return {"redis": "ok" if r.ping() else "down", "queue_length": r.llen(QUEUE_KEY)}
    except redis.RedisError as e:
        raise HTTPException(503, f"Redis unavailable: {e}")
