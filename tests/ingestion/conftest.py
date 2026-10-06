import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "fixtures"))
import make_zips  # noqa: E402


@pytest.fixture(scope="session")
def zips(tmp_path_factory):
    """All generated fixture ZIPs (built once per session in a temp dir)."""
    return make_zips.build_all(tmp_path_factory.mktemp("zips"))


@pytest.fixture
def sandbox(tmp_path):
    """(parent, dest): dest is the scan dir; anything appearing in parent besides dest is an escape."""
    parent = tmp_path / "sandbox"
    parent.mkdir()
    return parent, parent / "scan-0001"
