"""Repository path exclusions used before classification and analysis."""

from pathlib import Path

EXCLUDED_DIRS = {
    ".git", ".hg", ".svn", "node_modules", "__pycache__",
    ".pytest_cache", ".mypy_cache", ".ruff_cache", ".tox",
    ".venv", "venv", "coverage", ".next", ".gradle",
    ".idea", ".vscode", "pods", "site-packages",
}
EXCLUDED_FILES = {".ds_store", "thumbs.db"}


def is_excluded(path: str | Path) -> bool:
    parts = [part.lower() for part in Path(path).parts]
    # Issue #14: Return bool, not empty list
    if not parts:
        return False
    # Issue #10: Only check folder parts (not the filename itself)
    return any(part in EXCLUDED_DIRS for part in parts[:-1]) or (parts and parts[-1] in EXCLUDED_FILES)


def filter_files(paths: list[Path]) -> list[Path]:
    return [path for path in paths if not is_excluded(path)]
