# Analysis engines and repo-wide security, 1 Oct 2026

Pushpam, QA + security. macOS, Python 3.11.16, pytest 9.1, bandit, ruff, detect-secrets, pip-audit. gitleaks isn't installed here, so detect-secrets plus the suite's regex check are the only secret scanners this time.

Targets: `backend/harshitha-analysis` @ `200cfdf`, scanned against the demo repo answer key (`EXPECTED_FINDINGS.json`, 37 planted findings and 7 true negatives). Security scans on every branch tip: aakash `122c89b`, aakash-port `239761f`, foundation `d56a7c9`, sathwik `fd856c3`, hima `e11e33d`, vamsi `c4df60c`, PQC-frontend `f398717`, findings-explorer `10234f7`, and the `qa/pushpam` root.

Backend, database/integration, frontend/desktop and ingestion have their own reports. From those I only refer to INT-30, INT-31, INT-33, INT-37, DSK-01, DSK-02, FE-09 and ING-04 to ING-06.

Labels: **Branch bug** is a defect in the branch's own code that survives a merge. **Integration risk** means two owners disagree on a shared contract. **Waiting on merge** means it isn't delivered or combined yet (including a module-only branch failing because the root `.gitignore`, requirements or `desktop/` live elsewhere; owner on main).

## Short version

1. The engines run, and Harshitha's own 61 tests pass. They find **18 of the 37 planted issues**. That's 48.6% overall, or 66.7% (18 of 27) for SAST + Crypto, the only two engines that exist so far. Precision against the key is 90%, with **no false positives on the 7 true negatives**. RSA-1024, RSA-2048, EC key generation and ECDSA signing are all flagged as quantum-vulnerable.
2. The other 10 (7 config, 3 dependency) can't be found yet because those engines are still stubs (Waiting on merge).
3. Two new serious problems:
   - **Regex slowdown (ReDoS).** One 200 KB line takes 21 s, 400 KB runs past 40 s, and a 1 MB line didn't finish in 2 minutes. The worker has no timeout. I reproduced it myself: the SQL-injection rule takes 0.3 s at 25 KB, 1.2 s at 50 KB and 4.8 s at 100 KB, so it's quadratic.
   - **Silent zero-finding scans** when the absolute scan path contains `build`, `dist`, `gen`, `vendor` or `coverage`. This is the same bug as Hima's ingestion item 1.
4. Status of earlier items:
   - Fixed: AE-03, AE-04, AE-05, AE-06, AE-10/SEC-08, AE-11, SEC-09.
   - Half fixed: AE-02.
   - Not fixed: AE-07, AE-08, AE-09.
   - Partly fixed: SEC-02, SEC-06, SEC-11, SEC-12, SEC-13.
5. No real secrets, and no committed `.pyc`, `.db`, `.env`, `.pem` or ZIP on any branch tip. The engines never execute scanned code and make no network, subprocess or `eval` calls.

## 1. Test runs

**QA contract suite**

```bash
PQC_ANALYSIS_ROOT=.worktrees/harshitha PQC_DEMO_REPO=.worktrees/tests-pushpam/vulnerable-demo-repo \
  .venv/bin/pytest tests/analysis -v -rs -rx -p no:cacheprovider
```

- At first, `qa/pushpam` showed 2 passed and 93 blocked. That was our gap, not hers: she moved to an importable `analysis_engines` package, and our adapter still imported the old top-level `base` / `dummy_engine`.
- I fixed the adapter on `qa/pushpam` the same day. It now loads `analysis_engines` when the checkout has it and falls back to the old layout. I also replaced the stale layout tests and removed the xfail markers for AE-04 and AE-06.
- Result after the fix: **88 passed, 1 failed, 5 xfail, 0 blocked** (94 tests, 2.8 s).
  - The 1 failure is real: `test_dummy_finding_id_unique_per_run` (AE-02). The id is always `92072cb8-1ff0-5b6f-9c4f-0575988c638b`.
  - XFAIL: AE-07, AE-08, AE-09 (x3).
  - `test_confidence_type_agrees` (AE-04), `test_development_flag_survives_persistence` (AE-06), `test_layout_importable_as_package` (AE-03) and `test_finding_service_columns_exist_in_db` (AE-05) all pass.

**Her own tests:** `python -m pytest analysis-engines/tests` gives 61 passed (contract 4, crypto 17, path utils 7, runner 14, SAST 19).

**Static checks:**
- bandit on the engines: 0 issues. Across ingestion/backend/database there are 9 Low, all in `database/verify_db.py`.
- ruff: 29 style findings (22 auto-fixable), nothing behavioural. Unused imports at `crypto/rules.py:15`, `runner.py:32`, `sast/engine.py:26`.
- No `subprocess`, `eval`, `exec`, `socket`, `urllib` or `requests` in engine code; those words only appear in rule text.
- I scanned files designed to run on import (`evil.py`, `conftest.py`, `setup.py`, `evil.js`). The marker file was never created, so scanned code is not executed. Output is deterministic.

## 2. Detection accuracy

22 raw findings, 0 errors. A match means same file and line as the answer key.

| Category | Expected | Found | Recall |
|---|---|---|---|
| SAST | 15 | 9 | 60% |
| Crypto | 12 | 9 | 75% |
| Configuration | 7 | 0 | 0% (engine is a stub) |
| Dependency | 3 | 0 | 0% (engine is a stub) |
| **All** | **37** | **18** | **48.6%** (66.7% for the engines that exist) |

**How accurate the hits are:**
- **Precision:** 90% (18 of 20 distinct locations).
  - The MD5 line (13) and SHA-1 line (17) are each reported by both engines.
  - Two extra lines aren't in the key: `crypto_utils.py:4` (the DES import) and `:48` (the `def sign_ecdsa` line just above the real line 49).
- **True negatives:** 7 of 7 clean.
- **Line numbers:** all 18 hits are on the exact line.
- **Severity:** only 7 of 18 agree with the key (39%).
  - 10 are higher than the key. CRYPTO-009/010/011 are two steps higher (key medium, engine critical).
  - 1 is lower (CMDI-001: key critical, engine high).
  - RSA-1024 and RSA-2048 both come out critical.

**Found:** SQLI-001/002, CMDI-001/002, DESER-001, SECRET-001/003/004/005, CRYPTO-001/002/003/004/007/008/009/010/011.

**Missed (19):**
- CFG-001 to 007 and DEP-001 to 003: no engine yet (AE-18).
- PATH-001, SSRF-001, EVAL-001, EVAL-002, XSS-001: no rule (AE-16).
- CRYPTO-005: no ECB rule.
- CRYPTO-006: the static IV rule only matches `b"\x00.."` or `bytes(n)`.
- CRYPTO-012: Java `MessageDigest.getInstance("MD5")` isn't covered.
- SECRET-002: `AWS_SECRET_ACCESS_KEY` isn't matched by the secret pattern.

The last four are AE-17.

## 3. Robustness

- A 2 MB random binary named `.py` finishes in 0.5 s. Invalid UTF-8 still finds the `pickle` call on the right line (latin-1 fallback). A 1 MB minified line with no hot patterns takes 0.4 s. Files over 1 MB are only read for their first 1 MB.
- **Symlinks:** a symlink to a file outside the scan folder is read, and a finding is built from the outside content. `normalize_findings_paths` drops it afterwards, but only after the read (AE-15). Loops, dangling links and a folder named `x.py` don't crash, but the error strings contain full host paths.
- **Paths:** 30 levels of nesting is fine. `.pem` and `.env` files aren't scanned at all (AE-18). A scan folder under `build/`, `dist/`, `gen/` or `vendor/`, or code at `src/build/auth.py`, gives 0 findings and 0 errors (AE-14).
- **Regex slowdown:** time to scan one long line, by line length:

| Rule | 50 KB | 100 KB | 200 KB | 400 KB |
|---|---|---|---|---|
| SAST-INJ-001 `execute("` repeated | 1.2 s | 5.0 s | 21.6 s | >40 s |
| INJ-001 `execute("a"+b);` | 0.8 s | 3.0 s | 12.3 s | >40 s |
| INJ-003 `subprocess.run(` | 1.0 s | 3.8 s | 16.1 s | >40 s |
| CRYPTO-KEY-001 `Cipher ` | 1.0 s | 4.0 s | 16.3 s | >40 s |
| CRYPTO-PASS-001 `PBKDF2HMAC ` | 1.1 s | 4.0 s | 15.6 s | >40 s |
| SAST-PATH-001 | 0.1 s | 0.4 s | 1.4 s | 5.5 s |

INJ-002 is linear. The 1 MB case didn't finish in 2 minutes and I stopped it.

## 4. Earlier items

| ID | Status | Label | Notes |
|---|---|---|---|
| AE-02 dummy finding id | Partly fixed | Branch bug | `dummy_engine.py:20` now uses `uuid5` of a constant: a valid UUID, but the same every run. Low impact, because the pipeline only runs SAST + Crypto. Fix: `uuid4()`, or never persist dummy findings |
| AE-03 hyphenated folder | Fixed | Branch bug | `analysis_engines/__init__.py` facade, so `from analysis_engines import AnalysisPipeline` works and the worker uses it (`scan_worker.py:35-38`) |
| AE-04 confidence type | Fixed | Integration risk | float in the engine, `FindingOut` float 0 to 1, DB `FLOAT` |
| AE-05 `explanation` column | Fixed | Integration risk | in `schema.sql:157` and `models.py:159`, but nothing fills it (AE-23) |
| AE-06 `is_development` | Fixed | Integration risk | in the schema, API and worker (`scan_worker.py:161`) |
| AE-07 lists/strings rejected | Not fixed | Branch bug | `AnalysisResult(findings=[f])` still raises |
| AE-08 no `to_dict()` | Not fixed | Branch bug | |
| AE-09 no length limits | Not fixed | Branch bug | only `file_path` can realistically overflow now |
| AE-10 / SEC-08 committed `.pyc` | Fixed | Branch bug | 0 tracked, `.gitignore` present, none in the current history |
| AE-11 no tests | Fixed | Branch bug | 61 tests |
| AE-12 enums and fields agree | Still true | n/a | |

## 5. Security scans per branch

`PQC_SCAN_ROOT=<path> .venv/bin/pytest tests/security -rA --tb=line -q -p no:cacheprovider`

| Target | Pass | Fail | Blocked | Failures and label |
|---|---|---|---|---|
| aakash | 17 | 8 | 20 | no root `.gitignore` (8): Waiting on merge |
| aakash-port | 24 | 2 | 19 | secrets (2): test password at `backend/tests/test_api_auth_scoping.py:44`, Branch bug SEC-16 |
| foundation | 26 | 0 | 19 | none |
| sathwik | 17 | 8 | 20 | `.gitignore` (8): Waiting on merge |
| hima | 16 | 8 | 21 | `.gitignore` (8): Waiting on merge |
| vamsi | 23 | 2 | 20 | secrets (2): `database/run_combined_flow.py:71`, `backend/.env.example:3` (`postgres:postgres`), Branch bug SEC-16 |
| harshitha | 38 | 7 | 0 | pip-audit (SEC-15); `api.ts:185` URL, CSP null, connect-src (Waiting on merge, fixed on PQC-frontend); identifier DSK-02; secrets (2) in her test strings (SEC-16) |
| PQC-frontend | 32 | 11 | 2 | `.gitignore` (8): Waiting on merge; secrets (2) at `apiAuthContract.test.mjs:242` (SEC-16); identifier DSK-02 |
| findings-explorer | 31 | 12 | 2 | `.gitignore` (8), CSP, connect-src, `api.ts:185`: Waiting on merge; identifier DSK-02 |
| `qa/pushpam` root | 17 | 8 | 20 | `.gitignore` (8): Waiting on merge. `main` itself only has `README.md` |

The PQC-frontend and findings-explorer counts are a bit different from the frontend report because this run only covers `tests/security`.

**Secrets:** nothing real anywhere. Every detect-secrets and regex hit is a test or example string. On harshitha, all 9 regex hits and 3 detect-secrets hits are in `analysis-engines/tests`. No committed artifacts on any tip; Aakash's old `dev.db`, ZIP and `.pyc` are still in that branch's history (SEC-01).

**Dependencies:**
- The foundation, aakash-port and harshitha backend `requirements.txt` files are identical, and pip-audit finds nothing.
- Harshitha's `tests/requirements.txt` pins `pytest>=8.0,<9.0`, which resolves to 8.4.2 with PYSEC-2026-1845 (fixed in 9.0.3).
- Our `tests/requirements.txt` is clean.
- The demo repo's requirements are vulnerable on purpose.

**Older SEC items, all partly fixed:**
- **SEC-02 root `.gitignore`.** Present on aakash-port, foundation, vamsi and harshitha. Missing on aakash, sathwik, hima, PQC-frontend, findings-explorer, `qa/pushpam` and `main` (Waiting on merge).
- **SEC-06 placeholder passwords.**
  - vamsi and harshitha compose use `${VAR:-placeholder}`.
  - foundation and aakash-port still hard-code `change_me_locally` (`docker-compose.yml:11,12,22,34`).
  - Defaults remain in `.env.example` and `verify_db.py:40`.
  - The app now rejects a placeholder JWT secret.
- **SEC-11 `.gitignore` too broad.**
  - vamsi and harshitha anchor `/build/`, `/dist/` and so on and no longer hide `desktop/src/lib` or `*.zip`, but `env/` and `ENV/` are still unanchored, so `backend/app/core/env/x.py` is ignored.
  - foundation and aakash-port keep the old file: `lib/`, `build/`, `dist/`, `*.zip` and `storage/` hide `desktop/src/lib/utils.ts`, `src/build/a.py` and `tests/fixtures/x.zip`.
- **SEC-12 missing requirements.** Requirements now exist on aakash-port, foundation and harshitha. Still none on aakash, sathwik, hima or vamsi.
- **SEC-13 compose leftovers.**
  - vamsi and harshitha dropped `version: '3.8'` and `--default-authentication-plugin`; foundation and aakash-port haven't.
  - All four still put the DB and Redis passwords on the healthcheck command line.

## 6. New findings

**AE-13 · High · Branch bug · Harshitha. Regex slowdown hangs the scan on one long line.**
`sast/rules.py:105` (INJ-001), `:148` (INJ-003), `:215` (PATH-001); `crypto/rules.py:199` (`Cipher.*CBC`), `:262` (`PBKDF2HMAC.*iterations`). These are applied to whole lines in `sast/engine.py:98-104`, and `scan_worker` has no timeout. Evidence in section 3. A minified bundle or one hostile file can hold the worker for minutes.
Fix: cut lines before matching and bound the greedy parts, then add a time budget in the worker:
```python
line = line[:2000]                      # record "line truncated" as a note
r'execute\s*\(\s*[f"\'`][^\n]{0,200}?(%s|%d|\{)'
r'Cipher.{0,100}CBC'
```

**AE-14 · Medium · Branch bug (same as ING-06/ingestion item 1) · Harshitha. Paths containing `build`, `dist`, `gen`, `vendor` or `coverage` are silently skipped.**
`sast/engine.py:41-43` and the crypto engine check `_EXCLUDED_DIRS` against every part of the absolute path. A scan under `<x>/build/...`, or code at `src/build/auth.py` with `pickle.loads`, gives 0 findings and 0 errors, which looks like a clean scan.
Fix: check the path relative to the scan root, and only treat ambiguous names (`build`, `out`, `target`, `gen`) as excluded at the repo root.

**AE-15 · Medium · Branch bug · Harshitha. Symlinks are followed.**
`sast/engine.py:88` uses `read_bytes()`, which follows links. A link to a file outside the scan folder produced a finding from the outside file's content before it was dropped. Error strings also store full host paths in the DB.
Fix: `if file_path.is_symlink(): skip with a short error`, and use relative paths in error text.

**AE-16 · Medium · Branch bug · Harshitha. No rules for `eval`, SSRF, `innerHTML` XSS or path traversal.**
Misses PATH-001, SSRF-001, EVAL-001/002 and XSS-001.
Fix (starting point):
```python
r'\beval\s*\('                                   # Python and JS
r'requests\.(get|post|put|delete)\s*\(\s*[A-Za-z_]'
r'\.innerHTML\s*='
r'open\s*\([^)]*\+'
```

**AE-17 · Medium · Branch bug · Harshitha. Crypto and secret rule gaps.**
- No ECB rule (CRYPTO-005).
- The IV rule at `crypto/rules.py:237` misses `STATIC_IV = b"0000..."` (CRYPTO-006).
- Java `MessageDigest.getInstance("MD5")` isn't covered (CRYPTO-012).
- `AWS_SECRET_ACCESS_KEY` isn't matched by `sast/rules.py:44` (SECRET-002).

Fix:
```python
r'MODE_ECB|modes\.ECB|"AES/ECB'
r'getInstance\(\s*"(MD5|SHA-?1)"'
r'(?i)\w*(password|passwd|secret|token|api_?key|auth_?key)\w*\s*[:=]\s*["\'][^"\']{6,}["\']'
```
Also flag any IV/nonce assigned from a constant bytes literal.

**AE-18 · High · Waiting on merge · Harshitha (her README says Day 3+). Configuration and dependency engines are stubs.**
The pipeline runs only SAST and Crypto. `_SCANNABLE` has no `.yaml`, `.yml`, `.json`, `.env`, `.ini`, `.properties`, `.toml`, `.html` or `.pem`, so secrets in config files and keys are never looked at. 10 of the 37 planted findings can't be found. This also needs Hima's classifier to stop treating `.env`, Dockerfile and `.pem` as unknown.
Fix: deliver the two engines, and add those extensions to `_SCANNABLE` for the secret rules now.

**AE-19 · Medium · Integration risk · Harshitha + Pushpam (and the PRD owner). Severities don't match the agreed table.**
7 of 18 match the answer key, 10 are higher and 1 is lower. RSA-1024 and RSA-2048 are both critical.
Fix: agree one severity table in the PRD, the answer key and the rules. Make crypto severity key-size aware: RSA under 2048 is high; 2048 and up is medium with a "PQC migration" tag.

**AE-20 · Medium · Branch bug · Harshitha. False positives on harmless code.**
These are flagged:
- `# we adhere to the policy` as Diffie-Hellman (substring `dh`).
- `for des in designs:` as DES.
- Every `os.path.join` as high-severity path traversal.
- `hashlib.md5(x, usedforsecurity=False)`, twice.
- `token = "Bearer "` and `prefix_token = "not-a-secret"` as critical secrets.
- `# no RC4 here`.

These are correctly not flagged: `os.environ` secrets, AESGCM, Kyber, and SHA-256 mentioned in comments.

Fix:
- Use word boundaries and case-sensitive algorithm names.
- Skip comment lines.
- Honour `usedforsecurity=False`.
- Drop or lower the `os.path.join` rule.
- Add a placeholder allowlist to the secret rule.

**AE-21 · Low · Branch bug · Harshitha. Some line numbers are off by one.**
`sast/engine.py:93` (and the crypto engine) use `text.splitlines()`, which also splits on form feed, `\x1c`-`\x1e`, `\x85`, U+2028 and U+2029. Editors only split on `\n`.
Fix: `text.split("\n")` and strip a trailing `\r`.

**AE-22 · Low · Branch bug · Harshitha. Duplicate findings.**
MD5 (line 13) and SHA-1 (line 17) are each reported by both engines, because `runner.py:51` only de-duplicates on `finding_id`. Imports and `def` lines are also reported (`crypto_utils.py:4`, `:48`).
Fix: de-duplicate on `(file, line, algorithm)`, and match calls rather than imports or function names.

**AE-23 · Medium · Branch bug · Harshitha. `explanation` is never filled in.**
`sast/engine.py:110-125` and the crypto engine build `Finding(...)` without `explanation=`, even though every rule has one. `scan_worker.py:158` stores `f.explanation`, so every DB row is NULL. I checked: neither engine references `explanation` at all.
Fix: pass `explanation=rule.explanation` when building each finding.

**SEC-14 · Low · Branch bug · Harshitha. Her branch carries a copy of the QA suite.**
21 tracked files under `tests/`, including `tests/fixtures/vulnerable-demo-repo` (fake secrets, Flask 0.12.4, requests 2.6.0). Every scanner flags it, and it would ship unless excluded.
Fix: remove `tests/` from her branch. The suite lives on `qa/pushpam` and the demo repo on `tests/pushpam`.

**SEC-15 · Low · Branch bug · Harshitha. Old pytest in her `tests/requirements.txt`.**
`pytest>=8.0,<9.0` resolves to 8.4.2, which has PYSEC-2026-1845 (fixed in 9.0.3). Dev-only, and goes away with SEC-14.

**SEC-16 · Low · Branch bug · Aakash, Vamsi, Harshitha, Sathish/Hema. Test and example passwords trip the secret scanners.**
- `aakash-port backend/tests/test_api_auth_scoping.py:44`
- `vamsi database/run_combined_flow.py:71` and `backend/.env.example:3`
- `harshitha analysis-engines/tests/*`
- `PQC-frontend apiAuthContract.test.mjs:242`

None of them is a real secret.
Fix: use obviously fake values with `# pragma: allowlist secret` (or build them at runtime), and leave the password empty in `.env.example`. On my side I'll allowlist `__tests__/` and the `autoComplete` attribute in the QA scanner.

**SEC-17 · Low · Branch bug · Aakash/Amrutha (aakash-port, foundation), Harshitha (backend copy). Requirements are ranges with no lock file.**
The air-gapped installer needs exact wheels, and the set we audit has to be the set we ship.
Fix: a pinned `requirements.lock` (ideally with hashes) and run pip-audit on that.

## 7. Counts

- New: 15 (AE-13 to AE-23, SEC-14 to SEC-17).
- By label: **Branch bug 13** (AE-13, 14, 15, 16, 17, 20, 21, 22, 23, SEC-14, 15, 16, 17), **Integration risk 1** (AE-19), **Waiting on merge 1** (AE-18).
- By severity: High 2 (AE-13, AE-18), Medium 7 (AE-14, 15, 16, 17, 19, 20, 23), Low 6 (AE-21, AE-22, SEC-14 to 17).
- Still open from before:
  - AE-02 (partly), AE-07, AE-08, AE-09: Branch bug, Harshitha.
  - SEC-02, SEC-06, SEC-11, SEC-12, SEC-13 (partly). The `.gitignore`-only failures are Waiting on merge; the rest are Branch bug.

Not done this time: gitleaks (not installed), the 1 MB slowdown case (stopped at 2 minutes), and the end-to-end worker run (covered in the database and integration report: INT-30, INT-31, INT-37).

On my side, done the same day on `qa/pushpam`:
- The analysis adapter and `conftest.py` support the `analysis_engines` layout.
- The AE-04 and AE-06 xfail markers are gone.
- The secret check treats test files anywhere in the tree (`tests/`, `__tests__/`, `test_*.py`, `*.test.*`) and HTML `autocomplete` values as warnings, not failures.

After that, the secret tests pass on PQC-frontend, aakash-port and harshitha. Only Vamsi's two non-test hits (`run_combined_flow.py:71`, `backend/.env.example:3`) still fail, as they should.
