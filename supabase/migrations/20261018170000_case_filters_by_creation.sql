-- Filtros nuevos de la lista de Solicitudes (contrato C-019, propuesta aprobada por el
-- responsable el 18/10/2026).
--
-- El filtro «Últimos N días» usaba `updated_at`, pero la tarjeta muestra la fecha de
-- creación, y `updated_at` cambia por motivos que la persona no ve (una migración de datos,
-- por ejemplo). La pantalla filtra ahora por fecha de creación, por varias prioridades y
-- por solicitudes vencidas (BUSINESS_RULES 9.2), y los contadores respetan todos los
-- filtros, también el de estados.
--
-- `search_cases` y `count_cases_by_status` reciben parámetros nuevos al final, todos con
-- valor por defecto. PostgREST llama por nombre, así que las llamadas actuales siguen
-- funcionando igual. Se reemplazan las firmas anteriores, en vez de agregar sobrecargas: dos
-- versiones con todos los parámetros opcionales harían ambigua la llamada sin argumentos.
--
-- Se mantiene el patrón de la migración 20261015200000: SQL de una sola consulta,
-- SECURITY INVOKER y sin `set search_path`, para que PostgreSQL las incorpore a la consulta
-- del cliente. Todos los nombres van calificados con su esquema.

-- Valida el rango de fechas. Es IMMUTABLE por la misma razón que `check_case_search`: con
-- argumentos constantes se evalúa una sola vez, al planificar.
create or replace function private.check_case_created_range(
  created_from timestamptz,
  created_to timestamptz
)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
begin
  if created_from is not null and created_to is not null and created_to <= created_from then
    raise exception 'La fecha final debe ser posterior a la inicial';
  end if;
  return true;
end;
$$;

revoke all on function private.check_case_created_range(timestamptz, timestamptz)
  from public, anon;
grant execute on function private.check_case_created_range(timestamptz, timestamptz)
  to authenticated;

-- `count_cases_by_status` llama a `search_cases`: se retira primero.
drop function public.count_cases_by_status(text, public.case_priority, timestamptz, text);
drop function public.search_cases(
  text, public.case_status[], public.case_priority, timestamptz, text
);

create function public.search_cases(
  scope text default 'todas',
  statuses public.case_status[] default null,
  priority_filter public.case_priority default null,
  updated_since timestamptz default null,
  search_text text default null,
  priorities public.case_priority[] default null,
  created_from timestamptz default null,
  created_to timestamptz default null,
  overdue_only boolean default false
)
returns setof public.cases
language sql
stable
security invoker
as $$
  select c.*
  from public.cases c
  where private.check_case_search(scope, search_text)
    and private.check_case_created_range(created_from, created_to)
    and (statuses is null or c.status = any (statuses))
    and (priority_filter is null or c.priority = priority_filter)
    and (priorities is null or c.priority = any (priorities))
    and (updated_since is null or c.updated_at >= updated_since)
    and (created_from is null or c.created_at >= created_from)
    and (created_to is null or c.created_at < created_to)
    -- Vencida (9.2), igual que `public.overdue_stage(cases)`. Va en línea para no llamar a
    -- una función por fila; la prueba 31 comprueba que coinciden.
    and (
      not coalesce(overdue_only, false)
      or (
        c.status = 'solicitado'
        and c.created_at + pg_catalog.make_interval(hours => c.accept_target_hours)
          <= pg_catalog.now()
      )
      or (
        c.status in ('aceptado', 'asignado', 'en_ejecucion', 'en_espera')
        and c.created_at + pg_catalog.make_interval(hours => c.resolve_target_hours)
          <= pg_catalog.now()
      )
    )
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

-- `overdue` y `unassigned` cuentan, dentro de cada estado, las vencidas y las que no tienen
-- responsable (chips «Vencidas» y «Sin asignar»).
create function public.count_cases_by_status(
  scope text default 'todas',
  priority_filter public.case_priority default null,
  updated_since timestamptz default null,
  search_text text default null,
  statuses public.case_status[] default null,
  priorities public.case_priority[] default null,
  created_from timestamptz default null,
  created_to timestamptz default null,
  overdue_only boolean default false
)
returns table (status public.case_status, total bigint, overdue bigint, unassigned bigint)
language sql
stable
security invoker
as $$
  select
    c.status,
    pg_catalog.count(*),
    pg_catalog.count(*) filter (
      where (
        c.status = 'solicitado'
        and c.created_at + pg_catalog.make_interval(hours => c.accept_target_hours)
          <= pg_catalog.now()
      ) or (
        c.status in ('aceptado', 'asignado', 'en_ejecucion', 'en_espera')
        and c.created_at + pg_catalog.make_interval(hours => c.resolve_target_hours)
          <= pg_catalog.now()
      )
    ),
    pg_catalog.count(*) filter (where c.assigned_to is null)
  from public.search_cases(
    scope, statuses, priority_filter, updated_since, search_text,
    priorities, created_from, created_to, overdue_only
  ) c
  group by c.status;
$$;

revoke all on function public.search_cases(
  text, public.case_status[], public.case_priority, timestamptz, text,
  public.case_priority[], timestamptz, timestamptz, boolean
) from public, anon;
grant execute on function public.search_cases(
  text, public.case_status[], public.case_priority, timestamptz, text,
  public.case_priority[], timestamptz, timestamptz, boolean
) to authenticated;

revoke all on function public.count_cases_by_status(
  text, public.case_priority, timestamptz, text,
  public.case_status[], public.case_priority[], timestamptz, timestamptz, boolean
) from public, anon;
grant execute on function public.count_cases_by_status(
  text, public.case_priority, timestamptz, text,
  public.case_status[], public.case_priority[], timestamptz, timestamptz, boolean
) to authenticated;
