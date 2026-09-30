# ⚠️  INTENTIONALLY VULNERABLE — TEST FIXTURE ONLY — FAKE CREDENTIALS ONLY

# VULNERABLE: Hardcoded credentials (fake/test values — not real secrets)
DATABASE_URL = "mysql://admin:P@ssw0rd_fake_test_9921@db.internal/demo"  # noqa: S105
JWT_SECRET = "hardcoded_jwt_secret_fake_aaaabbbbcccc1234"  # noqa: S105
API_KEY = "FAKE_API_KEY_test_1234567890abcdef"  # noqa: S105
AWS_ACCESS_KEY_ID = "AKIAIOSFAKE000EXAMPLE"
AWS_SECRET_ACCESS_KEY = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYFAKE_KEY"  # noqa: S105
STRIPE_SECRET = "sk_test_FAKE_STRIPE_KEY_0000000000000000"  # noqa: S105
