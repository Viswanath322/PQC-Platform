"""Backward-compatible import path for the shared user model."""

from database.models import Organization, User

__all__ = ["Organization", "User"]
