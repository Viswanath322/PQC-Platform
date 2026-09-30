from datetime import datetime
from typing import Annotated

from email_validator import EmailNotValidError, validate_email
from pydantic import AfterValidator, BaseModel, ConfigDict, Field, computed_field

from app.core.config import get_settings


def validate_account_email(value: str) -> str:
    """Validate ordinary addresses and allow internal .local addresses in dev/test."""
    candidate = value
    local_domain = False
    if "@" in value:
        local_part, domain = value.rsplit("@", maxsplit=1)
        if domain.lower().endswith(".local"):
            if get_settings().app_env.lower() not in {"development", "dev", "test"}:
                raise ValueError(".local email addresses are only allowed in development and test")
            # Validate the address syntax without globally permitting special-use domains.
            candidate = f"{local_part}@{domain[:-len('.local')]}.example.com"
            local_domain = True

    try:
        normalized = validate_email(candidate, check_deliverability=False).normalized
    except EmailNotValidError as exc:
        raise ValueError(str(exc)) from exc

    if local_domain:
        normalized = normalized.removesuffix(".example.com") + ".local"
    return normalized


AccountEmail = Annotated[str, AfterValidator(validate_account_email)]


class RegisterRequest(BaseModel):
    email: AccountEmail
    password: str = Field(min_length=12, max_length=128)


class LoginRequest(BaseModel):
    email: AccountEmail
    password: str = Field(min_length=1, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    organization_id: str | None
    email: AccountEmail
    role: str
    created_at: datetime

    @computed_field
    @property
    def full_name(self) -> str:
        """Provide the display field expected by the desktop UI until names are stored."""
        return self.email.split("@", maxsplit=1)[0]
