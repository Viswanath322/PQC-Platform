from fastapi import FastAPI
from app.core.database import Base, engine
from app.models import scan  # noqa: registers tables
from app.api.v1 import projects, uploads, scans, redis_test

# Only auto-create tables on the local SQLite dev DB.
# On MySQL the schema comes from database/schema.sql, so a mismatch fails loudly instead of being skipped.
if engine.dialect.name == "sqlite":
    Base.metadata.create_all(bind=engine)

app = FastAPI(title="Aakash dev")
for r in (projects, uploads, scans, redis_test):
    app.include_router(r.router, prefix="/api/v1")
