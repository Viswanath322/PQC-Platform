"""
CryptoComponent — structured CBOM record produced by the Crypto engine.

Day 3: initial CBOM foundation. Each detected crypto algorithm use becomes
one CryptoComponent record. The component carries enough metadata for the
UI PQC dashboard and the report CBOM section.

PQC risk mapping version: 1.0  (source: NIST FIPS 203/204/205, 2024)
"""

from __future__ import annotations

from dataclasses import dataclass


# PQC quantum-risk level for a detected algorithm
# "quantum_vulnerable" → broken by Shor's algorithm (RSA, ECC, DH)
# "weakened"          → halved security by Grover's algorithm (AES-128, SHA-256)
# "safe"              → currently post-quantum safe (AES-256, SHA-384+)
# "deprecated"        → broken classically (MD5, SHA-1, DES, RC4)
RISK_QUANTUM_VULNERABLE = "quantum_vulnerable"
RISK_WEAKENED = "weakened"
RISK_SAFE = "safe"
RISK_DEPRECATED = "deprecated"


@dataclass(frozen=True)
class CryptoComponent:
    """
    One detected cryptographic component from a repository scan.

    Attributes
    ----------
    component_id:
        Stable UUID string derived from (scan_id, rule_id, file_path, line_number).
    scan_id:
        UUID of the scan that produced this record.
    algorithm:
        Normalised algorithm name (e.g. "RSA", "AES-256", "ECDSA", "MD5").
    category:
        Algorithm category ("asymmetric", "symmetric", "hash", "mac", "kdf", "stream").
    file_path:
        Repository-relative POSIX path.
    line_number:
        Source line where the algorithm was detected, or None.
    detection_method:
        Short description of how the algorithm was found
        (e.g. "regex:import-pattern", "regex:api-call").
    confidence:
        Detection confidence, 0.0–1.0.
    quantum_risk:
        One of the RISK_* constants above.
    nist_migration_target:
        NIST FIPS standard for the recommended post-quantum replacement,
        or empty string if none applies.
    rule_id:
        Stable identifier of the rule that produced this component.
    rule_version:
        Version string of the rule set.
    is_development:
        True for fixture/synthetic records.
    """

    component_id: str
    scan_id: str
    algorithm: str
    category: str
    file_path: str
    line_number: int | None
    detection_method: str
    confidence: float
    quantum_risk: str
    nist_migration_target: str = ""
    rule_id: str = ""
    rule_version: str = ""
    is_development: bool = False

    def __post_init__(self) -> None:
        for field_name in ("component_id", "scan_id", "algorithm", "category",
                           "file_path", "detection_method"):
            v = getattr(self, field_name)
            if not isinstance(v, str) or not v.strip():
                raise ValueError(f"CryptoComponent.{field_name} must be a non-empty string")
        valid_risks = {RISK_QUANTUM_VULNERABLE, RISK_WEAKENED, RISK_SAFE, RISK_DEPRECATED}
        if self.quantum_risk not in valid_risks:
            raise ValueError(
                f"quantum_risk must be one of {valid_risks}, got '{self.quantum_risk}'"
            )
        if not (0.0 <= self.confidence <= 1.0):
            raise ValueError("confidence must be between 0 and 1")
