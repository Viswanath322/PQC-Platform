# Vulnerable Demo Repository

> **⚠️ INTENTIONALLY INSECURE — TEST FIXTURE ONLY**
>
> This repository contains deliberately introduced security vulnerabilities
> for use as analysis-engine test input. It is **not** real application code.
> **Never deploy, execute, or use this code in any real environment.**

## Vulnerabilities present (for QA verification)

| File | Vulnerability | CWE |
|------|--------------|-----|
| `src/auth/service.py` | SQL Injection | CWE-89 |
| `src/util/runner.py` | Command Injection | CWE-78 |
| `src/config/secrets.py` | Hardcoded Credentials | CWE-798 |
| `src/crypto/cipher.py` | Weak Cryptography (MD5 / RC4 / RSA-512) | CWE-327 |
| `src/api/download.py` | Path Traversal | CWE-22 |

All secrets in this directory are **fake** and randomly generated for test use.
