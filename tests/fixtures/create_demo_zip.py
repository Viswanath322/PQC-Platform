"""Create the demo-banking.zip test fixture used in Day 1 end-to-end testing."""

import io
import zipfile
from pathlib import Path

FIXTURE_DIR = Path(__file__).parent

FILES = {
    "README.md": "# Demo Banking Application\nSample legacy banking app for Day 1 QA testing.\n",
    "src/main.py": "from flask import Flask\napp = Flask(__name__)\n",
    "src/auth/login.py": "def login(username, password):\n    return username == 'admin'\n",
    "src/api/routes.py": "def get_accounts():\n    return []\n",
    "requirements.txt": "flask==2.3.0\nrequests==2.31.0\nsqlalchemy==2.0.0\n",
    "config/settings.py": "DEBUG = False\nSECRET_KEY = 'placeholder'\n",
}


def create_demo_zip() -> Path:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for name, content in FILES.items():
            zf.writestr(name, content)
    dest = FIXTURE_DIR / "demo-banking.zip"
    dest.write_bytes(buf.getvalue())
    print(f"Created {dest} ({len(buf.getvalue())} bytes)")
    return dest


if __name__ == "__main__":
    create_demo_zip()
