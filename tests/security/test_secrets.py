"""Secret scanning over PQC_SCAN_ROOT: detect-secrets + targeted regexes.

Allowlist: the vulnerable demo repo (tests/pushpam branch; intentional fake secrets) and tests/security/ itself.
Dev placeholder credentials (change_me_locally, admin123, ...) are reported as warnings, not failures.
"""
import re
from pathlib import Path

import pytest

from sec_helpers import (LOCK_FILES, is_allowlisted, list_files, read_text, report_warnings, rel, snippet)

pytestmark = pytest.mark.security

PLACEHOLDERS = ("change_me_locally", "admin123", "changeme", "change_me", "your_password", "example",
                "replace-this", "replace_this", "replace-me", "development-only", "mock_jwt_")
TEST_NOISE = {"Secret Keyword", "Basic Auth Credentials"}  # dummy values in test code
MOCK_DATA_RE = re.compile(r"^desktop/src/data/[^/]*[mM]ock[^/]*\.(?:ts|tsx|json)$")
DOC_EXAMPLE_KEYS = {"AKIAIOSFODNN7EXAMPLE"}  # AWS's own documentation example key

PRIVATE_KEY_RE = re.compile(r"-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP |ENCRYPTED )?PRIVATE KEY(?: BLOCK)?-----")
AWS_KEY_RE = re.compile(r"\b(?:AKIA|ASIA)[0-9A-Z]{16}\b")
JWT_RE = re.compile(r"\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}")
# NAME = "literal"  /  NAME: literal  where NAME mentions password/secret/token/api key
ASSIGN_RE = re.compile(
    r"""(?ix)\b[A-Za-z0-9_.-]*(?:password|passwd|pwd|secret|api[_-]?key|access[_-]?key|auth[_-]?token|token)[A-Za-z0-9_-]*
        ["']?\s*(?:=|:)\s*(?P<q>["']?)(?P<val>[^\s"'#,;)}\]]{4,})(?P=q)""")
URL_CRED_RE = re.compile(r"[a-z][a-z0-9+.\-]*://[^\s/:@]+:(?P<val>[^\s/@]{3,})@")
CODE_EXT = (".py", ".ts", ".tsx", ".js", ".jsx", ".rs", ".java")
NON_LITERAL = re.compile(r"(?i)^(?:\$|\{|<|os\.|env|process\.|getenv|settings\.|config|none|null|true|false|str|string|int|field|optional|required|secret_key$|\*+$|x+$)")


def _files(root):
    for r in list_files(root):
        if is_allowlisted(r) or Path(r).name in LOCK_FILES:
            continue
        text = read_text(root / r)
        if text is not None:
            yield r, text


def _classify(value: str) -> str:
    v = value.lower()
    return "placeholder" if any(p in v for p in PLACEHOLDERS) else "secret"


def test_env_files_not_present(scan_root):
    bad = []
    for r in list_files(scan_root):
        if is_allowlisted(r):
            continue
        n = Path(r).name
        if (n == ".env" or n.startswith(".env.") or n.endswith(".env")) and not n.endswith((".example", ".sample", ".template")):
            bad.append(r)
    assert not bad, f".env files present in tree (must never be committed): {bad}"


def test_private_keys_and_cloud_keys(scan_root):
    hits = []
    for r, text in _files(scan_root):
        for i, line in enumerate(text.splitlines(), 1):
            if PRIVATE_KEY_RE.search(line):
                hits.append(f"{r}:{i} private key block")
            for m in AWS_KEY_RE.findall(line):
                if m not in DOC_EXAMPLE_KEYS:
                    hits.append(f"{r}:{i} AWS access key {m[:6]}...")
            if JWT_RE.search(line):
                hits.append(f"{r}:{i} JWT-like token")
    assert not hits, "credential material found:\n" + "\n".join(hits)


def test_hardcoded_passwords(scan_root):
    real, warn = [], []
    for r, text in _files(scan_root):
        if r.endswith((".md", ".txt", ".rst")):
            continue  # docs are covered by the placeholder warning test below
        for i, line in enumerate(text.splitlines(), 1):
            code = r.endswith(CODE_EXT)
            vals = [m.group("val") for m in ASSIGN_RE.finditer(line)
                    if not NON_LITERAL.match(m.group("val")) and (m.group("q") or not code)]
            vals += [m.group("val") for m in URL_CRED_RE.finditer(line) if not NON_LITERAL.match(m.group("val"))]
            for v in vals:
                # test code and UI mock-data files carry dummy values by design (mock data must be labelled: see frontend tests)
                is_warn = _classify(v) == "placeholder" or r.startswith("tests/") or bool(MOCK_DATA_RE.search(r))
                (warn if is_warn else real).append(f"{r}:{i} {snippet(line, 100)}")
    report_warnings(warn, "Dev placeholder credentials in code/config (not failures; must not reach a release)")
    assert not real, "possible hard-coded credentials:\n" + "\n".join(real)


def test_placeholder_credentials_inventory(scan_root):
    """Informational: lists dev placeholders (incl. docs/SQL) so they are visible in every run."""
    found = []
    for r, text in _files(scan_root):
        for i, line in enumerate(text.splitlines(), 1):
            low = line.lower()
            for p in ("change_me_locally", "admin123"):
                if p in low:
                    found.append(f"{r}:{i} [{p}] {snippet(line, 90)}")
    report_warnings(found, "Placeholder credential inventory")


def test_detect_secrets(scan_root):
    try:
        from detect_secrets import SecretsCollection
        from detect_secrets.settings import default_settings
    except ImportError:
        pytest.skip("BLOCKED: detect-secrets not installed (pip install -r tests/requirements.txt)")
    real, warn = [], []
    sc = SecretsCollection()
    with default_settings():
        for r, _ in _files(scan_root):
            sc.scan_file(str(scan_root / r))
    for path, items in sc.data.items():
        rp = rel(scan_root, Path(path)) if Path(path).is_absolute() else path
        lines = (scan_root / rp).read_text(errors="replace").splitlines()
        for s in items:
            line = lines[s.line_number - 1] if s.line_number <= len(lines) else ""
            if any(k in line for k in DOC_EXAMPLE_KEYS):
                continue
            entry = f"{rp}:{s.line_number} {s.type} | {snippet(line, 90)}"
            is_warn = _classify(line) == "placeholder" or (rp.startswith("tests/") and s.type in TEST_NOISE) \
                or bool(MOCK_DATA_RE.search(rp))
            (warn if is_warn else real).append(entry)
    report_warnings(warn, "detect-secrets hits that are dev placeholders")
    assert not real, "detect-secrets findings:\n" + "\n".join(real)
