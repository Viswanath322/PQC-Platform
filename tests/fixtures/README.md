# Test fixtures

## Demo repo
The intentionally vulnerable demo banking app and its answer key live on their own branch, `tests/pushpam`, so this branch holds no vulnerable code. To use it:

```bash
git worktree add .worktrees/tests-pushpam tests/pushpam
export PQC_DEMO_REPO=.worktrees/tests-pushpam/vulnerable-demo-repo
```

With `PQC_DEMO_REPO` set, `demo-banking.zip` is built from that repo and the answer-key checks run. Without it, `demo-banking.zip` is built from a small harmless sample with the same file layout, and the answer-key checks are Blocked. `node_modules/` and `.git/` junk entries are added to `demo-banking.zip` either way.

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
