"""Language detection based on common source file extensions."""

from pathlib import Path

_LANGUAGES = {
    ".c": "c", ".h": "c", ".cc": "cpp", ".cpp": "cpp", ".cxx": "cpp", ".hpp": "cpp",
    ".cs": "csharp", ".go": "go", ".java": "java", ".js": "javascript",
    ".jsx": "javascript", ".mjs": "javascript", ".ts": "typescript", ".tsx": "typescript",
    ".py": "python", ".rb": "ruby", ".php": "php", ".rs": "rust", ".swift": "swift",
    ".kt": "kotlin", ".kts": "kotlin", ".scala": "scala", ".sh": "shell",
    ".bash": "shell", ".ps1": "powershell", ".pl": "perl", ".lua": "lua",
    ".r": "r", ".dart": "dart", ".ex": "elixir", ".exs": "elixir",
}


def detect_language(path: str | Path) -> str | None:
    return _LANGUAGES.get(Path(path).suffix.lower())
