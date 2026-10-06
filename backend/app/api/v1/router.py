from fastapi import APIRouter

from app.api.v1 import findings, projects, redis_test, reports, scans, uploads
from app.api.v1.routes import auth, health

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
for route_module in (projects, uploads, scans, redis_test, findings, reports):
    api_router.include_router(route_module.router)

