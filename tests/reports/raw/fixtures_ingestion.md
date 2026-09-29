# Raw results: fixtures + ingestion (branch qa/pushpam)

Command: `.venv/bin/pytest tests/ingestion -v -rs` (Python 3.10.6, pytest 9.1.1)
Summary: **37 collected: 11 passed, 0 failed, 26 blocked (skipped)**, ~6s.

## Created
- tests/fixtures/vulnerable-demo-repo/ (README, EXPECTED_FINDINGS.json: 37 findings + 7 true negatives; demo_bank/{app,crypto_utils,settings}.py, config/app.yaml, java/.../AccountService.java, web/statement.js, requirements.txt)
- tests/fixtures/make_zips.py (`build_all(out_dir)`), tests/fixtures/README.md, tests/fixtures/.gitignore
- tests/ingestion/{adapter.py, conftest.py, test_ingestion_contract.py, test_fixtures_selftest.py}

## Results
Passed (selftest, all in test_fixtures_selftest.py): test_build_all_builds_every_fixture, test_demo_zip_has_source_and_junk, test_traversal_entries, test_symlink_entry, test_zip_bomb_ratio_and_size, test_bomb_build_is_fast, test_fake_empty_corrupted, test_nested_contains_zip, test_unicode_and_many, test_answer_key_lines_match_source, test_demo_repo_secrets_are_fake.

Blocked ("BLOCKED: ingestion module not delivered yet (Hima Bindu)"), all in test_ingestion_contract.py:
test_valid_zip_extracts_and_counts, test_excluded_dirs_ignored, test_summary_json_serialisable,
test_traversal_rejected_and_nothing_escapes[traversal_dotdot|traversal_absolute|traversal_windows],
test_symlink_not_followed, test_zip_bomb_rejected_or_limited,
test_invalid_archive_clean_error[fake_zip|corrupted|empty], test_nested_zip_not_recursively_extracted,
test_unicode_names_handled, test_many_files_handled, test_language_detection[.py|.java|.js],
test_file_classification[py|yaml|requirements.txt|README.md|png], test_file_filter_excludes[node_modules|.git|build|__pycache__].

Failed: none.

## Notable
- Assumed API (extractor.extract_zip(zip, dest) -> dict, validator.validate_zip, file_filter.is_excluded, classifier.classify_file, language_detector.detect_language) lives only in tests/ingestion/adapter.py; edit it (and summary-key helpers) when Hima Bindu's module lands. Blocking is per-function, so partial delivery unblocks only matching tests.
- Gotcha: pytest puts tests/ on sys.path, so tests/ingestion/ imports as an empty namespace package `ingestion`. adapter treats a package with no `__file__` as "not delivered". A real repo-root `ingestion/` (with __init__.py) is preferred.
- Zip bomb is streamed (1 GiB zeros, ~1 MB file, whole build ~3s); the contract test fails if >200 MB lands on disk.
- validate_zip is in the assumed API but not yet exercised directly (extract covers it).
- CRYPTO-009 (RSA-2048) is intentionally marked as a quantum-vulnerable finding (medium), not classically weak.
- No generated zips or pycache left in the repo; nothing committed.
