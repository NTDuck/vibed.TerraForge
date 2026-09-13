#!/usr/bin/env bash
# STE (ASD-STE100) compliance check for docs, UI strings and code comments.
# Usage: bash tools/ste-lint.sh [--baseline N]
set -u
cd "$(dirname "$0")/.."
LINT="$HOME/.agents/skills/asd-ste100/scripts/ste-lint.py"
fail=0

echo "── docs ──"
python3 "$LINT" README.md docs/*.md .decisions/*.md "$@" || fail=1

echo "── UI strings (per source file; synonym scope = file) ──"
python3 tools/extract_ui_strings.py >/dev/null
for f in /tmp/ui_strings/*.txt; do
  out=$(python3 "$LINT" "$f" 2>&1) || fail=1
  if echo "$out" | grep -qE "violation"; then
    echo "$out" | grep -E "violation" | sed "s|/tmp/ui_strings/||; s|^[a-z_]*\.txt:|$(basename "$f" .txt):|"
  fi
done

echo "── code comments (per source file) ──"
python3 tools/extract_comments.py >/dev/null
for f in /tmp/code_comments/*.txt; do
  out=$(python3 "$LINT" "$f" 2>&1) || fail=1
  if echo "$out" | grep -qE "violation"; then
    echo "$out" | grep -E "violation" | sed "s|/tmp/code_comments/||; s|^[a-z_]*\.txt:|$(basename "$f" .txt):|"
  fi
done

if [ "$fail" -eq 0 ]; then
  echo "STE: PASS"
else
  echo "STE: FAIL"
fi
exit $fail
