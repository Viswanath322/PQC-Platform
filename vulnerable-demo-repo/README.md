# vulnerable-demo-repo ("demo banking")

**WARNING: This project is INTENTIONALLY VULNERABLE.** It is internal
Silicofeller Quantum test material used to validate the PQC Security Assessment
Platform's SAST, crypto/PQC, dependency and configuration engines.

- Never deploy it, never run it as a service, never copy code from it.
- All secrets, keys and passwords in it are FAKE (e.g. AWS's documented example
  key `AKIAIOSFODNN7EXAMPLE`, password `FAKE-DEMO-PASSWORD-DO-NOT-USE`).
- Every vulnerable line carries a trailing `VULN: <ID>` comment. The answer key is
  `EXPECTED_FINDINGS.json` (findings + `true_negatives` decoys for false-positive measurement).
- Line numbers in the answer key are exact; if you edit a source file, update the key
  in the same commit.

## Layout

| Path | Language | Purpose |
|---|---|---|
| `demo_bank/app.py` | Python | SQLi, command injection, path traversal, pickle, SSRF, eval |
| `demo_bank/crypto_utils.py` | Python | MD5, SHA-1, DES/3DES, AES-ECB, static IV, RSA-1024, ECDSA P-256 |
| `demo_bank/settings.py` | Python | hardcoded fake secrets, DEBUG=True, TLS verify disabled |
| `config/app.yaml` | YAML | insecure configuration |
| `java/.../AccountService.java` | Java | SQLi, MD5, hardcoded password |
| `web/statement.js` | JavaScript | eval, hardcoded fake token, weak hash |
| `requirements.txt` | pip | old pinned vulnerable versions |

## Directories generated at test time (not committed)

`node_modules/` and `.git/` cannot sensibly be committed inside another repository.
The ingestion exclusion tests generate them: `tests/fixtures/make_zips.py` on the `qa/pushpam` branch adds junk
`node_modules/...` and `.git/...` entries to `demo-banking.zip`, and analysis of these
must ignore them.
