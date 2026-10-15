-- Búsqueda y paginación de la lista de casos en el servidor (hallazgo D-4 del análisis del
-- 14/10/2026). Hoy el cliente trae los 100 casos más recientes y filtra en el teléfono, así
-- que los casos más antiguos no aparecen en la lista ni en la búsqueda.
--
-- `public.search_cases` aplica en PostgreSQL los mismos filtros que la pantalla:
-- - alcance (Mías, Mis trabajos, Mi área, Bandeja…);
-- - estados, prioridad y fecha de actualización;
-- - texto en número, título, tipo y ubicación.
-- Devuelve filas de `public.cases`, así que el cliente conserva su `select` con relaciones,
-- el orden y `range()` para paginar. `public.count_cases_by_status` devuelve los totales por
-- estado con esos mismos filtros, para los contadores de los segmentos.
--
-- Ambas son SECURITY INVOKER: la visibilidad sigue siendo la de la política de `cases`, y
-- los filtros solo reducen lo que esa política ya permite ver.
--
-- `search_cases` y `count_cases_by_status` son SQL de una sola consulta, sin
-- `set search_path`, para que PostgreSQL las incorpore a la consulta de PostgREST: así el `order` y el `range` del cliente usan los
-- índices y la consulta se detiene en la página pedida, en vez de producir antes todos los
-- casos filtrados. Todos los nombres van calificados con su esquema.

-- Valida los parámetros. Es IMMUTABLE: con argumentos constantes se evalúa una sola vez,
-- al planificar la consulta.
create or replace function private.check_case_search(scope text, search_text text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
begin
  if scope is not null and scope not in (
    'todas', 'mias', 'mis_trabajos', 'mi_area', 'bandeja', 'por_aceptar', 'sin_asignar', 'en_curso'
  ) then
    raise exception 'Alcance no válido';
  end if;
  if char_length(coalesce(search_text, '')) > 100 then
    raise exception 'La búsqueda no puede exceder 100 caracteres';
  end if;
  return true;
end;
$$;

revoke all on function private.check_case_search(text, text) from public, anon;
grant execute on function private.check_case_search(text, text) to authenticated;

create or replace function public.search_cases(
  scope text default 'todas',
  statuses public.case_status[] default null,
  priority_filter public.case_priority default null,
  updated_since timestamptz default null,
  search_text text default null
)
returns setof public.cases
language sql
stable
security invoker
as $$
  select c.*
  from public.cases c
  where private.check_case_search(scope, search_text)
    and (statuses is null or c.status = any (statuses))
    and (priority_filter is null or c.priority = priority_filter)
    and (updated_since is null or c.updated_at >= updated_since)
    and case coalesce(scope, 'todas')
      when 'todas' then true
      when 'mias' then c.created_by = (select auth.uid())
      when 'mis_trabajos' then c.assigned_to = (select auth.uid())
      when 'mi_area' then (select private.current_area_id()) in (
        c.requesting_area_id,
        c.target_area_id
      )
      when 'bandeja' then
        (
          (select private.current_app_role()) = 'administrador'
          or c.target_area_id = (select private.current_area_id())
        )
        and (c.status = 'solicitado' or (c.status = 'aceptado' and c.assigned_to is null))
      when 'por_aceptar' then c.status = 'solicitado'
      when 'sin_asignar' then c.status = 'aceptado' and c.assigned_to is null
      when 'en_curso' then c.status in ('asignado', 'en_ejecucion', 'en_espera')
      else false
    end
    and (
      nullif(pg_catalog.btrim(search_text), '') is null
      or pg_catalog.strpos(
        pg_catalog.lower(pg_catalog.concat_ws(
          ' ',
          c.case_number,
          c.title,
          c.location,
          -- Con RLS: quien no administra no ve los tipos desactivados, así que no busca
          -- por su nombre (tampoco lo ve en la lista).
          (select k.name from public.categories k where k.id = c.category_id)
        )),
        pg_catalog.lower(pg_catalog.btrim(search_text))
      ) > 0
    );
$$;

create or replace function public.count_cases_by_status(
  scope text default 'todas',
  priority_filter public.case_priority default null,
  updated_since timestamptz default null,
  search_text text default null
)
returns table (status public.case_status, total bigint)
language sql
stable
security invoker
as $$
  select c.status, pg_catalog.count(*)
  from public.search_cases(scope, null, priority_filter, updated_since, search_text) c
  group by c.status;
$$;

revoke all on function public.search_cases(
  text, public.case_status[], public.case_priority, timestamptz, text
) from public, anon;
grant execute on function public.search_cases(
  text, public.case_status[], public.case_priority, timestamptz, text
) to authenticated;

revoke all on function public.count_cases_by_status(
  text, public.case_priority, timestamptz, text
) from public, anon;
grant execute on function public.count_cases_by_status(
  text, public.case_priority, timestamptz, text
) to authenticated;

-- ---------------------------------------------------------------------------
-- Visibilidad por participación sin costo por fila
-- ---------------------------------------------------------------------------

-- La política de `cases` llamaba a `private.participated_in_case(id)` por cada caso que
-- las demás condiciones no dejaban ver. Con 50 000 casos, un técnico tardaba cerca de un
-- segundo en contar los suyos. Esta función devuelve una sola vez los casos en los que la
-- persona participó, y la política los compara con `id in (…)`. El resultado es el mismo
-- (BUSINESS_RULES 5.4).
--
-- Es SECURITY DEFINER para leer historial y firmas sin pasar por la política de cases que la
-- llama. Por eso solo devuelve casos de la empresa actual: quien se fue de una empresa no
-- obtiene ni los identificadores de los casos en los que participó allí.
create or replace function private.participated_case_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from public.cases
  where organization_id = (select private.current_organization_id())
    and assigned_to = (select auth.uid())
  union
  select case_id from public.case_events
  where organization_id = (select private.current_organization_id())
    and assignee_id = (select auth.uid())
  union
  select case_id from public.case_signatures
  where organization_id = (select private.current_organization_id())
    and signer_id = (select auth.uid());
$$;

revoke all on function private.participated_case_ids() from public, anon;
grant execute on function private.participated_case_ids() to authenticated;

-- La política ya no usa `participated_in_case(uuid)`, que responde por cualquier caso sin
-- mirar la empresa. Se retira el permiso (sin borrarla, para mantener la migración aditiva).
revoke execute on function private.participated_in_case(uuid) from authenticated;

drop policy "Members can read visible cases" on public.cases;
create policy "Members can read visible cases"
on public.cases
for select
to authenticated
using (
  organization_id = (select private.current_organization_id())
  and (
    (select private.current_app_role()) in ('administrador', 'auditor')
    or created_by = (select auth.uid())
    or requesting_area_id = (select private.current_area_id())
    or (
      target_area_id = (select private.current_area_id())
      and (select private.current_app_role()) in ('tecnico', 'jefe_area')
    )
    or id in (select private.participated_case_ids())
  )
);
