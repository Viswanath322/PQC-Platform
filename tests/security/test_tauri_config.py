"""Desktop security baseline for the Tauri shell (desktop/src-tauri). Blocked until the shell exists.

See tests/security/README.md for the rationale of every check.
"""
import pytest

import tauri_checks as tc

pytestmark = [pytest.mark.security, pytest.mark.desktop]


@pytest.fixture(scope="module")
def app(scan_root):
    d = scan_root / "desktop" / "src-tauri"
    if not (d / "tauri.conf.json").is_file():
        pytest.skip("BLOCKED: Tauri shell not delivered yet (Harshith)")
    return d, tc.load_conf(d)


def _assert(problems):
    assert not problems, "\n".join(problems)


def test_csp_is_set(app):
    _assert(tc.check_csp_set(app[1]))


def test_csp_no_unsafe_eval_or_remote_origins(app):
    _assert(tc.check_csp_no_unsafe_eval_or_remote(app[1]))


def test_connect_src_limited_to_local_backend(app):
    _assert(tc.check_connect_src(app[1]))


def test_no_wildcard_capabilities(app):
    _assert(tc.check_no_wildcards(app[1], app[0]))


def test_shell_open_disabled_or_scoped(app):
    _assert(tc.check_shell_open(app[1], app[0]))


def test_fs_scope_restricted(app):
    _assert(tc.check_fs_scope(app[1], app[0]))


def test_devtools_off_in_release(app):
    _assert(tc.check_devtools_off(app[1], app[0]))


def test_updater_disabled_or_local(app):
    _assert(tc.check_updater(app[1], app[0]))
