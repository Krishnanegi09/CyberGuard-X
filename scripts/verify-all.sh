#!/usr/bin/env bash
# verify-all.sh — lint, typecheck, test and build both stacks; prints a summary.
# Adjust BACKEND_DIR / FRONTEND_DIR / commands in Phase 0 to match the real repo.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_DIR="${BACKEND_DIR:-$ROOT/backend}"
FRONTEND_DIR="${FRONTEND_DIR:-$ROOT/frontend}"

declare -a NAMES=() RESULTS=()
run() {  # run <name> <dir> <command...>
  local name="$1" dir="$2"; shift 2
  echo -e "\n=== $name ==="
  if (cd "$dir" && "$@"); then RESULTS+=("PASS"); else RESULTS+=("FAIL"); fi
  NAMES+=("$name")
}
have() { command -v "$1" >/dev/null 2>&1; }

if [ -d "$BACKEND_DIR" ]; then
  PYTHON="$BACKEND_DIR/../.venv/bin/python"
  if [ ! -x "$PYTHON" ]; then
    PYTHON="python3"
  fi
  have ruff  && run "backend: ruff"  "$BACKEND_DIR" ruff check .
  have mypy  && [ -f "$BACKEND_DIR/mypy.ini" -o -f "$BACKEND_DIR/pyproject.toml" ] \
             && run "backend: mypy"  "$BACKEND_DIR" mypy app
  run "backend: pytest" "$BACKEND_DIR/.." env DATABASE_URL="postgresql+psycopg://krishnanegi@localhost:5433/cyberguard_x_restore_test" PYTHONPATH=. "$PYTHON" -m pytest -q
else
  echo "WARN: backend dir not found at $BACKEND_DIR"
fi

if [ -d "$FRONTEND_DIR" ]; then
  run "frontend: tsc"    "$FRONTEND_DIR" npx --no-install tsc --noEmit
  run "frontend: eslint" "$FRONTEND_DIR" npx --no-install eslint .
  run "frontend: build"  "$FRONTEND_DIR" npx --no-install vite build
else
  echo "WARN: frontend dir not found at $FRONTEND_DIR"
fi

echo -e "\n=== SUMMARY ==="
fail=0
for i in "${!NAMES[@]}"; do
  printf '%-22s %s\n' "${NAMES[$i]}" "${RESULTS[$i]}"
  [ "${RESULTS[$i]}" = "FAIL" ] && fail=1
done
exit $fail
