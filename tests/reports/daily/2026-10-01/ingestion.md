# Ingestion retest, 1 Oct 2026

Branch `backend/hima-ingestion` @ `e11e33d` (Hima Bindu). macOS, Python 3.11.16.

## Commands

```bash
PQC_INGESTION_ROOT=.worktrees/hima pytest tests/ingestion -v -rs
cd .worktrees/hima && pytest ingestion/tests -v
PQC_SCAN_ROOT=.worktrees/hima pytest tests/security -v -rs
bandit -r ingestion; pyflakes ingestion; ruff check ingestion
```

Plus a code review of all of `ingestion/` and about 60 hand-built malicious ZIPs run through the public API in a scratch folder, with a sentinel folder to catch anything written outside the extraction root.

## Numbers

| Run | Pass | Fail | Blocked | XFail | XPass |
|---|---|---|---|---|---|
| QA `tests/ingestion` | 45 | 1 | 2 | 1 | 12 |
| Hima's own tests | 17 | 0 | 0 | 0 | 0 |
| QA `tests/security` | 16 | 8 | 21 | 0 | 0 |

The 2 blocked tests only need `PQC_DEMO_REPO` set. The 8 security failures are all the missing root `.gitignore` (SEC-02). This branch only ships `ingestion/`, so that's **Waiting on merge** (owner: whoever owns `main`), not a bug in Hima's code. bandit and pyflakes are clean, and ruff has 6 import-order warnings.

## Yesterday's items

| ID | Status | Label | Notes |
|---|---|---|---|
| ING-01 zip bomb | Fixed | Branch bug | Size, ratio, file-count and entry-count limits, plus a streamed cap that doesn't trust the header sizes. 300 MB and 600 MB bombs and 100k-file archives are rejected in under a second, and nothing is written |
| ING-04 unknown types become binary | Fixed | Branch bug | Dockerfile, `.env`, `.tf`, `.html` and Makefile are classified correctly (the xfail tests now pass) |
| ING-05 manifests | Mostly fixed | Branch bug | `requirements-dev.txt`, Pipfile, Gemfile and `setup.py` are fine, but `package.json` and `Cargo.toml` still come back as config (new item 9) |
| ING-06 exclusions too broad | Fixed for `out/`, `env/`, `target/` | Branch bug | `build`, `dist` and `vendor` still match anywhere, see items 1 and 10 |
| ING-03 excluded dirs written to disk | Not fixed | Branch bug | Still extracted, just hidden from the summary |

## New findings (priority order)

Labels: **Branch bug** means it's in Hima's own code and won't go away when merged. **Integration risk** means it depends on a contract with another branch. **Waiting on merge** means it isn't a bug, just not combined yet.

The full list with fixes is in `hima-ingestion_audit_2026-10-01.docx` (kept local). Short version:

**High**
1. *Branch bug.* If the storage folder sits under any folder called `build`, `dist`, `vendor`, `venv` and so on, every file is excluded. `build_summary` filters absolute paths (`summary.py:15`, `file_filter.py:14-15`). The same ZIP gave `files_included = 2` normally and `0` under `.../build/storage/`.
2. *Branch bug.* The 200:1 ratio check applies to every member with no minimum size (`validator.py:45-51, 74-77`). A 24 KB repetitive JSON fixture rejects the whole upload, and lockfiles and SQL dumps fail the same way.
3. *Integration risk (Hima + Aakash).* `repository_path` from the scan row isn't confined to the uploads folder (`scan_adapter.py:41-44`), so any readable ZIP on disk can be ingested. Hima should add the check, but she and Aakash need to agree where uploads live and what goes in that column.

**Medium.** All *Branch bug*, except the one marked otherwise. Limits are counted before `node_modules`/`.git` are excluded. Error handling leaves raw exceptions and partial folders. Retrying a scan always fails (*Integration risk*: Hima + Harshitha need to agree who retries and how), and two runs of the same scan can delete each other's output. 99k directory entries created 396k folders in 56 s. Windows paths (`a/b.txt:evil` alternate data stream, reserved names). Missing manifests and key/cert types. `vendor/` excluded wholesale. The ZIP is decompressed twice.

**Low.** All *Branch bug*. Classification edge cases (8 KB UTF-8 boundary, binaries named `.py`), language map gaps, `is_excluded("")` returns `[]`, paths in error messages, no logging, encrypted entries only fail by accident, unguarded `stat()`, API and README tidy-up, test gaps.

## What held up

No traversal, symlink or zip-bomb escape across the whole run. Every bad path (`../`, absolute, `C:\`, `\\server\share`, backslashes) is rejected, symlink entries are refused, duplicate and case-colliding names are caught, files open with `xb`, nested ZIPs are never opened, and a failed extraction cleans up after itself.
