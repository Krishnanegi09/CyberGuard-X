#!/usr/bin/env bash
# check-phase.sh N — milestone exit gate for phase N.
#   1. verify-all must pass (Phase 0 tolerates failures that are recorded in AUDIT.md)
#   2. acceptance tests marked `phaseN` (and all earlier phases) must pass
#   3. phase-specific file/content checks
# Acceptance tests live in backend/tests/acceptance/ and use `@pytest.mark.phaseN`.
# Register markers phase0..phase9 in pytest config (pyproject.toml / pytest.ini).
set -uo pipefail

N="${1:?usage: check-phase.sh <phase 0-9>}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_DIR="${BACKEND_DIR:-$ROOT/backend}"
PYTHON="${PYTHON:-$ROOT/.venv/bin/python}"
if [ ! -x "$PYTHON" ]; then
  PYTHON="$(command -v python3 || command -v python)"
fi
if [ -d "$ROOT/.venv/bin" ]; then
  export PATH="$ROOT/.venv/bin:$PATH"
fi
FAILS=0
ok()   { echo "  ✓ $*"; }
bad()  { echo "  ✗ $*"; FAILS=$((FAILS+1)); }
need_file()    { [ -f "$ROOT/$1" ] && ok "$1 exists" || bad "missing $1"; }
need_section() { grep -qi "^#.*$2" "$ROOT/$1" 2>/dev/null && ok "$1 has '$2'" || bad "$1 lacks section '$2'"; }
need_glob()    { compgen -G "$ROOT/$1" >/dev/null && ok "$1 present" || bad "nothing matches $1"; }

echo "### Phase $N gate"

# 1. verify-all
echo "-- verify-all"
if "$ROOT/scripts/verify-all.sh" >/tmp/cgx-verify.log 2>&1; then ok "verify-all passed"
else
  if [ "$N" = "0" ] && grep -qi "Baseline results" "$ROOT/docs/AUDIT.md" 2>/dev/null; then
    ok "verify-all failed but baseline is recorded in AUDIT.md (allowed in phase 0)"
  else bad "verify-all failed (see /tmp/cgx-verify.log)"; fi
fi

# 2. acceptance tests for phases 1..N (cumulative, so later work can't break earlier gates)
if [ "$N" -ge 1 ]; then
  MARKS="$("$PYTHON" -c "import sys; print(' or '.join(f'phase{i}' for i in range(1, int(sys.argv[1]) + 1)))" "$N")"
  echo "-- acceptance: $MARKS"
  if (cd "$BACKEND_DIR" && "$PYTHON" -m pytest -q -m "$MARKS" tests/acceptance); then ok "acceptance tests passed"
  else bad "acceptance tests failed"; fi
fi

# 2b. Definition of Done evidence: every [MVP] milestone of this phase needs a DONE evidence block in PROGRESS.md
if [ "$N" -ge 1 ] && [ -f "$ROOT/docs/phases/phase-$N.md" ]; then
  echo "-- DoD evidence blocks (docs/DEFINITION_OF_DONE.md §7)"
  for m in $(grep -oE '\*\*'"$N"'\.[0-9]+ \[MVP\]' "$ROOT/docs/phases/phase-$N.md" | grep -oE "$N\.[0-9]+"); do
    grep -qE "^### DONE: (milestone )?$m([^0-9]|$)" "$ROOT/PROGRESS.md" && ok "evidence block for $m" || bad "no DONE evidence block for milestone $m in PROGRESS.md"
  done
fi

# 3. phase-specific checks
echo "-- phase-specific"
case "$N" in
  0)
    need_file docs/AUDIT.md
    for s in "Feature matrix" "Gap analysis" "Risk register" "Baseline results"; do need_section docs/AUDIT.md "$s"; done
    for f in CLAUDE.md PROGRESS.md docs/DEFINITION_OF_DONE.md docs/DECISIONS.md docs/CONTRACTS.md .pre-commit-config.yaml .github/workflows/ci.yml; do need_file "$f"; done
    need_glob ".claude/skills/*/SKILL.md"
    grep -qi "roadmap approved" "$ROOT/PROGRESS.md" && ok "roadmap approval noted" || bad "PROGRESS.md: note 'roadmap approved' after the user approves"
    ;;
  1)
    need_file docs/LAB.md; need_file lab/docker-compose.yml
    [ -x "$ROOT/.claude/skills/rls-check/check.sh" ] && { "$ROOT/.claude/skills/rls-check/check.sh" && ok "rls-check" || bad "rls-check failed"; } || bad "rls-check script missing"
    [ -x "$ROOT/.claude/skills/no-fake-data-audit/audit.sh" ] && { "$ROOT/.claude/skills/no-fake-data-audit/audit.sh" && ok "no fake data" || bad "fake-data hits"; } || bad "audit script missing"
    grep -qi "migration evidence" "$ROOT/PROGRESS.md" && ok "migration evidence recorded" || bad "PROGRESS.md: add 'Migration evidence' (backup path, row counts)"
    ;;
  2)
    need_file docs/DEMO_RUNBOOK.md; need_glob "lab/captures/*.pcap"
    ;;
  3|4|5|7)
    need_file docs/PERF.md
    ;;
  6)
    need_glob "ml/datasets/*/DATASET_CARD.md"; need_glob "ml/reports/*.md"
    for s in "public" "lab" "cross-domain" "limitations"; do
      grep -qil "$s" "$ROOT"/ml/reports/*.md 2>/dev/null && ok "ML report mentions '$s'" || bad "ML report lacks '$s'"; done
    ;;
  8)
    need_glob "ml/datasets/*/MANIFEST*"
    ;;
  9)
    for f in docs/PERF.md docs/LAB.md docs/DEMO_RUNBOOK.md docs/design/06-threat-model.md; do need_file "$f"; done
    have_audit=0; command -v pip-audit >/dev/null && have_audit=1
    [ $have_audit = 1 ] && { (cd "$BACKEND_DIR" && pip-audit --progress-spinner off) && ok "pip-audit clean" || bad "pip-audit findings"; } || bad "pip-audit not installed"
    ;;
  *) echo "unknown phase $N"; exit 2 ;;
esac

echo
if [ $FAILS -eq 0 ]; then echo "PHASE $N GATE: PASS"; exit 0
else echo "PHASE $N GATE: FAIL ($FAILS issue(s))"; exit 1; fi
