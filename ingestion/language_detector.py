"""Language detection based on common source file extensions."""

from pathlib import Path

_LANGUAGES = {
    ".c": "c", ".h": "c", ".cc": "cpp", ".cpp": "cpp", ".cxx": "cpp", ".hpp": "cpp",
    ".cs": "csharp", ".go": "go", ".java": "java", 
    ".js": "javascript", ".jsx": "javascript", ".mjs": "javascript", ".cjs": "javascript",
    ".ts": "typescript", ".tsx": "typescript", ".mts": "typescript",
    ".py": "python", ".pyi": "python",
    ".rb": "ruby", ".php": "php", ".rs": "rust", ".swift": "swift",
    ".kt": "kotlin", ".kts": "kotlin", ".scala": "scala", 
    ".sh": "shell", ".bash": "shell",
    ".ps1": "powershell", ".pl": "perl", ".lua": "lua",
    ".r": "r", ".dart": "dart", ".ex": "elixir", ".exs": "elixir",
    ".vue": "vue", ".svelte": "svelte", ".groovy": "groovy",
    ".m": "objective-c", ".mm": "objective-c",
    ".sol": "solidity", ".proto": "protobuf", ".jsp": "jsp",
    ".html": "html", ".htm": "html",
}


def detect_language(path: str | Path) -> str | None:
    """Detect programming language from file extension.
    
    Issue #13: Extended to cover .cjs, .mts, .pyi, .vue, .svelte, .groovy,
    .m/.mm, .sol, .proto, .jsp, and .html.
    """
    return _LANGUAGES.get(Path(path).suffix.lower())
