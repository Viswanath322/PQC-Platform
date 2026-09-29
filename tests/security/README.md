# tests/security

Reusable pytest checks over any tree. Select the tree with `PQC_SCAN_ROOT` (default: repo root):

```bash
pytest tests/security -v -rs                                   # this checkout
PQC_SCAN_ROOT=/path/to/worktree pytest tests/security -rs      # any branch checked out elsewhere
tests/security/scan_all_branches.sh                            # every origin/* branch via temporary worktrees
```
Results: PASS, FAIL (defect), SKIPPED `BLOCKED: ...` (dependency not delivered yet). Warnings in the pytest summary
are non-failing observations (dev placeholders, mock-data URLs, non-critical audit findings).

## Allowlist
`tests/fixtures/vulnerable-demo-repo/` is intentionally insecure (fake secrets such as `AKIAIOSFODNN7EXAMPLE`,
`FAKE-DEMO-PASSWORD-DO-NOT-USE`, weak crypto, an old-pinned requirements.txt). It is excluded from secret scanning,
committed-artifact rules, the external-call scan and the dependency audit (`sec_helpers.FIXTURE_ALLOWLIST`).
`tests/security/` itself is excluded from secret scanning because it contains the detection regexes.
`tests/security/.gitleaks.toml` carries the same allowlist for teammates running gitleaks
(`gitleaks detect --config tests/security/.gitleaks.toml`). Dev placeholders (`change_me_locally`, `admin123`) are warnings.

## Test map
| File | What / why |
|---|---|
| `test_secrets.py` | `.env` files, private keys, AWS keys, JWT-like tokens, hard-coded `password=`-style literals, detect-secrets. Leaked credentials in a repo are reusable by anyone with clone access. |
| `test_committed_artifacts.py` | `git ls-files` must not contain `*.db/*.sqlite`, `*.zip` (outside fixtures), `__pycache__`/`*.pyc`, `.env`, `node_modules`, `dist/`/`build/`/`src-tauri/target`, `*.pem/*.key`, `storage/uploads/*`. Databases and uploads may hold customer code; build output bloats history. |
| `test_gitignore.py` | Root `.gitignore` exists and (evaluated in isolation with `git check-ignore`) ignores `.env`, `__pycache__`, `node_modules`, `*.db`, `storage/uploads`, `src-tauri/target`. Prevents the above from being committed by accident. |
| `test_no_external_calls.py` | Air-gap: no external URLs, CDN/Google Fonts, analytics/telemetry SDKs in `desktop/`, and no external hosts / outbound HTTP-client use in `backend/`. W3C/XML namespace ids are ignored; URLs in mock-data files are info only. |
| `test_dependencies.py` | `pip-audit` on every `requirements*.txt` (pip-audit has no severity, so any advisory fails); `npm audit --omit=dev` in `desktop/` (Critical/High fail, others warn). Needs network to the advisory DBs (dev/CI only). |
| `test_tauri_config.py` + `tauri_checks.py` | Desktop baseline, blocked until `desktop/src-tauri/tauri.conf.json` exists. Logic self-tested in `test_tauri_checks_selftest.py`. |

### Tauri checks (why each exists)
1. **CSP is set** - a null CSP lets injected script load anything; the WebView is the app's attack surface.
2. **No `unsafe-eval`, wildcards or remote origins in CSP** - blocks eval-based XSS and any path for the UI to reach the internet (air-gap).
3. **`connect-src` limited to `'self'`, `ipc:`, `http://ipc.localhost`, `http://127.0.0.1:8000` / `localhost:8000`** (1420 for dev) - the UI may only talk to the local FastAPI.
4. **No wildcard capabilities/permissions** (`*`, `:*`, `windows: ["*"]`, remote-URL capability) - least privilege for IPC commands.
5. **Shell open disabled or scoped** - `shell:default`/`shell:allow-open` lets the WebView launch arbitrary URLs/programs; `execute/spawn` needs an allow-list.
6. **`fs` scope restricted** - no `$HOME/**`, `/**`, `**`; unscoped write/remove permissions fail. The app should read only user-selected files and its own data dir.
7. **Devtools off in release** - no `devtools` cargo feature / `devtools: true`; devtools exposes state and lets users bypass UI controls.
8. **Updater disabled or local** - an updater pointing at the internet is an outbound call and a supply-chain path.

## Requirements
`pip install -r tests/requirements.txt` (pytest, detect-secrets, pip-audit). `git`, and `npm` for the audit/frontend tests.
