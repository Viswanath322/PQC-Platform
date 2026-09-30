# ⚠️  INTENTIONALLY VULNERABLE — TEST FIXTURE ONLY — DO NOT USE IN PRODUCTION

import sqlite3


def get_user(username: str) -> dict | None:
    """SQL Injection: user input is interpolated directly into the query string."""
    conn = sqlite3.connect("demo.db")
    cursor = conn.cursor()
    # VULNERABLE: direct string interpolation allows SQL injection
    query = f"SELECT * FROM users WHERE username = '{username}'"  # noqa: S608
    cursor.execute(query)
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def check_login(username: str, password: str) -> bool:
    """Another SQL injection: password is also concatenated unsafely."""
    conn = sqlite3.connect("demo.db")
    cursor = conn.cursor()
    # VULNERABLE
    cursor.execute(
        "SELECT id FROM users WHERE username = '" + username + "' AND password = '" + password + "'"  # noqa: S608
    )
    return cursor.fetchone() is not None
