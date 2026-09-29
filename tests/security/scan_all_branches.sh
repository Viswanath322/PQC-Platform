#!/usr/bin/env bash
# Run tests/security against every remote branch using a throw-away git worktree per branch.
# Usage: tests/security/scan_all_branches.sh [remote]   (default remote: origin)
# The tests (this checkout's tests/) are run against each branch's tree via PQC_SCAN_ROOT.
set -u
export PYTHONDONTWRITEBYTECODE=1
HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HERE/../.." && pwd)"
REMOTE="${1:-origin}"
PY="${PYTHON:-$REPO/.venv/bin/python}"; [ -x "$PY" ] || PY=python3
TMP="$(mktemp -d)"
cleanup() {
  for wt in "$TMP"/*; do [ -d "$wt" ] && git -C "$REPO" worktree remove --force "$wt" >/dev/null 2>&1; done
  git -C "$REPO" worktree prune; rm -rf "$TMP"
}
trap cleanup EXIT INT TERM

git -C "$REPO" fetch --prune "$REMOTE" >/dev/null 2>&1 || echo "note: fetch failed, using cached remote refs"
SUMMARY=()
while read -r ref; do
  [ "$ref" = "$REMOTE" ] && continue; [ "$ref" = "$REMOTE/HEAD" ] && continue
  case "$ref" in *"->"*) continue;; esac
  name="${ref#"$REMOTE"/}"; safe="$(echo "$name" | tr '/' '_')"
  wt="$TMP/$safe"
  echo "=================== $ref ==================="
  if ! git -C "$REPO" worktree add --detach "$wt" "$ref" >/dev/null 2>&1; then
    SUMMARY+=("$ref: could not create worktree"); continue
  fi
  out="$(cd "$REPO" && PQC_SCAN_ROOT="$wt" "$PY" -m pytest tests/security -rs -q -p no:cacheprovider 2>&1)"
  echo "$out" | grep -E "^(FAILED|SKIPPED)" | cut -c1-200
  last="$(echo "$out" | tail -1)"
  SUMMARY+=("$ref: $last")
  git -C "$REPO" worktree remove --force "$wt" >/dev/null 2>&1
done < <(git -C "$REPO" for-each-ref --format='%(refname:short)' "refs/remotes/$REMOTE/")

echo; echo "=================== SUMMARY ==================="
printf '%s\n' "${SUMMARY[@]}"
