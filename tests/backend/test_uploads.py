import re
from pathlib import Path

import pytest
from backend_helpers import *  # noqa: F401,F403

U = f"{V1}/uploads"


def _post(api, name, data, ctype="application/zip"):
    return api.post(U, files={"file": (name, data, ctype)})


def test_upload_valid_zip(api, openapi, tmp_path):
    require_endpoint(openapi, "post", U)
    data = zip_bytes()
    r = _post(api, "repo.zip", data)
    assert r.status_code == 201, r.text
    b = r.json()
    assert re.match(UUID_RE, b["upload_id"])
    assert b["filename"] == "repo.zip"
    assert b["size_bytes"] == len(data)


def test_upload_uppercase_extension_ok(api, openapi):
    require_endpoint(openapi, "post", U)
    assert _post(api, "REPO.ZIP", zip_bytes()).status_code == 201


def test_upload_missing_file_field_422(api, openapi):
    require_endpoint(openapi, "post", U)
    assert api.post(U).status_code == 422
    assert api.post(U, data={"file": "just-a-string"}).status_code == 422


def test_upload_wrong_field_name_422(api, openapi):
    require_endpoint(openapi, "post", U)
    r = api.post(U, files={"upload": ("a.zip", zip_bytes(), "application/zip")})
    assert r.status_code == 422


@pytest.mark.parametrize("name", ["repo.txt", "repo.tar.gz", "repo", "repo.zip.exe", "repo.7z"])
def test_upload_non_zip_extension_rejected(api, openapi, name):
    require_endpoint(openapi, "post", U)
    assert _post(api, name, zip_bytes()).status_code == 400


def test_upload_text_file_named_zip_rejected(api, openapi):
    require_endpoint(openapi, "post", U)
    assert _post(api, "fake.zip", b"this is not a zip\n").status_code == 400


def test_upload_empty_file_rejected(api, openapi):
    require_endpoint(openapi, "post", U)
    assert _post(api, "empty.zip", b"").status_code in (400, 422)


def test_upload_truncated_zip_rejected(api, openapi):
    require_endpoint(openapi, "post", U)
    assert _post(api, "trunc.zip", zip_bytes()[:40]).status_code == 400


def test_upload_html_polyglot_named_zip_rejected(api, openapi):
    require_endpoint(openapi, "post", U)
    assert _post(api, "x.zip", b"<html><script>alert(1)</script></html>").status_code == 400


def test_upload_error_bodies_do_not_leak(api, openapi):
    require_endpoint(openapi, "post", U)
    r = _post(api, "fake.zip", b"nope")
    for bad in ("Traceback", "/Users/", "/home/", "C:\\", "storage/uploads"):
        assert bad not in r.text


def test_upload_path_traversal_filename(api, openapi):
    """'../../evil.zip' must not escape the upload dir and must not be echoed back unsanitised."""
    require_endpoint(openapi, "post", U)
    marker = uniq("evil")
    name = f"../../{marker}.zip"
    r = _post(api, name, zip_bytes())
    assert r.status_code in (201, 400), r.text
    if r.status_code == 201:
        b = r.json()
        assert re.match(UUID_RE, b["upload_id"]), "stored name must be server-generated"
        if UPLOAD_DIR:
            up = Path(UPLOAD_DIR).resolve()
            assert not list(up.parent.parent.rglob(f"{marker}*")) or all(
                up in p.resolve().parents for p in up.parent.parent.rglob(f"{marker}*"))
            assert (up / f"{b['upload_id']}.zip").exists()
        assert ".." not in b["filename"] and "/" not in b["filename"], \
            f"filename echoed unsanitised: {b['filename']!r}"


def test_upload_backslash_traversal_filename(api, openapi):
    require_endpoint(openapi, "post", U)
    r = _post(api, "..\\..\\evil.zip", zip_bytes())
    if r.status_code == 201:
        assert ".." not in r.json()["filename"]


def test_upload_null_byte_filename_not_500(api, openapi):
    require_endpoint(openapi, "post", U)
    r = _post(api, "a\x00.zip", zip_bytes())
    assert r.status_code < 500


def test_upload_zip_slip_archive_accepted_but_not_extracted(api, openapi):
    """Upload only stores the ZIP. A zip-slip entry must not create files on upload."""
    require_endpoint(openapi, "post", U)
    marker = uniq("slip")
    r = _post(api, "slip.zip", zip_bytes({f"../../{marker}.txt": "x"}))
    assert r.status_code in (201, 400)
    if UPLOAD_DIR and r.status_code == 201:
        assert not list(Path(UPLOAD_DIR).resolve().parent.parent.rglob(f"{marker}*"))


def test_upload_oversized_rejected_413(api, openapi):
    """Stream ~201 MB of zeros (generated lazily) and expect 413."""
    require_endpoint(openapi, "post", U)
    boundary = "qaboundary" + uniq("b")
    head = (f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="big.zip"\r\n'
            f"Content-Type: application/zip\r\n\r\n").encode()
    tail = f"\r\n--{boundary}--\r\n".encode()
    chunk = b"\0" * (1024 * 1024)

    def gen():
        yield head
        for _ in range(201):
            yield chunk
        yield tail

    import httpx
    from conftest import API_URL
    try:
        r = httpx.post(API_URL + U, content=gen(), timeout=120,
                       headers={"Content-Type": f"multipart/form-data; boundary={boundary}"})
    except (httpx.WriteError, httpx.ReadError):
        # Server may answer 413 and close the socket while we are still sending; the client can
        # then see a reset instead of the response. Treated as "rejected" (verified 413 via curl).
        return
    assert r.status_code == 413, f"got {r.status_code}"


def test_uploads_method_not_allowed(api, openapi):
    require_endpoint(openapi, "post", U)
    assert api.get(U).status_code == 405
