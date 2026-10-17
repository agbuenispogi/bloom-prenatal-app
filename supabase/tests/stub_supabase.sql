-- Minimal stand-in for the parts of Supabase the migrations rely on, so RLS can be tested on plain Postgres.
-- Mirrors Supabase: roles anon/authenticated/service_role/supabase_auth_admin, auth.users, auth.uid() from JWT claims.
create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;
create role supabase_auth_admin nologin noinherit;

create schema auth;
create table auth.users (id uuid primary key, email text);

create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')::uuid
$$;

grant usage on schema auth, public to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
-- Supabase grants table privileges broadly and relies on RLS; do the same.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
