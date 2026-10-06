from collections.abc import Generator
from datetime import datetime

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings
from database.models import Base, Finding, Organization, Project, Scan, User

settings = get_settings()

is_sqlite = settings.database_url.startswith("sqlite")
connect_args = {"check_same_thread": False} if is_sqlite else {}
engine_kwargs = {
    "echo": False,
    "connect_args": connect_args,
}
if not is_sqlite:
    engine_kwargs["pool_pre_ping"] = True
    engine_kwargs["pool_recycle"] = 3600

engine = create_engine(settings.database_url, **engine_kwargs)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def init_db() -> None:
    """Initialize database tables and default seed data if not present."""
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        # Seed Default Organization
        default_org = db.query(Organization).filter_by(id="org-default-001").first()
        if not default_org:
            default_org = Organization(id="org-default-001", name="Default Organization")
            db.add(default_org)
            db.commit()

        # Seed Admin User
        admin = db.query(User).filter_by(email="admin@pqc.example").first()
        if not admin:
            from app.core.security import hash_password

            admin = User(
                id="00000000-0000-0000-0000-000000000001",
                organization_id="org-default-001",
                email="admin@pqc.example",
                password_hash=hash_password("change_me_locally"),
                role="admin",
            )
            db.add(admin)
            db.commit()

        # Seed Demo Project
        project = db.query(Project).filter_by(id="00000000-0000-0000-0001-000000000001").first()
        if not project:
            project = Project(
                id="00000000-0000-0000-0001-000000000001",
                organization_id="org-default-001",
                name="Demo Banking Application",
                description="Sample legacy banking app repository for Day 1 security & PQC assessment testing",
            )
            db.add(project)
            db.commit()

        # Seed Initial Scan
        scan = db.query(Scan).filter_by(id="a8098c1a-f86e-11da-bd1a-00112444be1e").first()
        if not scan:
            scan = Scan(
                id="a8098c1a-f86e-11da-bd1a-00112444be1e",
                project_id="00000000-0000-0000-0001-000000000001",
                status="COMPLETED",
                repository_path="uploads/demo-banking.zip",
                started_at=datetime.utcnow(),
                completed_at=datetime.utcnow(),
            )
            db.add(scan)
            db.commit()

        # Seed Mock Findings
        if not db.query(Finding).filter_by(scan_id="a8098c1a-f86e-11da-bd1a-00112444be1e").first():
            db.add_all(
                [
                    Finding(
                        id="00000000-0000-0000-0002-000000000001",
                        scan_id="a8098c1a-f86e-11da-bd1a-00112444be1e",
                        engine="crypto",
                        category="Weak Cryptography",
                        severity="high",
                        title="Vulnerable RSA-1024 Key Size Detected",
                        file_path="src/crypto/key_generator.py",
                        line_number=42,
                        evidence="RSA.generate(1024)",
                        explanation="RSA with 1024-bit modulus is cryptographically broken and vulnerable to factorization attacks.",
                        confidence=0.95,
                        recommendation="Upgrade to post-quantum hybrid algorithm (ML-KEM/Kyber) or minimum RSA-3072.",
                        is_development=True,
                    ),
                    Finding(
                        id="00000000-0000-0000-0002-000000000002",
                        scan_id="a8098c1a-f86e-11da-bd1a-00112444be1e",
                        engine="sast",
                        category="SQL Injection",
                        severity="critical",
                        title="Potential SQL Injection in User Lookup",
                        file_path="src/auth/service.py",
                        line_number=108,
                        evidence='cursor.execute(f"SELECT * FROM users WHERE id = {user_id}")',
                        explanation="Directly interpolating user input into a SQL query allows attackers to execute arbitrary SQL commands.",
                        confidence=0.85,
                        recommendation="Use parameterized queries with SQLAlchemy prepared statements.",
                        is_development=True,
                    ),
                ]
            )
            db.commit()


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

