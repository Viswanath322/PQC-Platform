import base64
import hashlib
import hmac
import json
import time

import pytest
from backend_helpers import *  # noqa: F401,F403

REG, LOGIN, ME = f"{V1}/auth/register", f"{V1}/auth/login", f"{V1}/auth/me"
PW = "Str0ng!Passw0rd-qa"


def _reg(api, email=None, password=PW, **extra):
    email = email or f"{uniq('user')}@example.com"
    return email, api.post(REG, json={"email": email, "password": password, **extra})


def test_register_success(api, openapi):
    require_endpoint(openapi, "post", REG)
    email, r = _reg(api)
    assert r.status_code in (200, 201), r.text
    assert "password" not in r.text.lower() or PW not in r.text


def test_register_duplicate_email(api, openapi):
    require_endpoint(openapi, "post", REG)
    email, r = _reg(api)
    assert r.status_code in (200, 201)
    _, r2 = _reg(api, email=email)
    assert r2.status_code in (400, 409, 422)


@pytest.mark.parametrize("payload", [{}, {"email": "a@b.test"}, {"password": PW},
                                     {"email": "not-an-email", "password": PW},
                                     {"email": "", "password": ""}])
def test_register_validation(api, openapi, payload):
    require_endpoint(openapi, "post", REG)
    assert api.post(REG, json=payload).status_code == 422


def test_register_weak_password_rejected(api, openapi):
    require_endpoint(openapi, "post", REG)
    _, r = _reg(api, password="1")
    assert r.status_code in (400, 422)


def test_login_success_and_me(api, openapi):
    require_endpoint(openapi, "post", LOGIN)
    require_endpoint(openapi, "get", ME)
    email, r = _reg(api)
    assert r.status_code in (200, 201)
    lr = api.post(LOGIN, json={"email": email, "password": PW})
    assert lr.status_code == 200, lr.text
    token = lr.json().get("access_token") or lr.json().get("token")
    assert token
    me = api.get(ME, headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json().get("email") == email
    assert "password" not in me.text.lower()


def test_login_wrong_password(api, openapi):
    require_endpoint(openapi, "post", LOGIN)
    email, _ = _reg(api)
    assert api.post(LOGIN, json={"email": email, "password": "wrong-pw"}).status_code in (400, 401)


def test_login_unknown_user_same_error_as_wrong_password(api, openapi):
    require_endpoint(openapi, "post", LOGIN)
    email, _ = _reg(api)
    a = api.post(LOGIN, json={"email": email, "password": "wrong"})
    b = api.post(LOGIN, json={"email": f"{uniq('nobody')}@example.com", "password": "wrong"})
    assert a.status_code == b.status_code and a.json() == b.json()  # no user enumeration


def test_login_validation(api, openapi):
    require_endpoint(openapi, "post", LOGIN)
    assert api.post(LOGIN, json={}).status_code == 422


def test_me_requires_token(api, openapi):
    require_endpoint(openapi, "get", ME)
    assert api.get(ME).status_code in (401, 403)


def test_me_rejects_garbage_token(api, openapi):
    require_endpoint(openapi, "get", ME)
    assert api.get(ME, headers={"Authorization": "Bearer not.a.jwt"}).status_code in (401, 403)


def test_sql_injection_login(api, openapi):
    require_endpoint(openapi, "post", LOGIN)
    r = api.post(LOGIN, json={"email": "' OR '1'='1", "password": "' OR '1'='1"})
    assert r.status_code in (401, 400, 422)


# ---- extra hardening checks (retest) ----------------------------------------------------------

def _b64(d: bytes) -> str:
    return base64.urlsafe_b64encode(d).rstrip(b"=").decode()


def _forge(claims: dict, secret: str | None, alg="HS256") -> str:
    head = _b64(json.dumps({"alg": alg, "typ": "JWT"}).encode())
    body = _b64(json.dumps(claims).encode())
    sig = b""
    if secret is not None:
        sig = hmac.new(secret.encode(), f"{head}.{body}".encode(), hashlib.sha256).digest()
    return f"{head}.{body}.{_b64(sig)}"


def _login(api, email):
    lr = api.post(LOGIN, json={"email": email, "password": PW})
    assert lr.status_code == 200, lr.text
    return lr.json()


def test_register_response_does_not_expose_password_or_hash(api, openapi):
    require_endpoint(openapi, "post", REG)
    _, r = _reg(api)
    assert r.status_code in (200, 201), r.text
    low = r.text.lower()
    assert "password" not in low and "argon" not in low and "$2b$" not in low


def test_register_cannot_self_assign_admin_role(api, openapi):
    """Mass assignment: extra fields like role must not be honoured on public registration."""
    require_endpoint(openapi, "post", REG)
    _, r = _reg(api, role="admin", organization_id="org-default-001", is_admin=True)
    if r.status_code in (200, 201):
        assert r.json().get("role") not in ("admin", "superuser", "owner"), r.text


def test_register_duplicate_email_different_case(api, openapi):
    require_endpoint(openapi, "post", REG)
    email, r = _reg(api)
    assert r.status_code in (200, 201)
    _, r2 = _reg(api, email=email.upper())
    assert r2.status_code in (400, 409, 422), f"case-variant duplicate accepted: {r2.status_code}"


@pytest.mark.parametrize("pw", ["short", "a" * 11])
def test_register_short_password_rejected(api, openapi, pw):
    require_endpoint(openapi, "post", REG)
    _, r = _reg(api, password=pw)
    assert r.status_code in (400, 422)


def test_register_overlong_password_rejected(api, openapi):
    """A multi-megabyte password must be a client error, never a 500 or a hang."""
    require_endpoint(openapi, "post", REG)
    _, r = _reg(api, password="A" * 1_000_000)
    assert r.status_code in (400, 413, 422)


@pytest.mark.xfail(reason="FINDING: only a length rule, common passwords such as 'password1234' are accepted",
                   strict=False)
def test_register_common_password_rejected(api, openapi):
    require_endpoint(openapi, "post", REG)
    _, r = _reg(api, password="password1234")
    assert r.status_code in (400, 422)


def test_login_response_shape(api, openapi):
    require_endpoint(openapi, "post", LOGIN)
    email, r = _reg(api)
    body = _login(api, email)
    assert body.get("token_type", "bearer").lower() == "bearer"
    assert body["access_token"].count(".") == 2


def test_me_rejects_alg_none_token(api, openapi):
    require_endpoint(openapi, "get", ME)
    email, r = _reg(api)
    uid = r.json()["id"]
    tok = _forge({"sub": uid, "exp": int(time.time()) + 600}, None, alg="none")
    assert api.get(ME, headers={"Authorization": f"Bearer {tok}"}).status_code in (401, 403)


def test_me_rejects_token_with_bad_signature(api, openapi):
    require_endpoint(openapi, "get", ME)
    email, r = _reg(api)
    tok = _forge({"sub": r.json()["id"], "exp": int(time.time()) + 600}, "some-attacker-secret")
    assert api.get(ME, headers={"Authorization": f"Bearer {tok}"}).status_code in (401, 403)


def test_me_rejects_token_signed_with_repo_default_secret(api, openapi):
    """If the server runs with the secret that is hardcoded in the repo, anyone can forge a token."""
    require_endpoint(openapi, "get", ME)
    email, r = _reg(api)
    for secret in ("development-only-change-this-secret", "replace-this-with-a-long-random-local-secret"):
        tok = _forge({"sub": r.json()["id"], "exp": int(time.time()) + 600}, secret)
        got = api.get(ME, headers={"Authorization": f"Bearer {tok}"})
        assert got.status_code in (401, 403), f"forged token accepted (secret {secret!r} is in the repo)"


def test_me_rejects_expired_token_without_signature_bypass(api, openapi):
    require_endpoint(openapi, "get", ME)
    tok = _forge({"sub": "x", "exp": int(time.time()) - 600}, "some-attacker-secret")
    assert api.get(ME, headers={"Authorization": f"Bearer {tok}"}).status_code in (401, 403)


@pytest.mark.parametrize("hdr", ["Bearer", "Basic abc", "bearer", "Token abc"])
def test_me_malformed_authorization_header(api, openapi, hdr):
    require_endpoint(openapi, "get", ME)
    assert api.get(ME, headers={"Authorization": hdr}).status_code in (401, 403)


def test_login_error_body_is_generic(api, openapi):
    require_endpoint(openapi, "post", LOGIN)
    email, _ = _reg(api)
    r = api.post(LOGIN, json={"email": email, "password": "wrong-password-123"})
    assert r.status_code in (400, 401)
    assert email not in r.text and "hash" not in r.text.lower()
