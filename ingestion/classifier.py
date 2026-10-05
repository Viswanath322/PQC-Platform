"""Coarse repository file classification by extension and filename."""

from pathlib import Path
import re

_CONFIG = {".json", ".yaml", ".yml", ".toml", ".ini", ".cfg", ".conf", ".properties", ".xml"}
_MANIFEST_NAMES = {
    "package.json", "package-lock.json", "pnpm-lock.yaml", "yarn.lock",
    "requirements.txt", "requirements.in", "pyproject.toml", "poetry.lock", "setup.cfg",
    "cargo.toml", "cargo.lock", "go.sum", "go.mod",
    "pom.xml", "build.gradle", "build.gradle.kts", "packages.config",
    "gemfile.lock", "gemfile", "composer.json", "composer.lock", "podfile",
    "pipfile", "pipfile.lock", "setup.py",
}
_DOCS = {".md", ".rst", ".txt", ".adoc"}
_DATA = {".csv", ".tsv", ".sql", ".db", ".sqlite"}
_CONFIG_NAMES = {
    ".env", ".editorconfig", ".gitignore", ".dockerignore", ".npmrc", ".nvmrc",
    "dockerfile", "makefile", "cmakelists.txt", "docker-compose", "docker-compose.yml",
}
_CONFIG_EXTENSIONS = {".env", ".conf", ".config", ".properties", ".ini", ".cfg", ".service", ".desktop", ".tf"}
_CRYPTO_EXTENSIONS = {".pem", ".crt", ".cer", ".key", ".der", ".p12", ".pfx", ".jks", ".pub"}
_CRYPTO_NAMES = {"id_rsa", "id_ecdsa", "id_ed25519"}
_BINARY = {".exe", ".dll", ".so", ".dylib", ".bin", ".class", ".jar", ".pdf", ".png", ".jpg", ".jpeg", ".gif", ".zip", ".tar", ".gz"}
_SOURCE = {
    ".c", ".h", ".cc", ".cpp", ".cxx", ".hpp", ".cs", ".go", ".java", ".js", ".jsx",
    ".mjs", ".ts", ".tsx", ".py", ".rb", ".php", ".rs", ".swift", ".kt", ".kts",
    ".scala", ".sh", ".bash", ".ps1", ".pl", ".lua", ".r", ".dart", ".ex", ".exs",
    ".html", ".htm",
}
_GENERATED_DIRS = {"generated", "gen", "vendor", "dist", "build", "coverage"}


def classify_file(path: str | Path, sample: bytes | None = None) -> str:
    p = Path(path)
    name, suffix = p.name.lower(), p.suffix.lower()
    
    # Issue #9: Crypto material detection
    if suffix in _CRYPTO_EXTENSIONS or name in _CRYPTO_NAMES:
        return "crypto_material"
    
    # Check for requirements-*.txt pattern
    if name.startswith("requirements") and name.endswith(".txt"):
        return "manifest"
    # Issue #9: Check for .csproj, .gemspec, .sbt extensions
    if name in _MANIFEST_NAMES or name.endswith(".lock") or suffix in {".csproj", ".gemspec", ".sbt"}:
        return "manifest"
    if name in _CONFIG_NAMES or name.startswith(".env.") or suffix in _CONFIG_EXTENSIONS or name.endswith(".config"):
        return "config"
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
    if sample is None:
        return "binary"
    if b"\0" in sample:
        return "binary"
    try:
        text = sample.decode("utf-8")
    except UnicodeDecodeError:
        return "binary"
    stripped = text.lstrip()
    if not stripped:
        return "docs"
    lines = text.splitlines()[:8]
    if stripped.startswith(("{", "[", "<?xml", "---")) or any(
        ":" in line and "=" not in line for line in lines
    ):
        return "config"
    meaningful = [line.strip() for line in lines if line.strip() and not line.lstrip().startswith("#")]
    if meaningful and all(re.match(r"^[A-Za-z_][\w.-]*\s*=", line) for line in meaningful):
        return "config"
    if any(token in text for token in ("=", "(", ";", "function ", "class ", "def ", "import ")):
        return "source"
    return "docs"
