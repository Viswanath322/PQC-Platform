from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import InvalidTokenError, decode
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import create_access_token, hash_password, verify_password
from app.models import Organization, User
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserResponse

router = APIRouter()
bearer_scheme = HTTPBearer(auto_error=False)
DEFAULT_ORGANIZATION_ID = "org-default-001"


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
        claims = decode(credentials.credentials, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
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


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> User:
    existing = db.scalar(select(User).where(User.email == payload.email))
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already registered")

    organization = db.get(Organization, DEFAULT_ORGANIZATION_ID)
    if organization is None:
        raise HTTPException(status_code=503, detail="Default organization is not configured")

    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        organization_id=organization.id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.scalar(select(User).where(User.email == payload.email))
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    return TokenResponse(access_token=create_access_token(str(user.id)))


@router.get("/me", response_model=UserResponse)
def me(user: User = Depends(get_current_user)) -> User:
    return user
