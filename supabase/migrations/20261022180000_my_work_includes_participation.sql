-- «Mis trabajos» incluye los casos en los que la persona participó (contrato C-021,
-- aprobado por el responsable el 22/10/2026).
--
-- BUSINESS_RULES 5.4 ya deja ver los casos en los que alguien fue técnico asignado o firmó,
-- aunque cambie de área o el caso se reasigne. Desde C-020 la lista del técnico no tiene
-- «Todas», así que esos casos no aparecían en ninguna lista. Ahora `mis_trabajos` suma
-- `private.participated_case_ids()`, la misma función que usa la política de `cases`.
--
-- Solo cambia el cuerpo de `search_cases`: misma firma, permisos y patrón de la migración
-- 20261019190000. `count_cases_by_status` la llama, así que hereda el cambio.

create or replace function public.search_cases(
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
      -- Lo asignado hoy y lo que la persona ejecutó o firmó antes (5.4), aunque cambie de
      -- área o se haya reasignado el caso.
      when 'mis_trabajos' then c.assigned_to = (select auth.uid())
        or c.id in (select private.participated_case_ids())
      when 'mi_area' then (select private.current_area_id()) in (
        c.requesting_area_id,
        c.target_area_id
      )
      when 'area_atiende' then c.target_area_id = (select private.current_area_id())
      when 'area_envia' then c.requesting_area_id = (select private.current_area_id())
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
