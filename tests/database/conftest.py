"""Fixtures for database tests (MySQL via pymysql, Redis via redis-py)."""
from urllib.parse import urlparse, unquote

import pytest

from dbenv import MYSQL_URL, blocked


def mysql_connect(**overrides):
    import pymysql
    u = urlparse(MYSQL_URL)
    args = dict(host=u.hostname, port=u.port or 3306, user=unquote(u.username or ""),
                password=unquote(u.password or ""), database=u.path.lstrip("/"),
                charset="utf8mb4", autocommit=True, connect_timeout=5,
                cursorclass=pymysql.cursors.DictCursor)
    args.update(overrides)
    return pymysql.connect(**args)


@pytest.fixture(scope="session")
def db():
    """Autocommit MySQL connection; Blocked if MySQL is unreachable."""
    try:
        conn = mysql_connect()
    except Exception as e:  # noqa: BLE001
        blocked(f"MySQL not reachable at {MYSQL_URL}: {e}")
    yield conn
    conn.close()


@pytest.fixture()
def q(db):
    """Run a query, return all rows."""
    def run(sql, args=None):
        with db.cursor() as c:
            c.execute(sql, args)
            return c.fetchall()
    return run


@pytest.fixture()
def run(db):
    """Execute a statement (no result)."""
    def _run(sql, args=None):
        with db.cursor() as c:
            c.execute(sql, args)
    return _run
