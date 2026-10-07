"""
Cryptographic detection rules for the PQC platform.

Each rule identifies one algorithm or API pattern. Quantum-vulnerable
algorithms are flagged with high/critical severity; deprecated-but-classical
weaknesses use medium/high.

PQC risk mapping version: 1.0 (2026-09)
Reference: NIST FIPS 203 (ML-KEM), FIPS 204 (ML-DSA), FIPS 205 (SLH-DSA)
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field


@dataclass(frozen=True)
class CryptoRule:
    rule_id: str
    algorithm: str            # short name used in inventory (e.g. "RSA-2048")
    category: str
    severity: str
    title: str
    pattern: re.Pattern[str]
    explanation: str
    recommendation: str
    confidence: float
    quantum_vulnerable: bool = False
    nist_reference: str = ""  # FIPS standard the migration target follows


_CRYPTO_RULES: list[CryptoRule] = [

    # -------------------------------------------------------------------------
    # Quantum-vulnerable key exchange / asymmetric encryption
    # -------------------------------------------------------------------------
    CryptoRule(
        rule_id="CRYPTO-QV-001",
        algorithm="RSA",
        category="Quantum-Vulnerable Algorithm",
        severity="critical",
        title="RSA key generation detected — quantum-vulnerable under Shor's algorithm",
        pattern=re.compile(
            r"rsa\.generate_private_key|RSA\.generate\s*\(|RSAKey\s*\(|genrsa|"
            r"Crypto\.PublicKey\.RSA\.generate",
            re.IGNORECASE,
        ),
        explanation=(
            "RSA relies on the difficulty of integer factorization. "
            "A sufficiently powerful quantum computer running Shor's algorithm "
            "can factor RSA keys in polynomial time, breaking past and future "
            "encrypted communications (Harvest Now, Decrypt Later threat)."
        ),
        recommendation=(
            "Migrate key encapsulation to NIST FIPS 203 ML-KEM (Kyber-768 or Kyber-1024). "
            "For hybrid classical+PQC consider X25519Kyber768. "
            "For signatures migrate to FIPS 204 ML-DSA (Dilithium)."
        ),
        confidence=0.92,
        quantum_vulnerable=True,
        nist_reference="FIPS 203 (ML-KEM)",
    ),
    CryptoRule(
        rule_id="CRYPTO-QV-002",
        algorithm="ECDSA/ECDH",
        category="Quantum-Vulnerable Algorithm",
        severity="critical",
        title="Elliptic curve key generation detected — quantum-vulnerable under Shor's algorithm",
        pattern=re.compile(
            r"ec\.generate_private_key|ECDSA|ECDH|secp256r1|secp384r1|"
            r"prime256v1|P-256|P-384|brainpool",
            re.IGNORECASE,
        ),
        explanation=(
            "Elliptic curve algorithms (ECDSA, ECDH) are vulnerable to quantum "
            "polynomial-time order-finding. Shor's algorithm breaks ECDSA signatures "
            "and ECDH key exchange at the key sizes currently deployed."
        ),
        recommendation=(
            "Replace digital signatures with NIST FIPS 204 ML-DSA (Dilithium-3 or -5). "
            "Replace ECDH key exchange with NIST FIPS 203 ML-KEM or a hybrid scheme."
        ),
        confidence=0.88,
        quantum_vulnerable=True,
        nist_reference="FIPS 204 (ML-DSA)",
    ),
    CryptoRule(
        rule_id="CRYPTO-QV-003",
        algorithm="Diffie-Hellman",
        category="Quantum-Vulnerable Algorithm",
        severity="critical",
        title="Diffie-Hellman key exchange detected — quantum-vulnerable",
        pattern=re.compile(
            r"dh\.generate_parameters|\bDHE\b|\bDiffieHellman\b|generate_dh_parameters",
            re.IGNORECASE,
        ),
        explanation=(
            "Finite-field Diffie-Hellman (FFDH) is broken by Shor's discrete "
            "logarithm algorithm on quantum hardware. Any session keys negotiated "
            "with DH can be retroactively decrypted."
        ),
        recommendation=(
            "Replace FFDH with NIST FIPS 203 ML-KEM or a hybrid X25519+ML-KEM scheme."
        ),
        confidence=0.88,
        quantum_vulnerable=True,
        nist_reference="FIPS 203 (ML-KEM)",
    ),

    # -------------------------------------------------------------------------
    # Broken/weak classical algorithms
    # -------------------------------------------------------------------------
    CryptoRule(
        rule_id="CRYPTO-WEAK-001",
        algorithm="MD5",
        category="Broken Hash Algorithm",
        severity="high",
        title="MD5 hash function detected — cryptographically broken",
        pattern=re.compile(r"\bhashlib\.md5\b(?!\s*\([^)]*usedforsecurity\s*=\s*False)|MD5\.new\s*\(|DigestMD5", re.IGNORECASE),
        explanation=(
            "MD5 is broken: practical collision attacks exist. "
            "It must not be used for digital signatures, certificate fingerprints, "
            "or any security-sensitive integrity check."
        ),
        recommendation=(
            "Replace with SHA-256 or SHA-3 for integrity checks. "
            "For password storage use Argon2id. "
            "Note: MD5 remains acceptable for non-security checksums (e.g., cache keys)."
        ),
        confidence=0.95,
        quantum_vulnerable=False,
    ),
    CryptoRule(
        rule_id="CRYPTO-WEAK-002",
        algorithm="SHA-1",
        category="Deprecated Hash Algorithm",
        severity="high",
        title="SHA-1 hash function detected — deprecated for security use",
        pattern=re.compile(r"\bhashlib\.sha1\b|SHA1\.new|\.sha1\(\)", re.IGNORECASE),
        explanation=(
            "SHA-1 has demonstrated collision attacks (SHAttered, 2017). "
            "It is prohibited for TLS certificates, code-signing, and digital signatures."
        ),
        recommendation=(
            "Migrate to SHA-256 or SHA-384. "
            "Grover's algorithm halves SHA-1's effective security against brute force; "
            "SHA-256 (128-bit post-quantum security) is the minimum acceptable."
        ),
        confidence=0.95,
        quantum_vulnerable=False,
    ),
    CryptoRule(
        rule_id="CRYPTO-WEAK-003",
        algorithm="DES/3DES",
        category="Broken Symmetric Algorithm",
        severity="high",
        title="DES or 3DES encryption detected — deprecated and weak",
        pattern=re.compile(r"\b(DES|TripleDES|3DES|des\.new|DES3)\b", re.IGNORECASE),
        explanation=(
            "DES (56-bit key) is trivially brute-forceable. "
            "3DES (Triple DES) has a 112-bit effective key length but is deprecated "
            "by NIST as of 2023 due to Sweet32 birthday attacks."
        ),
        recommendation=(
            "Replace with AES-256-GCM for symmetric encryption. "
            "AES has 128-bit post-quantum security (Grover's algorithm halves key strength)."
        ),
        confidence=0.95,
        quantum_vulnerable=False,
    ),
    CryptoRule(
        rule_id="CRYPTO-WEAK-004",
        algorithm="RC4",
        category="Broken Stream Cipher",
        severity="high",
        title="RC4 stream cipher detected — cryptographically broken",
        pattern=re.compile(r"\b(RC4|ARC4|arcfour)\b", re.IGNORECASE),
        explanation=(
            "RC4 has multiple statistical biases and is broken in TLS contexts. "
            "RFC 7465 prohibits RC4 in TLS."
        ),
        recommendation=(
            "Replace with ChaCha20-Poly1305 (AEAD) or AES-256-GCM."
        ),
        confidence=0.95,
        quantum_vulnerable=False,
    ),

    # -------------------------------------------------------------------------
    # Weak key size / mode detection
    # -------------------------------------------------------------------------
    CryptoRule(
        rule_id="CRYPTO-KEY-001",
        algorithm="AES-CBC",
        category="Weak Cipher Mode",
        severity="medium",
        title="AES used in CBC mode — prefer authenticated encryption (AES-GCM)",
        pattern=re.compile(r"modes\.CBC\s*\(|AES\.MODE_CBC|Cipher.*CBC", re.IGNORECASE),
        explanation=(
            "CBC mode does not provide integrity protection. "
            "Padding oracle attacks (POODLE, BEAST) can decrypt CBC-mode ciphertext. "
            "A static or predictable IV further weakens the cipher."
        ),
        recommendation=(
            "Replace AES-CBC with AES-256-GCM (authenticated encryption). "
            "If CBC is required, use a random IV per message and add a separate HMAC."
        ),
        confidence=0.88,
        quantum_vulnerable=False,
    ),
    CryptoRule(
        rule_id="CRYPTO-KEY-002",
        algorithm="PKCS1v15",
        category="Weak Padding Scheme",
        severity="high",
        title="RSA PKCS#1 v1.5 padding detected — vulnerable to Bleichenbacher attack",
        pattern=re.compile(r"PKCS1_v1_5|padding\.PKCS1v15\b", re.IGNORECASE),
        explanation=(
            "RSA with PKCS#1 v1.5 padding is vulnerable to Bleichenbacher's "
            "adaptive chosen-ciphertext attack, which can decrypt ciphertexts "
            "without the private key through error timing differences."
        ),
        recommendation=(
            "Replace with OAEP padding using SHA-256 MGF1 for encryption, "
            "or PSS padding for signatures."
        ),
        confidence=0.90,
        quantum_vulnerable=False,
    ),
    CryptoRule(
        rule_id="CRYPTO-KEY-003",
        algorithm="Static-IV",
        category="Weak IV Usage",
        severity="medium",
        title="Hardcoded or zeroed initialization vector (IV) detected",
        pattern=re.compile(
            r"(?i)(IV|iv|nonce)\s*=\s*(b[\"']\\x00|b[\"']\x00|bytes\([0-9]+\)|b[\"']\0+[\"'])",
        ),
        explanation=(
            "A static or zeroed IV reused with the same key destroys semantic "
            "security. In CBC mode, identical plaintexts produce identical ciphertexts; "
            "in CTR/GCM mode, nonce reuse enables key recovery."
        ),
        recommendation=(
            "Generate a fresh cryptographically random IV/nonce for each "
            "encryption operation using os.urandom(16) or secrets.token_bytes(16)."
        ),
        confidence=0.85,
        quantum_vulnerable=False,
    ),
    CryptoRule(
        rule_id="CRYPTO-KEY-004",
        algorithm="AES-ECB",
        category="Weak Cipher Mode",
        severity="high",
        title="AES used in ECB mode",
        pattern=re.compile(r"MODE_ECB|modes\.ECB|AES/ECB", re.IGNORECASE),
        explanation="ECB reveals repeated plaintext patterns because blocks are encrypted independently.",
        recommendation="Use an authenticated mode such as AES-GCM with a fresh nonce.",
        confidence=0.95,
    ),
    CryptoRule(
        rule_id="CRYPTO-WEAK-005",
        algorithm="MD5/SHA-1",
        category="Deprecated Hash Algorithm",
        severity="high",
        title="Java MessageDigest uses MD5 or SHA-1",
        pattern=re.compile(r"MessageDigest\.getInstance\s*\(\s*[\"'](?:MD5|SHA-?1)[\"']", re.IGNORECASE),
        explanation="MD5 and SHA-1 are unsuitable for security-sensitive hashing due to practical collision attacks.",
        recommendation="Use SHA-256 or SHA-3 for integrity; use Argon2id for password storage.",
        confidence=0.95,
    ),

    # -------------------------------------------------------------------------
    # Weak password hashing
    # -------------------------------------------------------------------------
    CryptoRule(
        rule_id="CRYPTO-PASS-001",
        algorithm="PBKDF2-low-iterations",
        category="Weak Password Hash",
        severity="medium",
        title="PBKDF2 with critically low iteration count detected",
        pattern=re.compile(r"PBKDF2HMAC.*iterations\s*=\s*([1-9][0-9]{0,4})\b", re.IGNORECASE),
        explanation=(
            "PBKDF2 with fewer than 100,000 iterations is insufficient against "
            "GPU-based brute-force attacks. OWASP 2026 recommends at least "
            "600,000 iterations for PBKDF2-HMAC-SHA256."
        ),
        recommendation=(
            "Increase PBKDF2 iterations to >= 600,000, or switch to Argon2id "
            "which provides better memory-hardness for the same compute cost."
        ),
        confidence=0.80,
        quantum_vulnerable=False,
    ),

    # -------------------------------------------------------------------------
    # Day 4: Weak RSA key size (< 2048 bits)
    # -------------------------------------------------------------------------
    CryptoRule(
        rule_id="CRYPTO-KEY-005",
        algorithm="RSA-weak-key",
        category="Weak Key Size",
        severity="critical",
        title="RSA key size below 2048 bits — trivially factorable",
        pattern=re.compile(
            r"(?:key_size|bits)\s*=\s*(?:512|768|1024)\b",
            re.IGNORECASE,
        ),
        explanation=(
            "RSA keys smaller than 2048 bits can be factored by classical computers "
            "using the General Number Field Sieve. A 512-bit key can be broken in "
            "hours; a 1024-bit key in months with modern hardware."
        ),
        recommendation=(
            "Use RSA-2048 as the minimum. Prefer RSA-3072 or 4096 for long-lived "
            "keys, or migrate to NIST FIPS 203 ML-KEM for post-quantum security."
        ),
        confidence=0.97,
        quantum_vulnerable=True,
        nist_reference="FIPS 203 (ML-KEM)",
    ),

    # -------------------------------------------------------------------------
    # Day 4: Hardcoded salt in password hashing
    # -------------------------------------------------------------------------
    CryptoRule(
        rule_id="CRYPTO-PASS-002",
        algorithm="Hardcoded-Salt",
        category="Weak Password Hash",
        severity="high",
        title="Hardcoded or static salt in password hash",
        pattern=re.compile(
            r"(?i)\bsalt\s*=\s*(?:b[\"'][^\"']{1,64}[\"']|[\"'][^\"']{1,64}[\"'])",
        ),
        explanation=(
            "A static or hardcoded salt eliminates the protection that salts provide "
            "against rainbow-table and pre-computation attacks. All users with the "
            "same password will have identical hashes."
        ),
        recommendation=(
            "Generate a unique random salt per user per password using "
            "os.urandom(16) or secrets.token_bytes(16). Store the salt alongside "
            "the hash, never as a constant."
        ),
        confidence=0.82,
        quantum_vulnerable=False,
    ),
]


def get_crypto_rules() -> list[CryptoRule]:
    return list(_CRYPTO_RULES)
