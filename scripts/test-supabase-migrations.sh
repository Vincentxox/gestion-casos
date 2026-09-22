#!/usr/bin/env bash
# Aplica todas las migraciones en una base PostgreSQL local vacía y ejecuta las pruebas
# SQL del modelo de negocio. Nunca se conecta al proyecto remoto.
#
# Uso: DATABASE_URL=postgres://postgres@localhost:5432/postgres scripts/test-supabase-migrations.sh
# La base indicada se usa solo para crear y borrar una base temporal.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ADMIN_URL="${DATABASE_URL:?Define DATABASE_URL con un PostgreSQL local}"
TEST_DB="nexo_migrations_test_$$"

psql "$ADMIN_URL" -qAt -c "create database $TEST_DB" >/dev/null
trap 'psql "$ADMIN_URL" -qAt -c "drop database if exists $TEST_DB with (force)" >/dev/null' EXIT

TEST_URL="$(python3 -c 'import sys,urllib.parse as u; p=u.urlparse(sys.argv[1]); print(p._replace(path="/"+sys.argv[2]).geturl())' "$ADMIN_URL" "$TEST_DB")"

run() {
  psql "$TEST_URL" -q -v ON_ERROR_STOP=1 --single-transaction -f "$1" >/dev/null
}

run "$ROOT/supabase/tests/00_supabase_stub.sql"

legacy_seeded=0
for migration in "$ROOT"/supabase/migrations/*.sql; do
  name="$(basename "$migration")"
  if [[ $legacy_seeded -eq 0 && "$name" > "20260922" ]]; then
    run "$ROOT/supabase/tests/01_legacy_seed.sql"
    legacy_seeded=1
  fi
  echo "Aplicando $name"
  run "$migration"
done

psql "$TEST_URL" -v ON_ERROR_STOP=1 -f "$ROOT/supabase/tests/10_business_model_test.sql" 2>&1 \
  | grep -E '(NOTICE:  ok|ERROR|FALLÓ|Todas)' \
  | sed -E 's/^psql:[^ ]+ NOTICE:  //'
