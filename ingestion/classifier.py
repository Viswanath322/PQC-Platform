"""Coarse repository file classification by extension and filename."""

from pathlib import Path

_CONFIG = {".json", ".yaml", ".yml", ".toml", ".ini", ".cfg", ".conf", ".properties", ".xml"}
_MANIFEST_NAMES = {
    "package-lock.json", "pnpm-lock.yaml", "yarn.lock", "requirements.txt",
    "pyproject.toml", "poetry.lock", "cargo.lock", "go.sum", "go.mod",
    "pom.xml", "build.gradle", "gemfile.lock", "composer.lock",
}
_DOCS = {".md", ".rst", ".txt", ".adoc"}
_DATA = {".csv", ".tsv", ".sql", ".db", ".sqlite"}
_BINARY = {".exe", ".dll", ".so", ".dylib", ".bin", ".class", ".jar", ".pdf", ".png", ".jpg", ".jpeg", ".gif", ".zip", ".tar", ".gz"}
_SOURCE = {
    ".c", ".h", ".cc", ".cpp", ".cxx", ".hpp", ".cs", ".go", ".java", ".js", ".jsx",
    ".mjs", ".ts", ".tsx", ".py", ".rb", ".php", ".rs", ".swift", ".kt", ".kts",
    ".scala", ".sh", ".bash", ".ps1", ".pl", ".lua", ".r", ".dart", ".ex", ".exs",
}
_GENERATED_DIRS = {"generated", "gen", "vendor", "dist", "build", "coverage"}


def classify_file(path: str | Path) -> str:
    p = Path(path)
    name, suffix = p.name.lower(), p.suffix.lower()
    if name in _MANIFEST_NAMES or name.endswith(".lock"):
        return "manifest"
    if any(part.lower() in _GENERATED_DIRS for part in p.parts):
        return "generated"
    if suffix in _DOCS:
        return "docs"
    if suffix in _DATA:
        return "data"
    if suffix in _BINARY:
        return "binary"
    if suffix in _CONFIG:
        return "config"
    if suffix in _SOURCE:
        return "source"
    return "binary"
