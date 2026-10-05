import redis
from fastapi import APIRouter, Depends, HTTPException
from app.api.v1.routes.auth import get_current_user
from app.models import User

from app.services.redis_service import QUEUE_KEY, get_redis

router = APIRouter(prefix="/redis", tags=["redis"])


@router.get("/ping")
def redis_ping(_user: User = Depends(get_current_user)):
    try:
        client = get_redis()
        return {"redis": "ok" if client.ping() else "down", "queue_length": client.llen(QUEUE_KEY)}
    except redis.RedisError:
        raise HTTPException(503, "Redis unavailable") from None
