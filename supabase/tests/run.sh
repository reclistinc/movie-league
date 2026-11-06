#!/usr/bin/env bash
# Runs every SQL test file against a fresh local Postgres database.
# Usage: PGHOST=/tmp PGPORT=5499 PGUSER=postgres ./run.sh
set -euo pipefail
cd "$(dirname "$0")"
for t in game_loop commissioner cap invite_reset demo champion; do
  DB="movie_league_test_$$_$t"
  createdb "$DB"
  psql -q -v ON_ERROR_STOP=1 -d "$DB" -f auth_stub.sql
  for f in ../migrations/*.sql; do psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$f" 2>&1 | grep -E "ERROR" || true; done
  psql -q -v ON_ERROR_STOP=1 -d "$DB" -f ../demo/demo_league.sql
  psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$t.sql" 2>&1 | grep -E "FAILED|ERROR|PASSED"
  dropdb "$DB"
done
