"""
SAST detection rules for the PQC platform.

Each rule is a plain dataclass describing one pattern to search for.
Rules use regex against source text — no AST, no external dependencies.
All detection is deterministic and reproducible.

Rule severity and confidence values are conservative by design:
  - confidence < 0.9 means the pattern can have false positives
  - severity reflects exploitation impact, not just presence
"""

from __future__ import annotations

import re
from dataclasses import dataclass


@dataclass(frozen=True)
class Rule:
    rule_id: str          # stable short identifier used to derive finding_id
    engine: str           # always "sast" for this module
    category: str         # human-readable category label
    severity: str         # critical | high | medium | low
    title: str
    pattern: re.Pattern[str]
    explanation: str
    recommendation: str
    confidence: float     # 0.0 – 1.0
    multiline: bool = False


# ---------------------------------------------------------------------------
# Secret / credential detection rules
# ---------------------------------------------------------------------------

_RULES: list[Rule] = [
    Rule(
        rule_id="SAST-SEC-001",
        engine="sast",
        category="Hardcoded Secret",
        severity="critical",
        title="Hardcoded password or secret in source code",
        pattern=re.compile(
            r'(?i)(password|passwd|secret_?key|api_?key|auth_?key|secret|token)\s*=\s*["\'][^"\']{6,}["\']',
            re.IGNORECASE,
        ),
        explanation=(
            "A plain-text credential is assigned directly in source code. "
            "Attackers who access the repository, binary, or process memory "
            "can extract and reuse the credential without any further effort."
        ),
        recommendation=(
            "Remove the hard-coded value. Load the credential from an environment "
            "variable or a local secrets store (e.g., HashiCorp Vault). "
            "Rotate the exposed credential immediately."
        ),
        confidence=0.85,
    ),
    Rule(
        rule_id="SAST-SEC-002",
        engine="sast",
        category="Hardcoded Secret",
        severity="high",
        title="AWS access key identifier pattern detected",
        pattern=re.compile(r"AKIA[0-9A-Z]{16}"),
        explanation=(
            "A string matching the AWS access key ID format (AKIA…) was found. "
            "If this is a live key, it may grant access to AWS resources."
        ),
        recommendation=(
            "Revoke the key in the AWS IAM console immediately. "
            "Use IAM roles or environment variables; never embed keys in source."
        ),
        confidence=0.95,
    ),
    Rule(
        rule_id="SAST-SEC-003",
        engine="sast",
        category="Hardcoded Secret",
        severity="high",
        title="Private key PEM block in source file",
        pattern=re.compile(r"-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----"),
        explanation=(
            "A PEM-encoded private key was found in a source file. "
            "Private keys must be protected at rest; committing them exposes "
            "the associated cryptographic identity."
        ),
        recommendation=(
            "Delete the file, rotate the key pair immediately, and store private "
            "keys only in secure local key stores. Add *.pem / *.key to .gitignore."
        ),
        confidence=0.99,
    ),

    # ---------------------------------------------------------------------------
    # Injection rules
    # ---------------------------------------------------------------------------
    Rule(
        rule_id="SAST-INJ-001",
        engine="sast",
        category="SQL Injection",
        severity="critical",
        title="SQL query built with string formatting (SQL Injection risk)",
        pattern=re.compile(
            r'(?i)(execute|cursor\.execute|db\.execute|session\.execute)\s*\(\s*[f"\'`].*(%s|%d|\{)',
            re.IGNORECASE,
        ),
        explanation=(
            "User-controlled data appears to be interpolated directly into a SQL "
            "query string via f-string, % formatting, or .format(). "
            "This allows an attacker to alter the query logic and extract or "
            "modify data beyond their authorization."
        ),
        recommendation=(
            "Use parameterized queries (SQLAlchemy text() with :param notation, "
            "or DB-API placeholders). Never build SQL strings from user input."
        ),
        confidence=0.80,
    ),
    Rule(
        rule_id="SAST-INJ-002",
        engine="sast",
        category="SQL Injection",
        severity="critical",
        title="SQL string concatenation with user input",
        pattern=re.compile(
            r"""(?i)(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE).{0,80}['"]\s*\+""",
            re.IGNORECASE,
        ),
        explanation=(
            "A SQL keyword is followed by string concatenation (+). "
            "This pattern frequently indicates dynamic SQL construction from "
            "user-supplied values, which enables SQL injection."
        ),
        recommendation=(
            "Replace all string-concatenated SQL with parameterized queries. "
            "Use an ORM with bound parameters."
        ),
        confidence=0.75,
    ),
    Rule(
        rule_id="SAST-INJ-003",
        engine="sast",
        category="Command Injection",
        severity="critical",
        title="Shell command execution with user-controlled input (shell=True)",
        pattern=re.compile(
            r"(subprocess\.(run|call|check_output|Popen)|os\.system|os\.popen)"
            r"[^)]*shell\s*=\s*True",
            re.IGNORECASE,
        ),
        explanation=(
            "A subprocess or os.system call uses shell=True with what appears to be "
            "a dynamic string. If any part of the command string derives from "
            "user input, an attacker can inject arbitrary shell commands."
        ),
        recommendation=(
            "Pass command arguments as a list (not a string) and set shell=False. "
            "Validate and sanitize all inputs before use in subprocess calls."
        ),
        confidence=0.88,
    ),
    Rule(
        rule_id="SAST-INJ-004",
        engine="sast",
        category="Command Injection",
        severity="high",
        title="os.system() call detected",
        pattern=re.compile(r"\bos\.system\s*\("),
        explanation=(
            "os.system() executes a command string through the system shell. "
            "If the argument includes any user-controlled value, it is vulnerable "
            "to command injection."
        ),
        recommendation=(
            "Replace os.system() with subprocess.run(args_list, shell=False). "
            "Avoid shell=True and validate all inputs."
        ),
        confidence=0.80,
    ),

    # ---------------------------------------------------------------------------
    # Insecure deserialization
    # ---------------------------------------------------------------------------
    Rule(
        rule_id="SAST-DES-001",
        engine="sast",
        category="Insecure Deserialization",
        severity="critical",
        title="pickle.loads() on untrusted data (remote code execution risk)",
        pattern=re.compile(r"\bpickle\.loads?\s*\("),
        explanation=(
            "pickle.loads() deserializes arbitrary Python objects. "
            "Deserializing attacker-controlled data allows arbitrary code execution "
            "on the host (CWE-502)."
        ),
        recommendation=(
            "Replace pickle with JSON or protobuf for data exchange. "
            "If pickle is required internally, never deserialize data that "
            "crossed a trust boundary."
        ),
        confidence=0.90,
    ),

    # ---------------------------------------------------------------------------
    # Path traversal
    # ---------------------------------------------------------------------------
    Rule(
        rule_id="SAST-PATH-001",
        engine="sast",
        category="Path Traversal",
        severity="high",
        title="os.path.join() used with user input without path canonicalization",
        pattern=re.compile(r"\bos\.path\.join\s*\([^)]*\)"),
        explanation=(
            "os.path.join() without a subsequent os.path.realpath() or "
            "Path.resolve() check cannot prevent directory traversal if user "
            "input is passed as a path component (CWE-22)."
        ),
        recommendation=(
            "After joining paths, call Path(...).resolve() and verify the result "
            "is still under the intended base directory before opening the file."
        ),
        confidence=0.65,
    ),

    # ---------------------------------------------------------------------------
    # Weak cryptography (light — deeper patterns in the crypto engine)
    # ---------------------------------------------------------------------------
    Rule(
        rule_id="SAST-CRYPTO-001",
        engine="sast",
        category="Weak Cryptography",
        severity="high",
        title="MD5 used for hashing — cryptographically broken",
        pattern=re.compile(r"\bhashlib\.md5\b"),
        explanation=(
            "MD5 is cryptographically broken: it is vulnerable to collision and "
            "pre-image attacks and must not be used for security purposes "
            "(CWE-327)."
        ),
        recommendation=(
            "Use hashlib.sha256() or higher for integrity checks. "
            "For password hashing use Argon2id or bcrypt."
        ),
        confidence=0.95,
    ),
    Rule(
        rule_id="SAST-CRYPTO-002",
        engine="sast",
        category="Weak Cryptography",
        severity="high",
        title="SHA-1 used for hashing — deprecated for security use",
        pattern=re.compile(r"\bhashlib\.sha1\b"),
        explanation=(
            "SHA-1 is deprecated for security-relevant hashing due to proven "
            "collision attacks. It must not be used for digital signatures, "
            "certificates, or content integrity."
        ),
        recommendation=(
            "Migrate to SHA-256 or SHA-3 for new code. "
            "Existing SHA-1 usage in security contexts must be prioritized for migration."
        ),
        confidence=0.95,
    ),

    # ---------------------------------------------------------------------------
    # Information disclosure
    # ---------------------------------------------------------------------------
    Rule(
        rule_id="SAST-INFO-001",
        engine="sast",
        category="Information Disclosure",
        severity="medium",
        title="traceback.format_exc() returned in API response",
        pattern=re.compile(r"traceback\.format_exc\s*\(\s*\)"),
        explanation=(
            "Returning raw exception tracebacks in API responses leaks internal "
            "file paths, library versions, and logic details to potential attackers "
            "(CWE-209)."
        ),
        recommendation=(
            "Log the traceback internally with a correlation ID. "
            "Return only a generic error message and the correlation ID to clients."
        ),
        confidence=0.90,
    ),
    Rule(
        rule_id="SAST-INJ-005",
        engine="sast",
        category="Code Injection",
        severity="critical",
        title="Dynamic code evaluation detected",
        pattern=re.compile(r"\beval\s*\("),
        explanation="Dynamic evaluation can execute attacker-controlled code in the application process.",
        recommendation="Avoid eval; parse data with a safe format or use an explicit allowlisted interpreter.",
        confidence=0.90,
    ),
    Rule(
        rule_id="SAST-XSS-001",
        engine="sast",
        category="Cross-Site Scripting",
        severity="high",
        title="HTML is assigned through innerHTML",
        pattern=re.compile(r"\.innerHTML\s*="),
        explanation="Assigning untrusted content to innerHTML can execute attacker-controlled markup or script.",
        recommendation="Use textContent or a vetted sanitizer before rendering untrusted HTML.",
        confidence=0.88,
    ),
    Rule(
        rule_id="SAST-SEC-004",
        engine="sast",
        category="Hardcoded Secret",
        severity="critical",
        title="Cloud credential assigned in source or configuration",
        pattern=re.compile(
            r"(?i)\b(?:AWS_SECRET_ACCESS_KEY|AWS_ACCESS_KEY_ID|client_secret|private_key)\b\s*[:=]\s*[\"'][^\"']{6,}[\"']"
        ),
        explanation="A cloud credential or private key value appears to be embedded in a file.",
        recommendation="Remove the value, rotate the credential, and load it from a protected local secret store.",
        confidence=0.94,
    ),

    # ---------------------------------------------------------------------------
    # Day 4: SSRF
    # ---------------------------------------------------------------------------
    Rule(
        rule_id="SAST-SSRF-001",
        engine="sast",
        category="SSRF",
        severity="high",
        title="HTTP request with user-controlled URL (SSRF risk)",
        pattern=re.compile(
            r"(?i)requests?\.(get|post|put|delete|head|patch|request)\s*\(\s*(?:url\s*=\s*)?[a-zA-Z_]\w*",
        ),
        explanation=(
            "An HTTP request is made using a variable as the URL. If that variable "
            "originates from user input, an attacker can trigger server-side requests "
            "to internal services (SSRF — CWE-918)."
        ),
        recommendation=(
            "Validate and allowlist URL schemes and hosts before making HTTP requests. "
            "Never forward user-supplied URLs directly to requests.get() or similar."
        ),
        confidence=0.65,
    ),

    # ---------------------------------------------------------------------------
    # Day 4: Weak randomness
    # ---------------------------------------------------------------------------
    Rule(
        rule_id="SAST-RAND-001",
        engine="sast",
        category="Weak Randomness",
        severity="medium",
        title="random module used — not cryptographically secure",
        pattern=re.compile(r"\brandom\.(?:random|randint|choice|shuffle|seed)\b"),
        explanation=(
            "The random module is not cryptographically secure. "
            "Using it for tokens, passwords, session IDs or cryptographic keys "
            "makes them predictable (CWE-338)."
        ),
        recommendation=(
            "Replace random with secrets.token_hex(), secrets.token_urlsafe() or "
            "os.urandom() for all security-sensitive values."
        ),
        confidence=0.70,
    ),

    # ---------------------------------------------------------------------------
    # Day 4: XXE
    # ---------------------------------------------------------------------------
    Rule(
        rule_id="SAST-XXE-001",
        engine="sast",
        category="XXE Injection",
        severity="high",
        title="XML parsing without explicit external-entity protection (XXE risk)",
        pattern=re.compile(
            r"(?i)(?:etree\.parse|etree\.fromstring|xml\.dom|minidom\.parse|"
            r"lxml\.etree\.parse|parseString)\s*\(",
        ),
        explanation=(
            "XML parsers that have not explicitly disabled external entity processing "
            "are vulnerable to XXE injection. An attacker can read arbitrary files "
            "from the server (CWE-611)."
        ),
        recommendation=(
            "Use the defusedxml library, or set resolve_entities=False in lxml, "
            "or use XMLParser(no_network=True, resolve_entities=False)."
        ),
        confidence=0.72,
    ),
]


def get_rules() -> list[Rule]:
    """Return all SAST rules. Safe to call multiple times — list is immutable."""
    return list(_RULES)
