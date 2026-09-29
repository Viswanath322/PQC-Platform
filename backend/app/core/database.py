"""
FastAPI Database Session and Engine Configuration
Prepared by: Vamsi (Database Engineer) for Amrutha (Backend Foundation)
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Configured for MySQL 8 instance started via docker-compose.yml
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "mysql+pymysql://pqc:change_me_locally@localhost:3306/pqc_security"
)

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=3600,
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """
    FastAPI dependency that provides a transactional database session.
    Usage in FastAPI router:
        @router.get('/scans')
        def list_scans(db: Session = Depends(get_db)):
            ...
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
