from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, computed_field


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=12, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    organization_id: str | None
    email: EmailStr
    role: str
    created_at: datetime

    @computed_field
    @property
    def full_name(self) -> str:
        """Provide the display field expected by the desktop UI until names are stored."""
        return self.email.split("@", maxsplit=1)[0]
