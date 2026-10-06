"""Settings for demo bank. All values are FAKE. INTENTIONALLY INSECURE."""
import requests

DEBUG = True  # VULN: CFG-001
AWS_ACCESS_KEY_ID = "AKIAIOSFODNN7EXAMPLE"  # VULN: SECRET-001
AWS_SECRET_ACCESS_KEY = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"  # VULN: SECRET-002
DB_PASSWORD = "FAKE-DEMO-PASSWORD-DO-NOT-USE"  # VULN: SECRET-003
ALLOWED_HOSTS = ["*"]  # VULN: CFG-004


def call_partner_api(url):
    return requests.get(url, verify=False, timeout=5)  # VULN: CFG-002


def call_partner_api_safe(url):
    return requests.get(url, verify=True, timeout=5)  # SAFE: TN-006 TLS verification on
