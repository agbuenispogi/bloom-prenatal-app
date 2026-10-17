#!/bin/sh
# Runs migrations + RLS tests against a throwaway Postgres 17 container. Requires Docker.
set -e
cd "$(dirname "$0")/.."
NAME=bloom-rls-test
docker rm -f $NAME >/dev/null 2>&1 || true
docker run -d --name $NAME -e POSTGRES_PASSWORD=postgres postgres:17-alpine >/dev/null
trap 'docker rm -f $NAME >/dev/null 2>&1' EXIT
until docker exec $NAME pg_isready -U postgres -q; do sleep 1; done
sleep 1
run() { docker exec -i $NAME psql -U postgres -v ON_ERROR_STOP=1 -q -t "$@"; }
run < tests/stub_supabase.sql
for f in migrations/*.sql; do echo "migrate: $f"; run < "$f"; done
run < tests/rls_test.sql
