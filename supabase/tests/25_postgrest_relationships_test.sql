-- Relaciones ambiguas para la API de Supabase (PostgREST).
--
-- El cliente une tablas en un mismo `select`, por ejemplo
-- `profiles?select=..., organization:organizations(name)`. PostgREST elige la relación
-- entre las dos tablas por sí solo cuando hay una sola. Si hay más de una, responde
-- 300 (PGRST201) y la consulta falla, salvo que el cliente nombre la clave foránea
-- (`organizations!profiles_organization_id_fkey(name)`).
--
-- PostgREST cuenta como relación:
-- - cada clave foránea entre las dos tablas, en cualquier sentido;
-- - cada tabla intermedia cuya clave primaria incluye claves foráneas a las dos tablas
--   (muchos a muchos). Aquí también se cuentan las claves únicas compuestas, para
--   detectar de más y no de menos.
--
-- El 16/10/2026, `former_members` (C-012) se convirtió en tabla intermedia entre
-- `profiles` y `organizations`, y la carga del perfil falló para todos al iniciar sesión.
-- Las pruebas SQL no pasan por PostgREST, así que no lo detectaron.
--
-- Esta prueba compara los pares de tablas con más de una relación contra la lista
-- revisada de abajo. Si aparece un par nuevo, antes de agregarlo a la lista hay que
-- revisar que toda unión del cliente entre esas dos tablas use `!clave_foranea`
-- (`git grep -n "<tabla>("` en `src/` y en `supabase/functions/`).

\set ON_ERROR_STOP 1
\set QUIET 1

create function pg_temp.ambiguous_relationships()
returns text[]
language sql
stable
as $$
  with tables as (
    select c.oid
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm')
  ),
  fks as (
    select f.oid, f.conname, f.conrelid, f.confrelid, f.conkey
    from pg_constraint f
    where f.contype = 'f'
      and f.conrelid in (select oid from tables)
      and f.confrelid in (select oid from tables)
  ),
  direct as (
    select least(conrelid::regclass::text, confrelid::regclass::text) as a,
           greatest(conrelid::regclass::text, confrelid::regclass::text) as b
    from fks
  ),
  junctions as (
    select distinct
           least(fa.confrelid::regclass::text, fb.confrelid::regclass::text) as a,
           greatest(fa.confrelid::regclass::text, fb.confrelid::regclass::text) as b,
           fa.conrelid,
           fa.oid as fa_oid,
           fb.oid as fb_oid
    from fks fa
    join fks fb on fb.conrelid = fa.conrelid and fa.oid < fb.oid
    join pg_constraint k on k.conrelid = fa.conrelid and k.contype in ('p', 'u')
    where fa.conkey <@ k.conkey
      and fb.conkey <@ k.conkey
      and fa.confrelid <> fa.conrelid
      and fb.confrelid <> fb.conrelid
  ),
  paths as (
    select a, b from direct
    union all
    select a, b from junctions
  )
  select coalesce(array_agg(a || ' <-> ' || b order by a, b), '{}')
  from (select a, b from paths group by a, b having count(*) > 1) ambiguous;
$$;

-- Lista revisada. Toda unión del cliente entre estos pares debe nombrar la clave
-- foránea con `!`.
select test.ok(
  pg_temp.ambiguous_relationships() = array[
    'areas <-> cases',                         -- área solicitante y área destino
    'case_events <-> profiles',                -- actor y asignado
    'case_report_versions <-> profiles',       -- creó y devolvió
    'case_resource_usages <-> profiles',       -- registró y técnico
    'cases <-> profiles',                      -- creador y responsable
    'former_members <-> profiles',             -- miembro y quien dio la baja
    'organization_access_requests <-> profiles', -- solicitante y quien decidió
    'organization_creation_requests <-> profiles', -- solicitante y quien revisó
    'organization_invitations <-> profiles',   -- invitó y aceptó
    'organizations <-> profiles'               -- empresa del perfil y former_members
  ],
  'los pares de tablas con más de una relación son los revisados'
);

-- Control: una tabla intermedia nueva entre dos tablas con una sola relación hace
-- fallar la lista. `categories` y `resources` no tienen ninguna relación hoy.
begin;
create table public.probe_category_resources (
  category_id uuid not null references public.categories (id),
  resource_id uuid not null references public.resources (id),
  primary key (category_id, resource_id)
);
select test.ok(
  'categories <-> resources' <> all (pg_temp.ambiguous_relationships()),
  'una sola tabla intermedia no crea ambigüedad'
);
create table public.probe_resource_categories (
  resource_id uuid not null references public.resources (id),
  category_id uuid not null references public.categories (id),
  note text,
  unique (resource_id, category_id)
);
select test.ok(
  'categories <-> resources' = any (pg_temp.ambiguous_relationships()),
  'una segunda tabla intermedia entre el mismo par se detecta'
);
create table public.probe_area_profiles (
  area_id uuid not null references public.areas (id),
  user_id uuid not null references public.profiles (id),
  primary key (area_id, user_id)
);
select test.ok(
  'areas <-> profiles' = any (pg_temp.ambiguous_relationships()),
  'una tabla intermedia entre tablas que ya tenían una clave foránea se detecta'
);
rollback;

\echo 'Todas las pruebas de relaciones para la API pasaron.'
