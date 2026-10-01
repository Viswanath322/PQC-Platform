"""Env/config helpers for database tests (mirrors tests/conftest.py conventions)."""
import os
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
MYSQL_URL = os.getenv("PQC_MYSQL_URL", "mysql://pqc:change_me_locally@127.0.0.1:3306/pqc_security")
REDIS_URL = os.getenv("PQC_REDIS_URL", "redis://127.0.0.1:6379/0")


def blocked(reason: str):
    pytest.skip(f"BLOCKED: {reason}")
