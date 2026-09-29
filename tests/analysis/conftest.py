import enum
import os
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))  # repo root, for `tests.conftest`
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "fixtures"))
sys.path.insert(0, str(Path(__file__).resolve().parent))

# Advisory-run helper for Python < 3.11 (see analysis_adapter.py). Opt-in only.
if os.getenv("PQC_ANALYSIS_STRENUM_POLYFILL") == "1" and not hasattr(enum, "StrEnum"):
    class _StrEnum(str, enum.Enum):
        def __str__(self):
            return str.__str__(self)
    enum.StrEnum = _StrEnum

import analysis_adapter  # noqa: E402
import make_zips  # noqa: E402


@pytest.fixture(scope="session")
def lib():
    return analysis_adapter.load()


@pytest.fixture(scope="session")
def demo_files(tmp_path_factory):
    """Extract the vulnerable demo repo (plain zipfile, independent of ingestion) and return file paths."""
    import zipfile
    zips = make_zips.build_all(tmp_path_factory.mktemp("zips"))
    root = tmp_path_factory.mktemp("demo")
    with zipfile.ZipFile(zips["demo-banking.zip"]) as z:
        z.extractall(root)
    return root, sorted(p for p in root.rglob("*") if p.is_file())


@pytest.fixture
def make_finding(lib):
    def _make(**over):
        base = dict(finding_id="00000000-0000-4000-8000-000000000001", engine=lib.EngineName.SAST,
                    category="injection", severity=lib.Severity.HIGH, title="SQL injection",
                    file_path="demo_bank/app.py", line_number=10, evidence="cur.execute(q + x)",
                    confidence=0.9, recommendation="Use parameterised queries")
        base.update(over)
        return lib.Finding(**base)
    return _make
