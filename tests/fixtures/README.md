# Test fixtures

## vulnerable-demo-repo/
Intentionally vulnerable "demo banking" app (Python + Java + JS + YAML + requirements.txt).
All secrets are fake. Every vulnerable line ends with `VULN: <ID>`; decoys end with `SAFE: TN-nnn`.
`EXPECTED_FINDINGS.json` is the answer key (`findings` with category/rule/severity/file/line/cwe,
and `true_negatives` for false-positive measurement). `test_answer_key_lines_match_source` fails
if a line number drifts - update the key whenever a source file is edited.
`node_modules/` and `.git/` are not committed; they are injected as junk entries into `demo-banking.zip`.

## make_zips.py
`python tests/fixtures/make_zips.py <out_dir>` or `make_zips.build_all(out_dir) -> {name: Path}`.
Generated ZIPs are git-ignored (`.gitignore`) and must never be committed. Build takes ~3s.

| ZIP | Property | Expected ingestion handling |
|---|---|---|
| demo-banking.zip | demo repo + `node_modules/`, `.git/`, `build/`, `__pycache__/`, `dist/` junk | accepted; junk excluded; file count matches summary |
| traversal_dotdot.zip | entry `../../evil.txt` | rejected; nothing written outside dest |
| traversal_absolute.zip | entry `/tmp/evil.txt` | rejected; `/tmp/evil.txt` not created |
| traversal_windows.zip | `..\..\evil.txt`, `C:\evil.txt` | rejected |
| symlink.zip | symlink `link_to_passwd` -> `/etc/passwd` | not followed / not materialised as symlink |
| zip_bomb.zip | ~1 MB on disk, 1 GiB zeros (ratio >1000) | rejected or size-limited, fast |
| fake_zip.zip | plain text named .zip | clean error (not a crash) |
| empty.zip | valid empty archive | clean error or zero-file summary |
| corrupted.zip | truncated valid zip | clean error |
| nested.zip | zip inside zip | inner archive not auto-expanded |
| unicode_names.zip | CJK / Cyrillic / accented / emoji names | handled, no crash |
| many_files.zip | 5,000 tiny entries | handled (accepted with 5,000 files, or clean limit error) |
