#!/usr/bin/env bash
# STE (ASD-STE100) compliance check for docs and user-facing UI strings.
# Usage: bash tools/ste-lint.sh [--baseline N]
set -u
cd "$(dirname "$0")/.."
LINT="$HOME/.agents/skills/asd-ste100/scripts/ste-lint.py"
fail=0

echo "── docs ──"
python3 "$LINT" README.md docs/*.md .decisions/*.md "$@" || fail=1

echo "── UI strings ──"
python3 tools/extract_ui_strings.py >/dev/null
python3 "$LINT" /tmp/ui_strings.txt || fail=1

exit $fail
