#!/bin/sh
# Regenerates src/lib/supabase/database.types.ts from the migrations, using a throwaway Postgres (Docker).
# Once the Supabase project is linked, prefer: npx supabase gen types typescript --linked --schema public
set -e
cd "$(dirname "$0")/../.."
NAME=bloom-types
docker rm -f $NAME >/dev/null 2>&1 || true
docker run -d --name $NAME -e POSTGRES_PASSWORD=postgres -p 54329:5432 postgres:17-alpine >/dev/null
trap 'docker rm -f $NAME >/dev/null 2>&1' EXIT
until docker exec $NAME pg_isready -U postgres -q; do sleep 1; done
sleep 1
run() { docker exec -i $NAME psql -U postgres -v ON_ERROR_STOP=1 -q "$@"; }
run < supabase/tests/stub_supabase.sql
for f in supabase/migrations/*.sql; do run < "$f" 2>/dev/null; done
npx -y supabase@latest gen types typescript --db-url "postgresql://postgres:postgres@localhost:54329/postgres?sslmode=disable" --schema bloom > src/lib/supabase/database.types.ts
npx -y oxfmt src/lib/supabase/database.types.ts >/dev/null 2>&1 || true
echo "types regenerated"
