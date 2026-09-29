# tests/pushpam: intentionally vulnerable test code

> **Read this first.** Everything on this branch is insecure **on purpose**. It isn't a bug, a leak or a mistake, so please don't "fix" it, and never merge this branch into `main`.

## What this is

We're building a security scanner (the PQC Security Assessment Platform), and the only way to prove a scanner works is to run it on code where we already know every problem.

This branch holds that code: a small fake banking app called **demo banking**, with 37 security issues planted at known lines. It also has 7 lines that look risky but are actually safe, to check that the scanner doesn't raise false alarms.

The answer key is [`vulnerable-demo-repo/EXPECTED_FINDINGS.json`](vulnerable-demo-repo/EXPECTED_FINDINGS.json). When the analysis engines scan this repo, we compare their findings against it:

- every planted issue found → the engine detects that rule
- a planted issue missed → a gap in the engine
- one of the 7 safe lines flagged → a false positive

This is the same idea as the fixture folders that security tools like Bandit or Semgrep keep in their own repositories.

## What's planted

| Category | Count | Examples |
|---|---|---|
| SAST | 15 | SQL injection, command injection, path traversal, `eval`, `pickle`, SSRF, XSS, hardcoded secrets |
| Crypto / PQC | 12 | MD5, SHA-1, DES, 3DES, AES-ECB, static IV, RSA-1024, RSA-2048 and ECDSA P-256 (quantum-vulnerable) |
| Configuration | 7 | `DEBUG=True`, TLS verification off, TLS 1.0, allowed hosts `*` |
| Dependency | 3 | Old `Flask`, `requests` and `PyYAML` versions with known CVEs |

Severity: 7 critical, 14 high, 15 medium, 1 low. The code is in Python, Java and JavaScript. Each vulnerable line ends with a `VULN: <ID>` comment matching the answer key.

## Is it safe to have this in the repo?

Yes.

- **Every secret is fake.** The AWS key is `AKIAIOSFODNN7EXAMPLE`, which is Amazon's own documentation example, and passwords look like `FAKE-DEMO-PASSWORD-DO-NOT-USE`.
- **Nothing here runs.** It's never imported, installed, built or deployed. The scanner only reads it as text.
- **It can't reach `main` by accident.** This is an orphan branch with no shared history with `main`, so GitHub won't offer a normal pull request from it.

If GitHub shows a security alert (for example Dependabot on `vulnerable-demo-repo/requirements.txt`), it's expected. Dismiss it with the reason **"Vulnerable code is used in tests"**.

## Rules

- Don't merge this branch into `main` or any feature branch.
- Don't copy code from it into the product.
- Don't add real secrets, real customer code or anything that could actually be exploited outside this repo.
- If you change a source file, update the line numbers in `EXPECTED_FINDINGS.json` in the same commit.

## How it's used

The QA suite lives on the `qa/pushpam` branch. To run the answer-key and analysis checks against this code, check this branch out next to it and point the suite at it:

```bash
git worktree add .worktrees/tests-pushpam tests/pushpam
PQC_DEMO_REPO=.worktrees/tests-pushpam/vulnerable-demo-repo pytest tests -v -rs
```

Without `PQC_DEMO_REPO`, the QA suite uses a small harmless sample instead, and the answer-key checks are reported as Blocked.

## Layout

```
vulnerable-demo-repo/
├── EXPECTED_FINDINGS.json        answer key (37 findings + 7 true negatives)
├── README.md                     file-by-file details
├── demo_bank/app.py              SQLi, command injection, path traversal, pickle, SSRF, eval
├── demo_bank/crypto_utils.py     weak and quantum-vulnerable crypto
├── demo_bank/settings.py         fake secrets, insecure settings
├── config/app.yaml               insecure configuration
├── java/.../AccountService.java  SQLi, MD5, hardcoded password
├── web/statement.js              eval, fake token, weak hash, XSS
└── requirements.txt              old vulnerable package versions
```

Questions: Pushpam (QA + security).
