# ⚠️  INTENTIONALLY VULNERABLE — TEST FIXTURE ONLY — DO NOT USE IN PRODUCTION

import os
import subprocess


def run_report(report_name: str) -> str:
    """Command Injection: user-supplied name is concatenated into a shell command."""
    # VULNERABLE: shell=True with unsanitised user input allows command injection
    output = subprocess.check_output(f"cat reports/{report_name}", shell=True)  # noqa: S602, S607
    return output.decode()


def ping_host(host: str) -> None:
    """Another command injection via os.system."""
    os.system(f"ping -c 1 {host}")  # noqa: S605, S607
