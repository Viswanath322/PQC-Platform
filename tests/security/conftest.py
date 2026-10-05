"""Fixtures for tests/security: the tree under test is selected with PQC_SCAN_ROOT."""
import os
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent))

REPO_ROOT = Path(__file__).resolve().parents[2]


@pytest.fixture(scope="session")
def scan_root() -> Path:
    root = Path(os.getenv("PQC_SCAN_ROOT", str(REPO_ROOT))).resolve()
    if not root.is_dir():
        pytest.fail(f"PQC_SCAN_ROOT does not exist: {root}")
    return root
