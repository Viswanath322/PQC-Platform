"""Contract tests for Harshitha's analysis-engine foundation (branch backend/harshitha-analysis).

Blocked unless PQC_ANALYSIS_ROOT points at the checkout (and Python >= 3.11, or the StrEnum polyfill opt-in).
"""
import dataclasses
import inspect
import json
import subprocess
import sys
from pathlib import Path

import pytest

from tests.conftest import REPO_ROOT, blocked

ENGINES = {"sast", "crypto", "dependency", "configuration"}
SEVERITIES = {"critical", "high", "medium", "low"}
FIELDS = ["finding_id", "engine", "category", "severity", "title", "file_path", "line_number",
          "evidence", "confidence", "recommendation"]


# ------------------------------------------------------------------ interface
def test_engine_interface_is_abstract(lib):
    assert inspect.isabstract(lib.AnalysisEngine)
    with pytest.raises(TypeError):
        lib.AnalysisEngine()
    assert {"name", "analyze"} <= set(lib.AnalysisEngine.__abstractmethods__)


def test_subclass_missing_analyze_cannot_instantiate(lib):
    class Half(lib.AnalysisEngine):
        name = lib.EngineName.SAST
    with pytest.raises(TypeError):
        Half()


def test_engine_names_exact(lib):
    assert {e.value for e in lib.EngineName} == ENGINES
    assert {s.value for s in lib.Severity} == SEVERITIES
    assert len(lib.EngineName) == 4 and len(lib.Severity) == 4


def test_engine_names_json_are_plain_strings(lib):
    assert json.dumps(lib.EngineName.SAST) == '"sast"'
    assert json.dumps(lib.Severity.CRITICAL) == '"critical"'


# -------------------------------------------------------------------- Finding
def test_finding_has_required_fields(lib):
    names = [f.name for f in dataclasses.fields(lib.Finding)]
    for f in FIELDS:
        assert f in names, f"Finding missing {f}"
    assert "is_development" in names


def test_finding_valid_and_immutable(lib, make_finding):
    f = make_finding()
    assert f.engine == "sast" and f.severity == "high"
    with pytest.raises(dataclasses.FrozenInstanceError):
        f.title = "changed"


@pytest.mark.parametrize("field", ["finding_id", "category", "title", "file_path", "evidence", "recommendation"])
@pytest.mark.parametrize("bad", ["", "   ", None, 123])
def test_finding_rejects_bad_required_strings(field, bad, make_finding):
    with pytest.raises(ValueError):
        make_finding(**{field: bad})


@pytest.mark.parametrize("bad", ["sast", "SAST", "network", None, 1])
def test_finding_rejects_invalid_engine(bad, make_finding):
    with pytest.raises(ValueError):
        make_finding(engine=bad)


@pytest.mark.parametrize("bad", ["high", "HIGH", "info", "urgent", None, 3])
def test_finding_rejects_invalid_severity(bad, make_finding):
    with pytest.raises(ValueError):
        make_finding(severity=bad)


@pytest.mark.parametrize("bad", [0, -1, 1.5, "10", True])
def test_finding_rejects_invalid_line_number(bad, make_finding):
    with pytest.raises(ValueError):
        make_finding(line_number=bad)


def test_finding_line_number_optional(make_finding):
    assert make_finding(line_number=None).line_number is None


@pytest.mark.parametrize("bad", [-0.1, 1.1, float("nan"), float("inf"), "high", None, True])
def test_finding_rejects_invalid_confidence(bad, make_finding):
    with pytest.raises(ValueError):
        make_finding(confidence=bad)


@pytest.mark.parametrize("good", [0, 0.0, 0.5, 1, 1.0])
def test_finding_accepts_confidence_bounds(good, make_finding):
    assert make_finding(confidence=good).confidence == good


def test_finding_missing_required_arg_raises(lib):
    with pytest.raises(TypeError):
        lib.Finding(finding_id="x")


def test_development_flag_defaults_false(make_finding):
    assert make_finding().is_development is False
    with pytest.raises(ValueError):
        make_finding(is_development="yes")


# ------------------------------------------------------------- AnalysisResult
def test_result_defaults_and_fields(lib):
    r = lib.AnalysisResult()
    assert r.findings == () and r.files_processed == 0 and r.errors == ()
    assert [f.name for f in dataclasses.fields(lib.AnalysisResult)] == ["findings", "files_processed", "errors"]


@pytest.mark.parametrize("kw", [
    {"files_processed": -1}, {"files_processed": "3"}, {"files_processed": True},
    {"errors": ("",)}, {"errors": (1,)}, {"errors": ["a"]}, {"findings": ("nope",)}, {"findings": None},
])
def test_result_rejects_invalid(lib, kw):
    with pytest.raises(ValueError):
        lib.AnalysisResult(**kw)


@pytest.mark.xfail(reason="FINDING AE-07: AnalysisResult only accepts tuples; a list of findings/errors "
                          "(the natural thing engines build) raises instead of being coerced", strict=False)
def test_result_accepts_lists(lib, make_finding):
    lib.AnalysisResult(findings=[make_finding()], files_processed=1, errors=["x"])


def test_result_json_serialisable(lib, make_finding):
    r = lib.AnalysisResult(findings=(make_finding(),), files_processed=2, errors=("boom",))
    data = json.loads(json.dumps(dataclasses.asdict(r)))
    assert data["files_processed"] == 2 and data["errors"] == ["boom"]
    assert data["findings"][0]["engine"] == "sast" and data["findings"][0]["severity"] == "high"


@pytest.mark.xfail(reason="FINDING AE-08: no to_dict()/as_dict() on Finding or AnalysisResult; every consumer "
                          "must hand-roll dataclasses.asdict (tuples become lists only by luck of json)", strict=False)
def test_models_have_serialiser(lib, make_finding):
    assert callable(getattr(make_finding(), "to_dict", None))
    assert callable(getattr(lib.AnalysisResult(), "to_dict", None))


@pytest.mark.xfail(reason="FINDING AE-09: no length validation; title>255, category>100, file_path>1024 "
                          "exceed the MySQL findings columns (VARCHAR 255/100/1024)", strict=False)
@pytest.mark.parametrize("field,length", [("title", 256), ("category", 101), ("file_path", 1025)])
def test_finding_rejects_values_too_long_for_db(field, length, make_finding):
    with pytest.raises(ValueError):
        make_finding(**{field: "x" * length})


# ---------------------------------------------------------------- DummyEngine
def test_dummy_engine_is_an_engine(lib):
    e = lib.DummyEngine()
    assert isinstance(e, lib.AnalysisEngine)
    assert e.name in lib.EngineName


def test_dummy_returns_one_marked_development_finding(lib):
    r = lib.DummyEngine().analyze([Path("a.py"), Path("b.py")])
    assert isinstance(r, lib.AnalysisResult)
    assert len(r.findings) == 1 and r.files_processed == 2 and r.errors == ()
    f = r.findings[0]
    assert f.is_development is True
    assert "development" in f.title.lower() or "development" in f.category.lower()
    assert "synthetic" in f.evidence.lower()
    assert f.severity == lib.Severity.LOW


def test_dummy_accepts_generator_and_empty(lib):
    e = lib.DummyEngine()
    assert e.analyze(p for p in [Path("x.py")]).files_processed == 1
    r = e.analyze([])
    assert r.files_processed == 0 and len(r.findings) == 1


def test_dummy_result_json_serialisable(lib):
    r = lib.DummyEngine().analyze([Path("a.py")])
    data = json.loads(json.dumps(dataclasses.asdict(r)))
    assert data["findings"][0]["is_development"] is True


def test_dummy_finding_id_is_uuid(lib):
    """API says finding_id is a 'Stable UUID'; DB findings.id is CHAR(36)."""
    import uuid
    uuid.UUID(lib.DummyEngine().analyze([]).findings[0].finding_id)


def test_dummy_finding_id_unique_per_run(lib):
    """Constant id means a second scan's insert into findings (id is the PRIMARY KEY) conflicts."""
    ids = {lib.DummyEngine().analyze([]).findings[0].finding_id for _ in range(3)}
    assert len(ids) == 3, f"same finding_id every run: {ids}"


def test_dummy_smoke_on_demo_repo(lib, demo_files):
    root, files = demo_files
    r = lib.DummyEngine().analyze(files)
    assert r.files_processed == len(files) and len(files) > 10
    assert len(r.findings) == 1 and r.findings[0].is_development


# --------------------------------------------------------------------- layout
ENGINES_SUBPKGS = ["sast", "crypto", "dependency", "configuration"]


def _engines_dir():
    import base
    return Path(base.__file__).resolve().parent.parent


def test_engine_subpackages_exist(lib):
    d = _engines_dir()
    for name in ENGINES_SUBPKGS:
        assert (d / name / "__init__.py").is_file(), name


def _run(code, cwd, env_extra=None):
    import os
    env = {**os.environ, "PYTHONDONTWRITEBYTECODE": "1", **(env_extra or {})}
    return subprocess.run([sys.executable, "-c", code], cwd=cwd, capture_output=True, text=True, env=env, timeout=60)


def test_layout_import_by_name_is_awkward(lib):
    """`analysis-engines` is not a valid identifier; documenting how each import style behaves."""
    root = _engines_dir().parent
    r = _run("import analysis_engines", root)
    assert r.returncode != 0, "underscore name unexpectedly importable"
    r2 = _run("import importlib; importlib.import_module('analysis-engines')", root)
    assert r2.returncode != 0 and "base" in r2.stderr, (
        "hyphen import_module should fail inside __init__ ('from base...' needs the dir on sys.path)")


@pytest.mark.xfail(reason="FINDING AE-03: package dir is not importable as a package (hyphen) and its own "
                          "__init__.py uses top-level `from base...`; only the PYTHONPATH hack works", strict=False)
def test_layout_importable_as_package(lib):
    root = _engines_dir().parent
    r = _run("import importlib; m = importlib.import_module('analysis-engines'); m.DummyEngine", root)
    assert r.returncode == 0, r.stderr[-300:]


def test_no_pycache_or_pyc_tracked(lib):
    import shutil
    if not shutil.which("git"):
        blocked("git not available")
    root = _engines_dir().parent
    r = subprocess.run(["git", "ls-files"], cwd=root, capture_output=True, text=True)
    if r.returncode != 0:
        blocked("not a git checkout")
    bad = [f for f in r.stdout.splitlines() if f.endswith(".pyc") or "__pycache__" in f]
    assert not bad, f"{len(bad)} compiled files committed, e.g. {bad[0]}"
