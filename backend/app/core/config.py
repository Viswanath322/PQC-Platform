from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "development"
    database_url: str
    jwt_secret_key: str = Field(min_length=32)
    jwt_algorithm: Literal["HS256"] = "HS256"
    access_token_expire_minutes: int = 30
    allow_public_registration: bool = False
    cors_origins: str = (
        "http://localhost:5173,http://127.0.0.1:5173,"
        "tauri://localhost,http://tauri.localhost"
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        hide_input_in_errors=True,
    )

    @field_validator("jwt_secret_key")
    @classmethod
    def reject_known_placeholder_secrets(cls, value: str) -> str:
        normalized = value.strip().lower()
        placeholders = {
            "development-only-change-this-secret",
            "replace-this-with-a-long-random-local-secret",
            "change_me_locally",
        }
        if normalized in placeholders or "replace-with" in normalized:
            raise ValueError("JWT_SECRET_KEY must be a unique random secret, not a placeholder")
        return value

    @property
    def allowed_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
