# Analysis engine foundation

This package defines the common contract for deterministic analysis engines. It uses only the Python standard library and targets Python 3.11+.

## Shared contract

- `AnalysisEngine` exposes a stable `name` and an `analyze(files)` method.
- `EngineName` is one of `sast`, `crypto`, `dependency`, or `configuration`.
- `Severity` is one of `critical`, `high`, `medium`, or `low`.
- `Finding` normalizes the fields used by the Day 1 Finding API contract, requires a canonical UUID finding ID, and validates required values, severity, line number, and confidence.
- `confidence` is a numeric value from 0 to 1. `is_development` is boolean metadata, defaulting to false; development fixtures should not be persisted or surfaced as real security findings.
- `AnalysisResult` contains findings, a non-negative `files_processed` count, and any error messages.

## Development engine

`DummyEngine` demonstrates the interface. It returns one synthetic low-severity finding with `is_development=True`; this fixture does not describe a real vulnerability and must not be used for security decisions.

The source directory follows the team guide's `analysis-engines/` name. The repository-root `analysis_engines` package makes the code importable with a valid Python module name:

```powershell
python -c "from pathlib import Path; from analysis_engines import DummyEngine; print(DummyEngine().analyze([Path('example.py')]))"
```

## Adding an engine

1. Add an implementation under the matching directory (`sast/`, `crypto/`, `dependency/`, or `configuration/`).
2. Subclass `AnalysisEngine` and return the corresponding `EngineName` from `name`.
3. Implement `analyze(files)` and return an `AnalysisResult` containing only validated `Finding` objects.
4. Keep engine-specific detection and errors inside the engine; use the shared `Finding` fields and severity values at its boundary.
5. Mark fixtures with `is_development=True` and label their evidence clearly. Do not represent fixtures as real findings.

Run checks from the repository root with `python -m pytest analysis-engines/`.

Integration note: the Day 1 MySQL schema currently stores `confidence` as text and has no `is_development` column. Keep the engine/API contract numeric and filter development fixtures before persistence; if a future flow needs to persist these fields, update storage and API contracts together rather than silently changing their types.
