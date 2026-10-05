from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import InvalidTokenError, decode
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.core.config import get_settings
from app.core.database import get_db
from app.core.auth_throttle import login_throttle
from app.core.security import (
    DUMMY_PASSWORD_HASH,
    create_access_token,
    create_organization_id,
    hash_password,
    verify_password,
)
from app.models import Organization, User
from app.schemas.auth import LoginRequest, RegisterAccepted, RegisterRequest, TokenResponse, UserResponse

router = APIRouter()
bearer_scheme = HTTPBearer(auto_error=False)
LOGIN_FAILURE_LIMIT = 10
LOGIN_IP_FAILURE_LIMIT = 40


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Resolve the authenticated user or return a consistent 401 response."""
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired access token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None:
        raise unauthorized

    settings = get_settings()
    try:
        claims = decode(
            credentials.credentials,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
            options={"require": ["exp", "sub"]},
        )
        subject = claims.get("sub")
        if not isinstance(subject, str):
            raise ValueError("Invalid token subject")
    except (InvalidTokenError, TypeError, ValueError):
        raise unauthorized from None

    user = db.get(User, subject)
    if user is None:
        raise unauthorized
    return user


def get_user_organization_id(user: User) -> str:
    """Reject accounts that cannot be safely scoped to an organization."""
    if not user.organization_id:
        raise HTTPException(status_code=403, detail="User is not assigned to an organization")
    return user.organization_id


@router.post("/register", response_model=RegisterAccepted, status_code=status.HTTP_202_ACCEPTED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> RegisterAccepted:
    if not get_settings().allow_public_registration:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Registration is currently disabled")

    organization_id = create_organization_id()
    organization = Organization(id=organization_id, name=f"Workspace for {payload.email}")
    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        organization_id=organization_id,
    )
    db.add(organization)
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        if db.scalar(select(User.id).where(User.email == payload.email)) is None:
            raise
    return RegisterAccepted()


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)) -> TokenResponse:
    client_host = request.client.host if request.client else "unknown"
    bucket = login_throttle.key(client_host, payload.email)
    ip_bucket = login_throttle.ip_key(client_host)
    locked_buckets = [key for key in (bucket, ip_bucket) if login_throttle.is_locked(key)]
    if locked_buckets:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts. Try again later.",
            headers={"Retry-After": str(max(login_throttle.retry_after(key) for key in locked_buckets))},
        )
    user = db.scalar(select(User).where(User.email == payload.email))
    password_hash = user.password_hash if user is not None else DUMMY_PASSWORD_HASH
    password_valid = verify_password(payload.password, password_hash)
    if user is None or not password_valid:
        login_throttle.record_failure(bucket, LOGIN_FAILURE_LIMIT)
        login_throttle.record_failure(ip_bucket, LOGIN_IP_FAILURE_LIMIT)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    login_throttle.clear(bucket)
    login_throttle.clear(ip_bucket)
    return TokenResponse(access_token=create_access_token(str(user.id)))


@router.get("/me", response_model=UserResponse)
def me(user: User = Depends(get_current_user)) -> User:
    return user
