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

create or replace function private.case_matches_filters(
  target public.cases,
  scope text,
  priority_filter public.case_priority,
  updated_since timestamptz,
  search_text text
)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select
    (
      case coalesce(scope, 'todas')
        when 'todas' then true
        when 'mias' then target.created_by = (select auth.uid())
        when 'mis_trabajos' then target.assigned_to = (select auth.uid())
        when 'mi_area' then (select private.current_area_id()) in (
          target.requesting_area_id,
          target.target_area_id
        )
        when 'bandeja' then
          (
            (select private.current_app_role()) = 'administrador'
            or target.target_area_id = (select private.current_area_id())
          )
          and (
            target.status = 'solicitado'
            or (target.status = 'aceptado' and target.assigned_to is null)
          )
        when 'por_aceptar' then target.status = 'solicitado'
        when 'sin_asignar' then target.status = 'aceptado' and target.assigned_to is null
        when 'en_curso' then target.status in ('asignado', 'en_ejecucion', 'en_espera')
        else false
      end
    )
    and (priority_filter is null or target.priority = priority_filter)
    and (updated_since is null or target.updated_at >= updated_since)
    and (
      nullif(btrim(search_text), '') is null
      or strpos(
        lower(concat_ws(
          ' ',
          target.case_number,
          target.title,
          target.location,
          (select name from public.categories where id = target.category_id)
        )),
        lower(btrim(search_text))
      ) > 0
    );
$$;

revoke all on function private.case_matches_filters(
  public.cases, text, public.case_priority, timestamptz, text
) from public, anon;
grant execute on function private.case_matches_filters(
  public.cases, text, public.case_priority, timestamptz, text
) to authenticated;

create or replace function public.search_cases(
  scope text default 'todas',
  statuses public.case_status[] default null,
  priority_filter public.case_priority default null,
  updated_since timestamptz default null,
  search_text text default null
)
returns setof public.cases
language plpgsql
stable
security invoker
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

  return query
  select c.*
  from public.cases c
  where (statuses is null or c.status = any (statuses))
    and private.case_matches_filters(c, scope, priority_filter, updated_since, search_text);
end;
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
set search_path = ''
as $$
  select c.status, count(*)
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
