#!/usr/bin/env bash
# Verify RLS on every table with an org_id column, then run cross-org tests.
set -uo pipefail
export PGHOST="${PGHOST:-localhost}" PGPORT="${PGPORT:-5433}" PGDATABASE="${PGDATABASE:-cyberguard_x}"
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"

missing=$(psql -Atc "
  SELECT c.relname
       || CASE WHEN NOT c.relrowsecurity      THEN ' [rls disabled]' ELSE '' END
       || CASE WHEN NOT c.relforcerowsecurity THEN ' [not forced]'   ELSE '' END
       || CASE WHEN NOT EXISTS (SELECT 1 FROM pg_policy p WHERE p.polrelid = c.oid) THEN ' [no policy]' ELSE '' END
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
  JOIN pg_attribute a ON a.attrelid = c.oid AND a.attname = 'org_id' AND NOT a.attisdropped
  WHERE c.relkind IN ('r','p')
    AND c.relispartition = false
    AND (NOT c.relrowsecurity OR NOT c.relforcerowsecurity
         OR NOT EXISTS (SELECT 1 FROM pg_policy p WHERE p.polrelid = c.oid));")
rc=$?
[ $rc -ne 0 ] && { echo "rls-check: cannot query database"; exit 1; }

fail=0
if [ -n "$missing" ]; then echo "Tables missing RLS protection:"; echo "$missing"; fail=1
else echo "RLS: all org_id tables protected"; fi

PYTHON="$ROOT/.venv/bin/python"
if [ ! -x "$PYTHON" ]; then PYTHON="python3"; fi
if (cd "$ROOT" && env DATABASE_URL="postgresql+psycopg://krishnanegi@localhost:5433/cyberguard_x_restore_test" PYTHONPATH=. "$PYTHON" -m pytest -q -m cross_org backend/tests); then echo "cross-org tests: PASS"
else echo "cross-org tests: FAIL"; fail=1; fi

exit $fail
