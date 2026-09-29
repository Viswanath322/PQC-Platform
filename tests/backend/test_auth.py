import pytest
from backend_helpers import *  # noqa: F401,F403

REG, LOGIN, ME = f"{V1}/auth/register", f"{V1}/auth/login", f"{V1}/auth/me"
PW = "Str0ng!Passw0rd-qa"


def _reg(api, email=None, password=PW, **extra):
    email = email or f"{uniq('user')}@example.test"
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
    b = api.post(LOGIN, json={"email": f"{uniq('nobody')}@example.test", "password": "wrong"})
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
