---
name: safe-migration
description: Use for ANY CYBERGUARD-X database schema change or Alembic migration. Backs up the database, tests the migration on the restore-test DB, diffs row counts, checks downgrade, then applies it to the dev DB only after user approval.
---

# safe-migration

The dev DB `cyberguard_x` holds real historical data. Follow every step and paste the output of each one. Stop on any failure.

Variables (adjust in Phase 0 if they differ):
```bash
export PGHOST=localhost PGPORT=5433
DB=cyberguard_x
TEST_DB=cyberguard_x_restore_test
BK_DIR=~/Backups/CYBERGUARD-X
TS=$(date +%Y%m%d_%H%M%S)
```

## 1. Inspect
```bash
cd backend && alembic current && alembic history | head -20 && alembic heads
```
- There must be exactly **one head**. If there are several, stop and ask.
- Read the new revision file. List every `drop_*`, `alter_column` (type or nullability) and data `UPDATE`.

## 2. Make sure the migration is non-destructive
- Prefer **expand → backfill → switch → contract** across separate revisions.
- Any `drop_table` / `drop_column` / type narrowing needs **explicit user approval in chat** first.
- New tenant table → it must include `org_id NOT NULL`, an index, and an RLS policy (see `docs/design/02-data-model.md`).
- `downgrade()` is implemented, not `pass`.

## 3. Back up and prove the backup restores
```bash
pg_dump -Fc -d $DB -f $BK_DIR/${DB}_$TS.dump
dropdb --if-exists $TEST_DB && createdb $TEST_DB
pg_restore -d $TEST_DB --no-owner $BK_DIR/${DB}_$TS.dump
```

## 4. Snapshot row counts (before)
```bash
psql -d $TEST_DB -Atc "SELECT relname, n_live_tup FROM pg_stat_user_tables ORDER BY 1" > /tmp/cgx_before.txt
psql -d $TEST_DB -Atc "ANALYZE"
psql -d $TEST_DB -Atc "SELECT 'assets', count(*) FROM assets UNION ALL SELECT 'scan_runs', count(*) FROM scan_runs UNION ALL SELECT 'port_observations', count(*) FROM port_observations" > /tmp/cgx_before_exact.txt
psql -d $TEST_DB -Atc "SELECT id FROM assets ORDER BY id LIMIT 5" > /tmp/cgx_uuids.txt
```
Adjust the table names to the real legacy tables.

## 5. Upgrade, verify, downgrade, upgrade (on TEST_DB only)
```bash
cd backend
DATABASE_URL=postgresql://localhost:5433/$TEST_DB alembic upgrade head
psql -d $TEST_DB -Atc "<same exact-count query>" > /tmp/cgx_after_exact.txt
diff /tmp/cgx_before_exact.txt /tmp/cgx_after_exact.txt && echo "COUNTS PRESERVED"
for id in $(cat /tmp/cgx_uuids.txt); do psql -d $TEST_DB -Atc "SELECT count(*) FROM assets WHERE id='$id'"; done   # all must print 1
DATABASE_URL=postgresql://localhost:5433/$TEST_DB alembic downgrade -1
DATABASE_URL=postgresql://localhost:5433/$TEST_DB alembic upgrade head
```
Use whatever env variable the project's `alembic/env.py` actually reads.

## 6. Ask, then apply to the dev DB
Show the user: backup path, before/after counts, UUID check, downgrade result. **Wait for an explicit "yes".** Then:
```bash
cd backend && alembic upgrade head && alembic current
```

## 7. Record
Add a "Migration evidence" entry to `PROGRESS.md`: revision id, backup path, counts before and after, date.

## Never
Drop the DB · delete or squash migrations · `alembic stamp` an unknown revision · edit an already-applied revision · change existing UUIDs.
