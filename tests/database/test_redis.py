import pytest
from urllib.parse import urlparse

from dbenv import REDIS_URL, blocked


@pytest.fixture(scope="module")
def r():
    import redis
    c = redis.Redis.from_url(REDIS_URL, socket_connect_timeout=3, decode_responses=True)
    try:
        c.ping()
    except redis.exceptions.AuthenticationError:
        pytest.skip("BLOCKED: Redis requires a password not supplied in PQC_REDIS_URL")
    except redis.exceptions.RedisError as e:
        blocked(f"Redis not reachable at {REDIS_URL}: {e}")
    return c


def test_ping(r):
    assert r.ping() is True


def test_set_get_roundtrip(r):
    r.set("qa:probe", "1", ex=30)
    assert r.get("qa:probe") == "1"
    r.delete("qa:probe")


@pytest.mark.security
def test_redis_requires_authentication():
    """Unauthenticated PING must be refused. Redis without requirepass is a finding."""
    import redis
    u = urlparse(REDIS_URL)
    c = redis.Redis(host=u.hostname, port=u.port or 6379, socket_connect_timeout=3)
    try:
        c.ping()
    except redis.exceptions.AuthenticationError:
        return
    except redis.exceptions.RedisError as e:
        blocked(f"Redis not reachable: {e}")
    pytest.fail("FINDING: Redis accepts unauthenticated commands (no requirepass / ACL)")
