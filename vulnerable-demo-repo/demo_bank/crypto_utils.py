"""Crypto helpers for demo bank. INTENTIONALLY WEAK / QUANTUM-VULNERABLE - PQC test material."""
import hashlib

from Crypto.Cipher import AES, DES, DES3
from Crypto.PublicKey import RSA
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import ec, rsa

STATIC_IV = b"0000000000000000"  # VULN: CRYPTO-006


def hash_password(pw: str) -> str:
    return hashlib.md5(pw.encode()).hexdigest()  # VULN: CRYPTO-001


def fingerprint(data: bytes) -> str:
    return hashlib.sha1(data).hexdigest()  # VULN: CRYPTO-002


def encrypt_des(key8: bytes, data: bytes) -> bytes:
    return DES.new(key8, DES.MODE_ECB).encrypt(data)  # VULN: CRYPTO-003


def encrypt_3des(key24: bytes, data: bytes) -> bytes:
    return DES3.new(key24, DES3.MODE_CBC, STATIC_IV[:8]).encrypt(data)  # VULN: CRYPTO-004


def encrypt_aes_ecb(key: bytes, data: bytes) -> bytes:
    return AES.new(key, AES.MODE_ECB).encrypt(data)  # VULN: CRYPTO-005


def encrypt_aes_static_iv(key: bytes, data: bytes) -> bytes:
    return AES.new(key, AES.MODE_CBC, STATIC_IV).encrypt(data)  # VULN: CRYPTO-007


def make_rsa_1024():
    return RSA.generate(1024)  # VULN: CRYPTO-008


def make_rsa_2048():
    return rsa.generate_private_key(public_exponent=65537, key_size=2048)  # VULN: CRYPTO-009


def make_signing_key():
    return ec.generate_private_key(ec.SECP256R1())  # VULN: CRYPTO-010


def sign_ecdsa(priv, data: bytes) -> bytes:
    return priv.sign(data, ec.ECDSA(hashes.SHA256()))  # VULN: CRYPTO-011


def strong_hash(data: bytes) -> str:
    return hashlib.sha3_256(data).hexdigest()  # SAFE: TN-004 SHA3-256


def strong_aes_key_len() -> int:
    return 32  # SAFE: TN-005 256-bit symmetric key length (not a vulnerability)
