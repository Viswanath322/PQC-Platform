# Retest: ingestion (Hima Bindu) and analysis engines (Harshitha)

Pushpam, 30 Sep 2026, branch `qa/pushpam`. Yesterday both modules were Blocked because nothing was pushed. Both are pushed now, so I ran the contract tests I had written ahead of time, after mapping them onto the real code.

| Target | Branch | Commit |
|---|---|---|
| Ingestion | `backend/hima-ingestion` (`.worktrees/hima`) | `67e7f11` |
| Analysis engines | `backend/harshitha-analysis` (`.worktrees/harshitha`) | `89f3041` |
| Finding API schema (comparison only) | Sathwik, `.worktrees/sathwik` | `8d6c278` |
| DB schema (comparison only) | Vamsi, `.worktrees/vamsi` | `fca83d5` |

Environment: macOS, Python 3.10.6 (the QA venv), pytest 9.1.1. The teammate worktrees were read only; `git status` is clean in all four after the runs (I set `sys.dont_write_bytecode` in the test hook so importing their code does not create `.pyc` files there).

## How I wired it

Two opt-in environment variables in `tests/conftest.py` put a teammate checkout on `sys.path` (documented in `tests/README.md`):

- `PQC_INGESTION_ROOT=.worktrees/hima` (directory that contains `ingestion/`)
- `PQC_ANALYSIS_ROOT=.worktrees/harshitha` (its `analysis-engines/` directory is what gets added, which is what Harshitha's README says to do with `PYTHONPATH`)

Without them the tests are Blocked, as before. Ingestion API assumptions live only in `tests/ingestion/adapter.py`, which now maps onto Hima's real API (`ingestion.summary.ingest_repository`, `ingestion.scan_adapter.ingest_scan_upload`, `validator`, `file_filter`, `classifier`, `language_detector`). The analysis equivalent is `tests/analysis/analysis_adapter.py`.

Python 3.11 note: Harshitha's package uses `enum.StrEnum`, which needs Python 3.11 (the project README says 3.11+). My venv is 3.10 and I have no 3.11 installed, so on 3.10 every analysis test that imports the package is Blocked with a clear reason. For an advisory run I added `PQC_ANALYSIS_STRENUM_POLYFILL=1`, a small `StrEnum` stand-in in `tests/analysis/conftest.py`. Every analysis result below is with that polyfill and should be re-run on a real 3.11 before sign-off (AE-01).

## Commands and counts

```
# ingestion, real module
PQC_INGESTION_ROOT=.worktrees/hima .venv/bin/pytest tests/ingestion -v -rs
   3 failed, 45 passed, 13 xfailed                      (61 tests, 7.7 s)
# ingestion, env var unset (proves the Blocked path still works)
.venv/bin/pytest tests/ingestion -v -rs
   11 passed, 50 skipped (BLOCKED)                       (fixture self-tests still pass)

# analysis, Python 3.10, no polyfill
PQC_ANALYSIS_ROOT=.worktrees/harshitha .venv/bin/pytest tests/analysis -v -rs
   1 failed, 1 passed, 93 skipped (BLOCKED: needs Python 3.11 StrEnum)
# analysis, advisory run with the polyfill
PQC_ANALYSIS_STRENUM_POLYFILL=1 PQC_ANALYSIS_ROOT=.worktrees/harshitha .venv/bin/pytest tests/analysis -v -rs
   4 failed, 83 passed, 8 xfailed                        (95 tests, 2.8 s)

# both together
PQC_INGESTION_ROOT=.worktrees/hima PQC_ANALYSIS_ROOT=.worktrees/harshitha PQC_ANALYSIS_STRENUM_POLYFILL=1 \
  .venv/bin/pytest tests/ingestion tests/analysis -q -rf
   7 failed, 128 passed, 21 xfailed
```

The one failure that shows even without the module is `test_finding_service_columns_exist_in_db`; it only compares Sathwik's SQL with Vamsi's schema and does not import Harshitha's code (AE-05). The one pass in that run is the line_number consistency check.

Hima's own tests, from the worktree with the venv:

```
cd .worktrees/hima && ../../.venv/bin/python -m pytest ingestion/tests -v      ->  5 passed (0.01 s)
cd .worktrees/hima && ../../.venv/bin/pytest ingestion/tests                    ->  collection ERROR: No module named 'ingestion'
```

The README says `python -m pytest`, which works. Bare `pytest` fails because there is no conftest or `pytest.ini` (ING-08). Harshitha's package ships no tests at all (`PYTHONPATH=analysis-engines python -m pytest analysis-engines/` would collect nothing), see AE-11.

## Ingestion results

Evidence from a direct run of `ingest_repository` on each generated fixture (scratch dir, deleted afterwards):

| Fixture | Result | Detail |
|---|---|---|
| `traversal_dotdot.zip` | PASS, rejected | `ExtractionError: Unsafe ZIP member path`, dest removed, nothing in the parent dir, nothing above the sandbox |
| `traversal_absolute.zip` | PASS, rejected | `/tmp/evil.txt` not created (checked after the run) |
| `traversal_windows.zip` | PASS, rejected | `..\..\evil.txt` and `C:\evil.txt` both refused (backslashes normalised, drive letters caught) |
| `symlink.zip` | PASS, rejected | `ExtractionError: Symbolic links are not allowed`, no link created, `/etc/passwd` never touched |
| `zip_bomb.zip` | FAIL | 1 MB archive, 1 GiB written to disk, accepted (ING-01) |
| `fake_zip.zip` | PASS | `InvalidArchiveError` |
| `corrupted.zip` | PASS | `InvalidArchiveError` |
| `empty.zip` | PASS | accepted with 0 files |
| `nested.zip` | PASS | `inner.zip` kept as a file, not expanded |
| `unicode_names.zip` | PASS | 4 files extracted and listed |
| `many_files.zip` | PASS | 5000 files in about 1.1 s |
| `demo-banking.zip` | PASS | see below |

`demo-banking.zip` (real demo repo plus 8 junk entries): `files_seen` equals files on disk, `files_included` equals seen minus 8, `files_excluded` is 8, nothing from `.git`, `node_modules`, `build`, `__pycache__`, `dist` in the inventory. Languages come out as exactly python, java, javascript. `app.py` is source, `requirements.txt` manifest, `config/app.yaml` config, `README.md` docs, and every `size_bytes` matches the file on disk. The summary survives a `json.dumps`/`json.loads` round trip. `ingest_scan_upload` writes `scans/<uuid>/repository/` and `ingestion-summary.json` (temp file renamed, none left behind) and rejects `../../outside`, `..`, an empty string, plain text and `<uuid>/../x` as scan IDs.

Other safety checks that passed: a non-empty destination is refused without touching the existing files; a failed extraction removes the partial output (the benign `ok/readme.txt` written before the bad entry is gone); files are opened with exclusive create so an archive cannot overwrite its own entries.

### Per-test status (61 tests, `tests/ingestion`)

| Group | Tests | PASS | FAIL | XFAIL | Blocked |
|---|---|---|---|---|---|
| Fixture self-tests | 11 | 11 | 0 | 0 | 0 |
| Valid ZIP: extract and counts, exclusion in summary, JSON, demo classification and languages | 4 | 4 | 0 | 0 | 0 |
| Excluded dirs not written to disk | 1 | 0 | 0 | 1 (ING-03) | 0 |
| Destination must be empty, no partial output | 2 | 2 | 0 | 0 | 0 |
| Duplicate entries give a typed error | 1 | 0 | 1 (ING-02) | 0 | 0 |
| `ingest_scan_upload` layout, JSON file, scan ID validation | 6 | 6 | 0 | 0 | 0 |
| Traversal (dotdot, absolute, windows) | 3 | 3 | 0 | 0 | 0 |
| Symlink not followed | 1 | 1 | 0 | 0 | 0 |
| Zip bomb rejected or capped | 1 | 0 | 1 (ING-01) | 0 | 0 |
| fake, corrupted, empty, nested, unicode, many files | 6 | 6 | 0 | 0 | 0 |
| Language detection | 3 | 3 | 0 | 0 | 0 |
| Classification (source, config, manifest, docs, binary) | 5 | 5 | 0 | 0 | 0 |
| File filter excludes | 4 | 4 | 0 | 0 | 0 |
| Text/config files not called binary | 5 | 0 | 0 | 5 (ING-04) | 0 |
| More manifests recognised | 4 | 0 | 0 | 4 (ING-05) | 0 |
| Legit dirs named out/env/target kept | 3 | 0 | 0 | 3 (ING-06) | 0 |
| `is_excluded` returns a bool | 1 | 0 | 1 (ING-07) | 0 | 0 |

With `PQC_INGESTION_ROOT` unset, everything except the 11 fixture self-tests is Blocked (50 skipped).

### Verdict on SEC-01 (ZIP path traversal on extraction)

Yesterday SEC-01 was Blocked because there was no extractor. Today: traversal is fixed. `../`, absolute, Windows backslash and drive-letter paths, symlink entries and hostile scan IDs are all rejected with a typed error, nothing lands outside the scan directory, and partial output is cleaned up. I would close SEC-01 for path traversal and symlinks.

I would not call the extractor fully hardened. The zip bomb is accepted and expanded to 1 GiB (ING-01), which is a local denial of service (disk and time) against an air-gapped desktop app that ingests user-supplied ZIPs. That is tracked separately as ING-01.

## Analysis engine results (advisory run on Python 3.10 with the StrEnum polyfill)

| Group | Tests | PASS | FAIL | XFAIL |
|---|---|---|---|---|
| Engine interface is abstract, subclass without `analyze` cannot be created | 2 | 2 | 0 | 0 |
| Engine names exactly sast/crypto/dependency/configuration, severities exactly critical/high/medium/low, JSON as plain strings | 2 | 2 | 0 | 0 |
| Finding has all required fields, immutable | 2 | 2 | 0 | 0 |
| Finding rejects empty, blank, None, wrong-type strings (6 fields x 4 values) | 24 | 24 | 0 | 0 |
| Rejects invalid engine, severity, line number, confidence (incl. NaN, inf, bool) | 23 | 23 | 0 | 0 |
| Optional line number, confidence bounds 0 and 1, `is_development` defaults false, missing arg raises | 8 | 8 | 0 | 0 |
| AnalysisResult defaults, invalid values rejected, JSON via `asdict` | 10 | 10 | 0 | 0 |
| DummyEngine: is an engine, one marked development finding, generator and empty input, JSON, smoke on the demo repo | 5 | 5 | 0 | 0 |
| DummyEngine `finding_id` is a UUID, unique per run | 2 | 0 | 2 (AE-02) | 0 |
| Engine sub-packages exist, import styles documented | 2 | 2 | 0 | 0 |
| No `.pyc` tracked in git | 1 | 0 | 1 (AE-10) | 0 |
| Importable as a package | 1 | 0 | 0 | 1 (AE-03) |
| Lists accepted by AnalysisResult, `to_dict()`, length limits vs DB columns | 5 | 0 | 0 | 5 (AE-07, AE-08, AE-09) |
| Consistency with API and DB: enums equal, field names present, line_number semantics | 5 | 5 | 0 | 0 |
| Consistency: confidence type, `is_development` survives persistence | 2 | 0 | 0 | 2 (AE-04, AE-06) |
| Consistency: every column Sathwik's SQL selects exists in the DB | 1 | 0 | 1 (AE-05) | 0 |

Totals in that run: 4 failed, 83 passed, 8 xfailed. The group rows add up to the 95 tests. Without the polyfill on 3.10 all of these except the last row (and the schema-only checks) are Blocked.

Smoke test: `DummyEngine().analyze(<all files of the extracted vulnerable-demo-repo zip>)` returns `files_processed` equal to the file count, exactly one finding, severity low, `is_development=True`, title "Development fixture: DummyEngine is connected", evidence starting "This is a synthetic finding". It is clearly marked. It does not read the files or look for any of the answer-key findings, as expected for a dummy.

How the team is meant to import it: the directory `analysis-engines/` has a hyphen so `import analysis_engines` fails, and `importlib.import_module("analysis-engines")` runs its `__init__.py`, which does `from base.analyzer import ...` and dies with `ModuleNotFoundError: base`. The only working way (per its README) is putting `analysis-engines/` itself on `PYTHONPATH` and importing `base`, `dummy_engine`, `sast` and so on as top-level modules. That works, but it is awkward (AE-03).

## Findings

Severity is my call for Day 1 scope. "Owner" is who I think should fix it.

### Ingestion

**ING-01 High. Zip bomb accepted and fully expanded, no size or count limits.** Owner: Hima Bindu.
- Evidence: `ingestion/extractor.py:54-55` copies every member with `shutil.copyfileobj` and there is no cap anywhere in `ingestion/`. Result of `ingest_repository(zip_bomb.zip, ...)`: archive 1,043,774 bytes, one file of 1,073,741,824 bytes written to disk, accepted, about 1.0 s. `validate_zip` also calls `testzip()` (`validator.py:16`), which decompresses the whole archive once before extraction reads it again. Test `test_zip_bomb_rejected_or_limited` FAIL: "bomb expanded to 1073741824 bytes on disk".
- Expected: reject or stop when total uncompressed size, per-file size, compression ratio or entry count passes a configured limit; clean typed error; partial output removed.
- Fix: before extracting, sum `info.file_size` over `infolist()` and check a ratio (`file_size / compress_size`); also count bytes while copying because headers can lie. Suggested starting limits: 500 MB total, 50 MB per file, 20,000 entries, ratio 100. Make them constants at the top of `extractor.py`.

**ING-02 Low. Duplicate entry names leak a raw `FileExistsError`.** Owner: Hima Bindu.
- Evidence: an archive with two entries named `a.py` gives `FileExistsError(17, 'File exists')` from `target.open("xb")` (`extractor.py:54`); `test_duplicate_entries_rejected_cleanly` FAIL. Cleanup does happen (the except clause at `extractor.py:57` removes the partial dir), so nothing is left behind.
- Expected: `ExtractionError("Duplicate ZIP member ...")` like the other rejections, so the caller has one exception family to catch.
- Fix: track a set of normalised names, or catch `FileExistsError` and re-raise as `ExtractionError`.

**ING-03 Low. Excluded directories are still written to disk.** Owner: Hima Bindu.
- Evidence: Hima's own test asserts `node_modules/pkg/index.js` exists after extraction (`ingestion/tests/test_ingestion.py:29`); `.git/`, `node_modules/`, `build/`, `dist/`, `__pycache__/` all land in the scan dir and only the summary hides them. `test_excluded_dirs_not_written_to_disk` XFAIL. This also makes ING-01 worse, since the cap has to count junk.
- Expected (guide: "ignore .git/node_modules/build/cache"): the summary hides them, which meets "ignore" for analysis. Not extracting them would be safer and faster. If they stay on disk, engines must consume the summary's file list and never walk the directory.
- Fix: skip excluded members in the extraction loop (`is_excluded(info.filename)`) and count them as `files_excluded`, or document that the summary is the only source of truth for engines.

**ING-04 Medium. Unknown file types are classified as "binary".** Owner: Hima Bindu.
- Evidence: `classifier.py:39` `return "binary"` is the fallback. Actual output: `Dockerfile`, `.env`, `deploy/main.tf`, `web/index.html`, `Makefile`, `style.css`, `server.pem`, `cert.crt` all come back `binary`. 5 XFAIL tests.
- Expected: text files with no known extension should not be called binary. The configuration and crypto engines are exactly the ones that need Dockerfiles, `.env`, Terraform, PEM and certificate files; if they skip "binary" they will miss real findings.
- Fix: add `dockerfile`, `makefile`, `.env*`, `.tf`, `.pem`, `.crt`, `.html`, `.css` to the right sets, and make the fallback content-based (read the first 4 KB, look for NUL bytes) or a separate `unknown` class instead of `binary`.

**ING-05 Low. Some dependency manifests are not recognised.** Owner: Hima Bindu.
- Evidence: `requirements-dev.txt` gives `docs`, `Pipfile` and `Gemfile` give `binary`, `setup.py` gives `source`. `_MANIFEST_NAMES` in `classifier.py:6-10` is an exact-name list. 4 XFAIL tests.
- Expected: manifest class for anything the dependency engine should parse.
- Fix: match `requirements*.txt`, `Pipfile`, `Pipfile.lock`, `Gemfile`, `setup.py`, `setup.cfg`, `build.gradle.kts`, `*.csproj`, `packages.config`.

**ING-06 Medium. Directory-name exclusion drops legitimate source.** Owner: Hima Bindu.
- Evidence: `file_filter.py:15` excludes any path with a part in the set (`env`, `out`, `target`, `vendor`, `build`, `dist`, `coverage`, `venv`). `is_excluded("com/acme/out/Writer.java")`, `src/env/config.py` and `src/target/Goal.java` all return True and are silently left out of the inventory, so the engines never see them. 3 XFAIL tests.
- Expected: exclude well-known dependency and build directories, not any folder that happens to share a name. `out`, `env`, `target` and `vendor` are common package or module names.
- Fix: only exclude the strongly identifying ones anywhere (`.git`, `node_modules`, `__pycache__`, `.venv`), and the ambiguous ones (`build`, `dist`, `out`, `target`, `env`) only at the repository root or next to a marker file (`pom.xml`, `package.json`). Report skipped counts per reason. Hima's README also says the PRD's exclusion list has not been reconciled yet, which is the right place to settle this.

**ING-07 Low. `is_excluded("")` returns `[]`, not `False`.** Owner: Hima Bindu.
- Evidence: `file_filter.py:15` ends with `(parts and parts[-1] in EXCLUDED_FILES)`, which returns the empty list for an empty path. Test `test_is_excluded_returns_bool` FAIL: `type(...)` is `list`. Harmless today because `filter_files` only checks truthiness.
- Fix: wrap in `bool(...)`.

**ING-08 Low. `pytest ingestion/tests` from the branch root fails to collect.** Owner: Hima Bindu.
- Evidence: `ModuleNotFoundError: No module named 'ingestion'`; only `python -m pytest ingestion/tests` works. No `conftest.py`, `pytest.ini` or `pyproject.toml` on the branch.
- Fix: add a root `conftest.py` (empty is enough) or `pytest.ini` with `pythonpath = .`. CI and teammates will type plain `pytest`.

**ING-09 Info. Thin test coverage on the branch.** Owner: Hima Bindu. Hima has 5 tests: valid, non-ZIP, dotdot traversal, scan adapter layout, non-UUID ID. Missing: absolute and Windows paths, symlinks, bombs, duplicates, empty and nested archives, unicode names, non-empty destination. My suite covers these now, but the module should own its own tests so a regression is caught on the branch.

**ING-10 Info. Exclusion list not reconciled with the PRD.** Owner: Hima Bindu. Her README says the product PRD was not in the repo when she built the list. Please confirm the final list before integration sign-off; see ING-06.

### Analysis engines

**AE-01 Info. Needs Python 3.11 (`enum.StrEnum`); not importable on the QA venv (3.10).** Owner: Pushpam (environment), Harshitha (declare it).
- Evidence: `ImportError: cannot import name 'StrEnum' from 'enum'` at `base/finding.py:4`. The project README says Python 3.11+, so the code is within spec and my venv was the mismatch. The only mention on the branch is the analysis README line "targets Python 3.11+".
- Action: I will rebuild the QA venv on 3.11 and re-run without the polyfill. Harshitha could add a version guard with a readable error.

**AE-02 Medium. DummyEngine `finding_id` is a constant, non-UUID string.** Owner: Harshitha.
- Evidence: `dummy_engine.py:21` `finding_id="dummy-development-001"`. Sathwik's `FindingOut.finding_id` is documented as "Stable UUID" and Vamsi's `findings.id` is `CHAR(36)` and the PRIMARY KEY. `test_dummy_finding_id_is_uuid` and `test_dummy_finding_id_unique_per_run` both FAIL. If the pipeline persists the dummy finding, the second scan's insert hits a duplicate key.
- Expected: `finding_id` generated per finding (`str(uuid.uuid4())`), or the persistence layer assigns `id` and the engine's `finding_id` is only a local rule reference.
- Fix: generate a UUID in the engine or in a Finding factory; decide and document which side owns the ID.

**AE-03 Medium. Import layout is awkward and the package `__init__.py` is unusable.** Owner: Harshitha (with Aakash for the worker).
- Evidence: directory `analysis-engines/` cannot be imported by name. `analysis-engines/__init__.py:3-5` uses `from base...`, so importing the directory as a package fails with `ModuleNotFoundError: base`. The working method is `PYTHONPATH=analysis-engines`, which puts generic top-level names (`base`, `sast`, `crypto`, `dependency`, `configuration`, `dummy_engine`) into every process that imports it; `base` and `configuration` are easy names to collide with. The backend worker has to mutate `sys.path` to call it. `test_layout_importable_as_package` XFAIL.
- Expected: one documented import that does not need path hacks.
- Fix: rename the directory to `analysis_engines` (or add a package with that name) and use relative imports (`from .base import ...`), so the worker can `from analysis_engines import DummyEngine`. Agree the name with Aakash, who will call it.

**AE-04 Medium. `confidence` type does not match the API or the DB.** Owner: Harshitha and Sathwik (agree one type).
- Evidence: `base/finding.py:38` `confidence: float` (validated 0..1). Sathwik `schemas/finding.py:31` `confidence: str | None`. Vamsi `schema.sql` `confidence VARCHAR(50) NULL`. Storing 0.9 into VARCHAR works but the API serves the string "0.9", and any UI expecting "high/medium/low" gets numbers. `test_confidence_type_agrees` XFAIL.
- Fix: pick one. If the UI wants labels, make the engine emit `high|medium|low` (or map at the boundary); if numeric, change API and DB to a float column.

**AE-05 High. Sathwik's findings queries select a column that does not exist in the database.** Owner: Sathwik (query and schema) and Vamsi (table).
- Evidence: `.worktrees/sathwik/backend/app/services/finding_service.py:31` and `:43` `SELECT id AS finding_id, ... explanation, ... FROM findings`. `.worktrees/vamsi/database/schema.sql` `findings` table (lines 137-169) has no `explanation` column. Against MySQL this is `Unknown column 'explanation'` on both the list and the get-by-id query. `test_finding_service_columns_exist_in_db` FAIL: `['explanation']`. The engine `Finding` has no explanation field either, so nothing would ever populate it.
- Expected: schema, API model, service SQL and engine model agree on the field list.
- Fix: either add `explanation TEXT NULL` to the schema (and to `Finding` and the persistence mapping) or drop it from `FindingOut` and the SELECTs. Not caught yet only because the findings API has not been run against MySQL.

**AE-06 Medium. `is_development` has nowhere to go.** Owner: Harshitha and Sathwik.
- Evidence: `Finding.is_development` exists (`finding.py:40`) but neither `FindingOut` nor the `findings` table has it. Once the DummyEngine finding is stored it looks like a real low-severity SAST finding at `<development-fixture>` in every report. `test_development_flag_survives_persistence` XFAIL.
- Fix: add `is_development BOOLEAN NOT NULL DEFAULT 0` to the table and API, or never persist development findings (filter them in the worker) and say so in the README.

**AE-07 Low. `AnalysisResult` only accepts tuples, `Finding` only accepts enum members.** Owner: Harshitha.
- Evidence: `AnalysisResult(findings=[f])` raises `ValueError` (`result.py:14`), and `Finding(engine="sast", severity="high")` raises (`finding.py:57-60`). Validation itself is good (all bad values rejected), but the strictness makes the natural code path fail. `test_result_accepts_lists` XFAIL.
- Fix: coerce lists to tuples in `__post_init__` (use `object.__setattr__` since it is frozen) and accept valid strings for `engine` and `severity` by converting them to the enums.

**AE-08 Low. No serialisation helper.** Owner: Harshitha.
- Evidence: no `to_dict()` on `Finding` or `AnalysisResult`. `json.dumps(dataclasses.asdict(result))` does work (StrEnum serialises as a string), so results are JSON safe, but every caller must know that. `test_models_have_serialiser` XFAIL.
- Fix: add `to_dict()` producing exactly the API field names, so the mapping lives in one place.

**AE-09 Low. No length limits matching the DB columns.** Owner: Harshitha.
- Evidence: `title` accepts 256+ characters, `category` 101+, `file_path` 1025+ (columns are VARCHAR 255, 100, 1024). MySQL strict mode would fail the insert, or truncate silently in non-strict mode. 3 XFAIL tests.
- Fix: validate or truncate to the column sizes in `Finding.__post_init__` (truncate `evidence` and `title` with an ellipsis rather than failing the whole scan).

**AE-10 Medium. Compiled bytecode is committed.** Owner: Harshitha.
- Evidence: `git ls-files` on `backend/harshitha-analysis` lists 9 `.pyc` files, for both cpython-310 and cpython-311 (`analysis-engines/__pycache__/dummy_engine.cpython-310.pyc`, `analysis-engines/base/__pycache__/...`). There is no `.gitignore` on the branch. `test_no_pycache_or_pyc_tracked` FAIL. Same pattern as yesterday's SEC-02 on `backend/aakash-scan`.
- Fix: `git rm -r --cached` those files and add the root `.gitignore`.

**AE-11 Info. No tests shipped with the engine foundation.** Owner: Harshitha. Her README says checks will run "once tests are added". `tests/analysis/` here now covers the contract; I would like her branch to carry a minimal set (Finding validation, DummyEngine) so the contract is enforced in her own CI.

**AE-12 Info. What already lines up.** Enum values match Sathwik's `FindingEngine` and `FindingSeverity` literals and Vamsi's ENUMs exactly (`sast|crypto|dependency|configuration`, `critical|high|medium|low`). `line_number` is optional and at least 1 in both the engine and the API, INT in the DB. Field names line up (`finding_id` vs DB `id` is the only rename, and Sathwik's query already aliases it). Validation rejects NaN, infinity, booleans passed as numbers, blank strings and out-of-range values.

## What I need from the team

| Who | What |
|---|---|
| Hima Bindu | ING-01 (size and ratio caps) first, then ING-04 and ING-06 (they change what the engines get), then the small ones |
| Harshitha | AE-02, AE-03, AE-10 before others build on the package; agree AE-04 and AE-06 with Sathwik |
| Sathwik and Vamsi | AE-05 (the `explanation` column) before the findings API is run against MySQL |
| Pushpam | Rebuild the venv on Python 3.11 and re-run the analysis tests without the polyfill; re-run everything once fixes land |

## Clean up

Temporary fixture ZIPs, extraction directories and pytest base temp directories were written under the session scratch directory and removed after each run (the 1 GiB bomb output does not persist). `/tmp/evil.txt` was never created. `git status` is clean in `.worktrees/hima`, `.worktrees/harshitha`, `.worktrees/sathwik` and `.worktrees/vamsi`.
