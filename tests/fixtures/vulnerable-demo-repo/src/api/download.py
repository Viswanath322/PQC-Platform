# ⚠️  INTENTIONALLY VULNERABLE — TEST FIXTURE ONLY — DO NOT USE IN PRODUCTION

import os


def download_file(filename: str) -> bytes:
    """Path Traversal: user-supplied filename is joined without sanitisation."""
    base_dir = "/var/app/files"
    # VULNERABLE: an attacker can supply '../../../etc/passwd' to read arbitrary files
    file_path = os.path.join(base_dir, filename)  # noqa: S101
    with open(file_path, "rb") as f:  # noqa: PTH123
        return f.read()


def serve_report(report_id: str) -> str:
    """Another path traversal: no canonicalization before open."""
    reports_dir = "/var/reports/"
    # VULNERABLE: no call to os.path.realpath / Path.resolve before open
    with open(reports_dir + report_id) as f:  # noqa: PTH123
        return f.read()
