#!/bin/sh
# Kiro hook (agent spec-build, postToolUse, matcher fs_write): run the fixed test command
# after a file write. Kiro passes the hook event as JSON on stdin; nothing in it is executed.
# The latest result goes to .kiro/test-status.txt for the agent to read, and one line per
# run is appended to the hook log.
root=$(cd "$(dirname "$0")/../.." && pwd) || exit 0
cd "$root" || exit 0
event=$(cat | tr -d '\n' | cut -c1-20000)
path=$(printf '%s' "$event" | sed -n 's/.*"path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | cut -c1-200)
log=${AFTERTEXT_HOOK_LOG:-.kiro/hook-runs.log}
stamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
npm test > .kiro/test-output.txt 2>&1
code=$?
summary=$(grep -E '^# (tests|pass|fail) ' .kiro/test-output.txt | tr '\n' ' ')
if [ "$code" -eq 0 ]; then verdict=PASS; else verdict=FAIL; fi
{
  echo "$verdict: npm test exit $code at $stamp. $summary"
  echo "Written by the Kiro postToolUse hook after a write to: ${path:-unknown}"
  echo "--- npm test output (first 16000 bytes) ---"
  head -c 16000 .kiro/test-output.txt
} > .kiro/test-status.txt
printf '%s\tpostToolUse fs_write\t%s\texit=%s\t%s\t%s\n' "$stamp" "$verdict" "$code" "$summary" "${path:-unknown}" >> "$log"
if [ "$code" -ne 0 ]; then
  echo "npm test failed after this write. $summary Read .kiro/test-status.txt and fix the cause." >&2
  exit 1
fi
echo "npm test passed after this write. $summary"
