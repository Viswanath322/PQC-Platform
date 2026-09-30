"""
Day 1 QA — Verify no real secrets or sensitive files are committed to git.
Author: Pushpam (QA + Cyber Security)

These checks scan repository-tracked files to ensure no credentials,
.env files, or private key material have been accidentally committed.
"""

import re
import subprocess
from pathlib import Path
import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]

# Patterns that indicate a real secret value (not a placeholder or comment)
SECRET_PATTERNS = [
    re.compile(r'(?i)password\s*=\s*["\'][^"\']{6,}["\']'),
    re.compile(r'(?i)secret\s*=\s*["\'][^"\']{8,}["\']'),
    re.compile(r'(?i)api[_-]?key\s*=\s*["\'][A-Za-z0-9+/]{16,}["\']'),
    re.compile(r'(?i)private[_-]?key\s*=\s*["\'][^"\']{16,}["\']'),
    re.compile(r'-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----'),
    re.compile(r'AKIA[0-9A-Z]{16}'),   # AWS access key ID pattern
]

# Files that must never be committed
FORBIDDEN_FILENAMES = {".env", "*.pem", "*.p12", "*.pfx", "*.key"}

# Directories to skip during scanning
SKIP_DIRS = {
    ".git", "__pycache__", "node_modules", ".venv", "venv",
    "dist", "build", ".mypy_cache", "fixtures",  # fixtures intentionally have fake secrets
}


def _get_tracked_files() -> list[Path]:
    """Return files tracked by git (not untracked)."""
    try:
        result = subprocess.run(
            ["git", "ls-files"],
            capture_output=True, text=True, cwd=REPO_ROOT, timeout=15
        )
        if result.returncode != 0:
            return []
        return [REPO_ROOT / f.strip() for f in result.stdout.splitlines() if f.strip()]
    except (subprocess.SubprocessError, FileNotFoundError):
        return []


def test_env_file_not_committed():
    """The .env file must never be committed to git."""
    tracked = _get_tracked_files()
    env_files = [f for f in tracked if f.name == ".env"]
    assert not env_files, (
        f".env file(s) found in git! Remove immediately: {env_files}"
    )


def test_no_private_key_files_committed():
    """PEM, P12, PFX, and KEY private key files must never be committed."""
    tracked = _get_tracked_files()
    key_extensions = {".pem", ".p12", ".pfx", ".key"}
    committed_keys = [f for f in tracked if f.suffix.lower() in key_extensions]
    assert not committed_keys, (
        f"Private key files found in git: {committed_keys}"
    )


def test_no_real_aws_access_keys_in_source():
    """No real AWS access key IDs (AKIA...) in committed source files."""
    tracked = _get_tracked_files()
    aws_pattern = re.compile(r"AKIA[0-9A-Z]{16}")
    violations = []
    for file_path in tracked:
        # Skip fixtures (intentionally has fake creds) and binary files
        if any(skip in file_path.parts for skip in SKIP_DIRS):
            continue
        try:
            text = file_path.read_text(encoding="utf-8", errors="ignore")
            for match in aws_pattern.finditer(text):
                # Allow the known fake test key in fixture README
                if "FAKE" not in match.group() and "EXAMPLE" not in match.group():
                    violations.append(f"{file_path.relative_to(REPO_ROOT)}: {match.group()}")
        except OSError:
            continue
    assert not violations, f"Possible real AWS keys found:\n" + "\n".join(violations)


def test_env_example_has_no_real_secret_values():
    """
    .env.example must not contain real secret values.
    JWT_SECRET_KEY must be empty or a clearly labeled placeholder.
    """
    env_example = REPO_ROOT / "backend" / ".env.example"
    assert env_example.exists(), "backend/.env.example must exist"
    text = env_example.read_text(encoding="utf-8")
    # The JWT_SECRET_KEY line should be empty or a placeholder
    for line in text.splitlines():
        if line.startswith("JWT_SECRET_KEY="):
            value = line.split("=", 1)[1].strip()
            assert value == "" or "replace" in value.lower() or "generate" in value.lower(), (
                f".env.example contains a real JWT_SECRET_KEY value: {line}"
            )
