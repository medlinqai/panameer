#!/usr/bin/env bash
#
# ── ⚠⚠⚠ THE FULL GATE SWEEP, AND IT COUNTS WHAT IT RAN (`P2-A3-E601`) ───────
#
# `npm run sweep` — runs every `check:*` script in `package.json`, once, and
# prints a tally. Used before a merge, per the speed rules.
#
# ⚠⚠ WHY IT EXISTS AS A FILE INSTEAD OF A PASTED LOOP: the `E600` pre-merge
# sweep was an ad-hoc `while read` over a generated list, and it SILENTLY SKIPPED
# THE LAST ENTRY — the list was written with `join("\n")` and had no trailing
# newline, so `read` returned false on the final line and dropped it. It reported
# "84 gates, all green" while `check:match-rank` had never run.
#
# ⚠⚠⚠ THAT IS `E586`'S CLASS ONE LEVEL UP: A HARNESS THAT REPORTS SUCCESS OVER AN
# INCOMPLETE SET. The gate with no inputs passes; the sweep with a missing gate
# passes. In both cases the number looks like evidence and is not.
#
# ⚠ SO THE LOAD-BEARING LINE IN THIS FILE IS NOT THE LOOP — IT IS THE RECONCILE
# AT THE BOTTOM: the count of gates RUN must equal the length of the gate LIST,
# and the sweep exits non-zero if they differ. ⚠⚠ A sweep that cannot say it ran
# everything has not run anything worth reporting.
#
# ⚠ It does NOT fail on a red gate — classifying a failure as pre-existing or new
# needs a trunk comparison, which is the reader's job. It fails only when the
# sweep itself is untrustworthy: a miscount, or an empty list.

set -uo pipefail
cd "$(dirname "$0")/.."

OUT="${SWEEP_OUT:-/tmp/gate-sweep.txt}"
: > "$OUT"

# ⚠ The list comes from `package.json` itself, so a gate added tomorrow is swept
#   tomorrow. ⚠⚠ NEVER FROM A HAND-MAINTAINED LIST — that is the same failure in
#   a slower form (`E587`: gate by shape, not by a named list).
# ⚠⚠ NOT `mapfile` AND NOT `while read`: macOS ships bash 3.2, where `mapfile`
#    does not exist, and `while read` is the construct that caused this bug in
#    the first place (it drops a final line with no trailing newline).
#    ⚠ Splitting on newline with globbing OFF is safe here because a gate name is
#    an npm script key — `check:foo`, no spaces, no glob characters.
GATE_LIST=$(node -e '
  const s = require("./package.json").scripts || {};
  for (const k of Object.keys(s)) if (k.startsWith("check:")) console.log(k);
')
OLDIFS=$IFS
IFS=$'\n'
set -f
GATES=( $GATE_LIST )
set +f
IFS=$OLDIFS
EXPECTED=${#GATES[@]}

# ⚠⚠ `E586`: AN EMPTY LIST MUST FAIL. A sweep over zero gates would otherwise
#    print a perfect score.
if [ "$EXPECTED" -eq 0 ]; then
  echo "sweep — FAILED: no check:* scripts found in package.json" >&2
  exit 1
fi

echo "sweep — running $EXPECTED gates"
RAN=0
for g in "${GATES[@]}"; do
  START=$(date +%s)
  OUTPUT=$(npm run "$g" 2>&1)
  CODE=$?
  SUMMARY=$(printf '%s' "$OUTPUT" | grep -ioE '[0-9]+ (passed|failed|skipped)[^|]*' | tail -1 | tr -d '\n')
  printf '%s %s %ss %s\n' "$g" "$CODE" "$(( $(date +%s) - START ))" "${SUMMARY:-no-summary-line}" >> "$OUT"
  RAN=$(( RAN + 1 ))
done

# ── ⚠⚠⚠ THE RECONCILE. THIS IS THE POINT OF THE FILE ───────────────────────
RECORDED=$(wc -l < "$OUT" | tr -d ' ')
echo
echo "sweep — expected $EXPECTED · ran $RAN · recorded $RECORDED"
if [ "$RAN" -ne "$EXPECTED" ] || [ "$RECORDED" -ne "$EXPECTED" ]; then
  echo "sweep — ⚠⚠⚠ FAILED: the sweep did not run every gate. A sweep that skips an entry and reports green is E586 one level up." >&2
  exit 1
fi

PASSED=$(awk '$2==0' "$OUT" | wc -l | tr -d ' ')
echo "sweep — $PASSED/$EXPECTED exited 0"
echo
echo "sweep — NON-ZERO (classify each against trunk before reading it as a regression):"
awk '$2!=0' "$OUT" || true
echo
# ⚠ `check:resume` is `E586` ITSELF — 0 passed / 0 failed / 16 skipped, exit 0,
#   because its fixtures do not exist on this machine. ⚠⚠ IT EXITS 0 AND MUST
#   NEVER BE READ AS GREEN, so the sweep surfaces it every run rather than
#   letting it sit in the passing pile.
echo "sweep — ⚠ E586 watch (exits 0, is NOT green):"
grep -E '^check:resume ' "$OUT" || echo "  check:resume did not report"
