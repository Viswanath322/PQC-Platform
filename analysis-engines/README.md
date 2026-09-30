# Analysis Engines

Deterministic, stdlib-only analysis engines for the PQC Security Assessment Platform.

## What exists (Day 2)

| Module | Status | Description |
|--------|--------|-------------|
| `base/` | ✅ Complete | `AnalysisEngine`, `Finding`, `AnalysisResult`, enums |
| `sast/` | ✅ Complete | 11 rules: secrets, SQL/command injection, pickle, path traversal, weak crypto |
| `crypto/` | ✅ Complete | 11 rules: RSA/ECC/DH (quantum-vulnerable), MD5/SHA-1/DES/RC4, CBC/PKCS1v15, weak IV |
| `runner.py` | ✅ Complete | `AnalysisPipeline` — runs SAST + Crypto, deduplicates, returns `PipelineResult` |
| `path_utils.py` | ✅ Complete | `normalize_path` / `normalize_findings_paths` — repository-relative POSIX paths |
| `dummy_engine.py` | ✅ Complete | Dev fixture engine (`is_development=True`) |
| `dependency/` | 🔜 Stub | SBOM / dependency risk — Day 3+ |
| `configuration/` | 🔜 Stub | Infrastructure config analysis — Day 3+ |

## Shared contract

- `AnalysisEngine.analyze(files: Iterable[Path]) → AnalysisResult`
- `EngineName`: `sast | crypto | dependency | configuration`
- `Severity`: `critical | high | medium | low`
- `Finding` fields: `finding_id` (UUID), `engine`, `category`, `severity`, `title`, `file_path`, `line_number`, `evidence`, `confidence` (0–1), `recommendation`, `explanation` (optional), `is_development`
- All `file_path` values must be **repository-relative POSIX paths** — use `path_utils.normalize_findings_paths()` before persistence

## Running engines

```python
from pathlib import Path
from analysis_engines.runner import AnalysisPipeline

files = list(Path("extracted_repo").rglob("*"))
result = AnalysisPipeline().run(files)
print(result.summary_dict())
# result.all_findings → persist to DB via finding_service.persist_findings()
```

## Running from a scan worker

```python
from ingestion.summary import ingest_repository
from analysis_engines.runner import AnalysisPipeline
from analysis_engines.path_utils import normalize_findings_paths

summary = ingest_repository(zip_path, scan_dir)
file_paths = [scan_dir / f["path"] for f in summary["files"]]
result = AnalysisPipeline().run(file_paths)
normalized = normalize_findings_paths(result.all_findings, scan_dir)
# persist normalized findings via finding_service.persist_findings(db, scan_id, normalized)
```

## Running tests

```bash
# From repository root
python -m pytest analysis-engines/tests -v
```

## Design rules

- **No network access, no external pip dependencies** — stdlib only.
- **Deterministic**: same file content → same `finding_id` (UUID5 from rule + file + line).
- **Evidence is redacted**: secret values after `=` are replaced with `[REDACTED]`.
- **`is_development=False`** on all real engine findings. Only `DummyEngine` sets `True`.
- **Engine failures are caught**: one broken engine does not abort the pipeline.
- **File paths are relative**: always call `normalize_findings_paths()` before DB persistence.

## Adding an engine

1. Add implementation under `sast/`, `crypto/`, `dependency/`, or `configuration/`
2. Subclass `AnalysisEngine`, return the correct `EngineName` from `name`
3. Implement `analyze(files)` → `AnalysisResult` with schema-valid `Finding` objects
4. Add the engine to `runner.py` `DEFAULT_ENGINES`
5. Add tests under `analysis-engines/tests/`

Integration note: `findings.explanation` exists in the DB schema and `FindingOut` API schema. Engines may populate it directly; the scan worker persists it alongside `evidence`.
