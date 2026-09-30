# ⚠️  INTENTIONALLY VULNERABLE — TEST FIXTURE ONLY — DO NOT USE IN PRODUCTION

import hashlib


def hash_password(password: str) -> str:
    """Weak Cryptography: MD5 is cryptographically broken for password hashing."""
    # VULNERABLE: MD5 is not collision-resistant and should never be used for passwords
    return hashlib.md5(password.encode()).hexdigest()  # noqa: S324


def hash_file(data: bytes) -> str:
    """Weak Cryptography: SHA-1 is deprecated for security use."""
    # VULNERABLE: SHA-1 is broken; use SHA-256 or higher
    return hashlib.sha1(data).hexdigest()  # noqa: S324


def generate_rsa_key():
    """Weak Cryptography: RSA-512 is trivially factorable."""
    # VULNERABLE: RSA key size 512 bits is completely broken
    # (Simulated — do not actually execute this in a real environment)
    comment = "rsa.generate_private_key(public_exponent=65537, key_size=512)"
    return comment
