# PQC Platform — QA Test Suite

Author: Pushpam (QA + Cyber Security)

## Layout

```
tests/
├── backend/         FastAPI endpoint tests
├── frontend/        Desktop UI smoke checklist (manual)
├── ingestion/       Ingestion safety and integration tests
├── security/        Security regression checks
├── integration/     End-to-end Day 1 flow tests
└── fixtures/
    └── vulnerable-demo-repo/   ⚠️  INTENTIONALLY INSECURE test material
```

> **WARNING:** `fixtures/vulnerable-demo-repo/` contains deliberate vulnerabilities
> (SQL injection, command injection, hardcoded secrets, weak crypto, path traversal).
> It is **test material only** — never deploy or execute it in any environment.

## Running

```bash
# From the repository root
pip install -r tests/requirements.txt
pytest tests -v -rs
```

Results key:
- **PASSED**  — test verified the requirement
- **FAILED**  — requirement is broken; must be fixed
- **BLOCKED** — test cannot run because a dependency is missing (logged in Day 1 QA report)

## Day 1 acceptance checklist

See `tests/day1_checklist.md` for the full manual + automated checklist.
