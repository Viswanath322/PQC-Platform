from fastapi import FastAPI
from app.core.database import Base, engine
from app.models import scan  # noqa: registers tables
from app.api.v1 import projects, uploads, scans, redis_test

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Aakash dev")
for r in (projects, uploads, scans, redis_test):
    app.include_router(r.router, prefix="/api/v1")
