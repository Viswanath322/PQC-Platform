from fastapi import APIRouter

from app.api.v1 import projects, redis_test, scans, uploads
from app.api.v1.routes import auth, health

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
for route_module in (projects, uploads, scans, redis_test):
    api_router.include_router(route_module.router)
