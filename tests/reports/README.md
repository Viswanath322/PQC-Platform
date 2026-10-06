# QA + security audits

This is the `audit/pushpam` branch. It only holds QA and security audit results, never code, and it's never merged into `main`.

- `QA+Security_fixes.md`: the current list of open issues, in priority order, with an owner and a fix for each. Updated after every audit.
- `daily/YYYY-MM-DD.md`: what was tested that day, what got fixed, and what's new. Detailed results for that day are in `daily/YYYY-MM-DD/`.
- `../DAY1_ACCEPTANCE_CHECKLIST.md`: the Day 1 acceptance checklist.

Related branches:

- `qa/pushpam`: the test suite that produces these results (merged into `main` through a PR)
- `tests/pushpam`: the intentionally vulnerable demo app the analysis engines are measured against (never merged)
