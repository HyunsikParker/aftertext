#!/bin/sh
# Kiro hook (agent spec-build, postToolUse, matcher fs_write): run the fixed test command
# after a file write. Kiro passes the hook event as JSON on stdin; nothing in it is executed.
# Live reports go to artifacts/kiro-hook/; the historical log in .kiro/specs is not updated.
root=$(cd "$(dirname "$0")/../.." && pwd) || exit 0
cd "$root" || exit 0
output_dir=artifacts/kiro-hook
mkdir -p "$output_dir" || exit 1
output=$output_dir/test-output.txt
status=$output_dir/test-status.txt
log=${AFTERTEXT_HOOK_LOG:-"$output_dir/hook-runs.log"}

event=$(cat | tr -d '\n' | cut -c1-20000)
path=$(printf '%s' "$event" | sed -n 's/.*"path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | cut -c1-200)
stamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
npm test > "$output" 2>&1
code=$?
summary=$(grep -E '^# (tests|pass|fail) ' "$output" | tr '\n' ' ')
if [ "$code" -eq 0 ]; then verdict=PASS; else verdict=FAIL; fi
{
  echo "$verdict: npm test exit $code at $stamp. $summary"
  echo "Written by the Kiro postToolUse hook after a write to: ${path:-unknown}"
  echo "--- npm test output (first 16000 bytes) ---"
  head -c 16000 "$output"
} > "$status" || exit 1
printf '%s\tpostToolUse fs_write\t%s\texit=%s\t%s\t%s\n' "$stamp" "$verdict" "$code" "$summary" "${path:-unknown}" >> "$log" || exit 1
if [ "$code" -ne 0 ]; then
  echo "npm test failed after this write. $summary Read $status and fix the cause." >&2
  exit 1
fi
echo "npm test passed after this write. $summary"
