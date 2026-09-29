# Analysis engine foundation

This package defines the common contract for deterministic analysis engines. It uses only the Python standard library and targets Python 3.11+.

## Shared contract

- `AnalysisEngine` exposes a stable `name` and an `analyze(files)` method.
- `EngineName` is one of `sast`, `crypto`, `dependency`, or `configuration`.
- `Severity` is one of `critical`, `high`, `medium`, or `low`.
- `Finding` normalizes the fields used by the Day 1 Finding API contract and validates required values, severity, line number, and confidence.
- `AnalysisResult` contains findings, a non-negative `files_processed` count, and any error messages.

## Development engine

`DummyEngine` demonstrates the interface. It returns one synthetic low-severity finding with `is_development=True`; this fixture does not describe a real vulnerability and must not be used for security decisions.

Because the requested directory is named `analysis-engines` (with a hyphen), add that directory to `PYTHONPATH` and import its modules from the repository root, for example:

```powershell
$env:PYTHONPATH = "analysis-engines"
python -c "from dummy_engine import DummyEngine; from pathlib import Path; print(DummyEngine().analyze([Path('example.py')]))"
```

## Adding an engine

1. Add an implementation under the matching directory (`sast/`, `crypto/`, `dependency/`, or `configuration/`).
2. Subclass `AnalysisEngine` and return the corresponding `EngineName` from `name`.
3. Implement `analyze(files)` and return an `AnalysisResult` containing only validated `Finding` objects.
4. Keep engine-specific detection and errors inside the engine; use the shared `Finding` fields and severity values at its boundary.
5. Mark fixtures with `is_development=True` and label their evidence clearly. Do not represent fixtures as real findings.

Run checks from the repository root with `PYTHONPATH=analysis-engines python -m pytest analysis-engines/` once tests are added.
