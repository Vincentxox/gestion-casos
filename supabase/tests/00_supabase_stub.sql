-- Entorno mínimo que imita a Supabase para probar las migraciones en un PostgreSQL local.
-- No se aplica nunca al proyecto remoto.

-- Los roles son globales del servidor: se crean solo si no existen.
do $$
declare
  role_name text;
begin
  foreach role_name in array array['anon', 'authenticated', 'service_role', 'supabase_auth_admin'] loop
    if not exists (select 1 from pg_roles where rolname = role_name) then
      execute format('create role %I nologin', role_name);
    end if;
  end loop;
end $$;

create schema auth;

create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  email_confirmed_at timestamptz,
  raw_user_meta_data jsonb not null default '{}'::jsonb
);

create function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;

-- Supabase concede por defecto todos los privilegios sobre objetos nuevos de public a
-- anon y authenticated; las migraciones deben revocarlos explícitamente.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
