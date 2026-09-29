"""Self-test of the Tauri check logic against synthetic good/bad configs (runs on every branch)."""
import json

import tauri_checks as tc

GOOD = {"app": {"security": {"csp": "default-src 'self'; connect-src 'self' ipc: http://ipc.localhost http://127.0.0.1:8000; "
                                    "img-src 'self' data:; style-src 'self' 'unsafe-inline'"}}}
BAD = {"app": {"security": {"csp": "default-src *; script-src 'self' 'unsafe-eval'; connect-src https://api.example.com http://127.0.0.1:9999"}},
       "plugins": {"updater": {"endpoints": ["https://updates.example.com/latest.json"]}},
       "app2": {"devtools": True}}


def _dir(tmp_path, caps, cargo=""):
    (tmp_path / "capabilities").mkdir()
    (tmp_path / "capabilities" / "default.json").write_text(json.dumps(caps))
    (tmp_path / "Cargo.toml").write_text(cargo)
    return tmp_path


def test_good_config_passes(tmp_path):
    d = _dir(tmp_path, {"windows": ["main"], "permissions": ["core:default", {"identifier": "fs:allow-read-file", "allow": [{"path": "$APPDATA/**"}]}]},
             'tauri = { version = "2" }')
    assert not tc.check_csp_set(GOOD) and not tc.check_csp_no_unsafe_eval_or_remote(GOOD) and not tc.check_connect_src(GOOD)
    assert not tc.check_no_wildcards(GOOD, d) and not tc.check_shell_open(GOOD, d)
    assert not tc.check_fs_scope(GOOD, d) and not tc.check_devtools_off(GOOD, d) and not tc.check_updater(GOOD, d)


def test_bad_config_is_detected(tmp_path):
    d = _dir(tmp_path, {"windows": ["*"], "permissions": ["shell:default", "fs:allow-write-file", "foo:*",
                                                        {"identifier": "fs:allow-read-file", "allow": [{"path": "$HOME/**"}]}]},
             'tauri = { version = "2", features = ["devtools"] }')
    assert tc.check_csp_set({}) 
    assert tc.check_csp_no_unsafe_eval_or_remote(BAD)
    assert tc.check_connect_src(BAD)
    assert tc.check_no_wildcards(BAD, d) and tc.check_shell_open(BAD, d) and tc.check_fs_scope(BAD, d)
    assert tc.check_devtools_off(BAD, d) and tc.check_updater(BAD, d)
