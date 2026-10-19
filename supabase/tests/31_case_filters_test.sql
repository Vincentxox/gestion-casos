-- Pruebas: filtros de la lista de Solicitudes (contrato C-019). Se ejecutan después de 24.
-- Comparan `search_cases` y `count_cases_by_status` con consultas directas a `cases` (con la
-- misma RLS) para fecha de creación, varias prioridades, vencidas (9.2) y estados. Todo
-- ocurre en una transacción que se revierte, porque se cambian fechas de creación.

\set ON_ERROR_STOP 1
\set QUIET 1

begin;

-- ---------------------------------------------------------------------------
-- 1. Firmas, permisos y plan
-- ---------------------------------------------------------------------------

select test.ok(
  to_regprocedure('public.search_cases(text, public.case_status[], public.case_priority, timestamptz, text)') is null
  and to_regprocedure('public.count_cases_by_status(text, public.case_priority, timestamptz, text)') is null,
  'las firmas anteriores se reemplazan: no quedan dos versiones con todo opcional'
);

select test.ok(
  not (select prosecdef from pg_proc where oid = 'public.search_cases(text, public.case_status[], public.case_priority, timestamptz, text, public.case_priority[], timestamptz, timestamptz, boolean)'::regprocedure)
  and not (select prosecdef from pg_proc where oid = 'public.count_cases_by_status(text, public.case_priority, timestamptz, text, public.case_status[], public.case_priority[], timestamptz, timestamptz, boolean)'::regprocedure)
  and (select provolatile = 'i' from pg_proc where oid = 'private.check_case_created_range(timestamptz, timestamptz)'::regprocedure),
  'los filtros siguen siendo SECURITY INVOKER y la validación de fechas es IMMUTABLE'
);

select test.ok(
  not has_function_privilege('anon', 'public.search_cases(text, public.case_status[], public.case_priority, timestamptz, text, public.case_priority[], timestamptz, timestamptz, boolean)', 'execute')
  and not has_function_privilege('anon', 'public.count_cases_by_status(text, public.case_priority, timestamptz, text, public.case_status[], public.case_priority[], timestamptz, timestamptz, boolean)', 'execute')
  and not has_function_privilege('anon', 'private.check_case_created_range(timestamptz, timestamptz)', 'execute')
  and has_function_privilege('authenticated', 'public.search_cases(text, public.case_status[], public.case_priority, timestamptz, text, public.case_priority[], timestamptz, timestamptz, boolean)', 'execute')
  and has_function_privilege('authenticated', 'public.count_cases_by_status(text, public.case_priority, timestamptz, text, public.case_status[], public.case_priority[], timestamptz, timestamptz, boolean)', 'execute'),
  'solo usuarios autenticados ejecutan los filtros'
);

create or replace function pg_temp.plan_text(query text)
returns text
language plpgsql
as $$
declare
  plan_line text;
  plan text := '';
begin
  for plan_line in execute 'explain ' || query loop
    plan := plan || plan_line || E'\n';
  end loop;
  return plan;
end;
$$;

select test.ok(
  pg_temp.plan_text($q$select id from public.search_cases(scope => 'mi_area', statuses => array['asignado']::public.case_status[], priorities => array['alta', 'media']::public.case_priority[], created_from => now() - interval '30 days', created_to => now(), overdue_only => true, search_text => 'x') order by created_at desc limit 30$q$)
    not like '%Function Scan%'
  and pg_temp.plan_text($q$select * from public.count_cases_by_status(scope => 'mi_area', priorities => array['alta']::public.case_priority[], created_from => now() - interval '30 days', overdue_only => true)$q$)
    not like '%Function Scan%',
  'con los filtros nuevos, las funciones siguen incorporadas a la consulta del cliente'
);

-- ---------------------------------------------------------------------------
-- 2. Datos: fechas de creación repartidas semana a semana
-- ---------------------------------------------------------------------------

-- Fechas fijas, sin depender del orden de los identificadores (son aleatorios): entre las
-- solicitudes abiertas, una sí y otra no pasa a crearse hace 60 días, así que queda vencida
-- y antigua; las demás pasan a crearse hace 10 minutos y siguen a tiempo. Las cerradas se
-- reparten semana a semana. Sin disparadores: solo cambia la fecha de creación.
set local session_replication_role = replica;
update public.cases c
set created_at = case
  when o.is_open and o.n % 2 = 0 then now() - interval '60 days'
  when o.is_open then now() - interval '10 minutes'
  else least(c.created_at, now() - make_interval(days => 7 * (o.n::int - 1)))
end
from (
  select id, is_open, row_number() over (partition by is_open order by id) as n
  from (
    select id, status in ('solicitado', 'aceptado', 'asignado', 'en_ejecucion', 'en_espera') as is_open
    from public.cases
  ) t
) o
where o.id = c.id;
set local session_replication_role = origin;

select test.ok(
  exists (select 1 from public.cases c where public.overdue_stage(c) is not null)
  and exists (select 1 from public.cases c where c.status in ('solicitado', 'aceptado', 'asignado', 'en_ejecucion', 'en_espera') and public.overdue_stage(c) is null)
  and exists (select 1 from public.cases where created_at >= now() - interval '30 days')
  and exists (select 1 from public.cases where created_at < now() - interval '30 days')
  and (select count(distinct priority) from public.cases) >= 2,
  'los datos cubren casos vencidos y a tiempo, recientes y antiguos, y varias prioridades'
);

-- ---------------------------------------------------------------------------
-- 3. Cada filtro coincide con la consulta directa, para cada persona
-- ---------------------------------------------------------------------------

create temporary table filter_results (login text, check_name text, matches boolean);
grant insert, select on filter_results to authenticated;

create or replace function pg_temp.check_filters(login_name text)
returns void
language plpgsql
as $$
declare
  since timestamptz := now() - interval '30 days';
  until timestamptz := now() - interval '7 days';
  open_statuses public.case_status[] := array[
    'solicitado', 'aceptado', 'asignado', 'en_ejecucion', 'en_espera', 'reporte_enviado', 'validado'
  ]::public.case_status[];
begin
  perform test.login(login_name);
  set local role authenticated;

  insert into filter_results
  select login_name, 'creadas desde',
    (select coalesce(array_agg(id order by id), '{}') from public.search_cases(created_from => since))
    = (select coalesce(array_agg(id order by id), '{}') from public.cases where created_at >= since);

  insert into filter_results
  select login_name, 'rango de creación',
    (select coalesce(array_agg(id order by id), '{}')
     from public.search_cases(created_from => since, created_to => until))
    = (select coalesce(array_agg(id order by id), '{}') from public.cases
       where created_at >= since and created_at < until);

  insert into filter_results
  select login_name, 'varias prioridades',
    (select coalesce(array_agg(id order by id), '{}')
     from public.search_cases(priorities => array['alta', 'baja']::public.case_priority[]))
    = (select coalesce(array_agg(id order by id), '{}') from public.cases
       where priority in ('alta', 'baja'));

  insert into filter_results
  select login_name, 'vencidas',
    (select coalesce(array_agg(id order by id), '{}') from public.search_cases(overdue_only => true))
    = (select coalesce(array_agg(c.id order by c.id), '{}') from public.cases c
       where public.overdue_stage(c) is not null);

  insert into filter_results
  select login_name, 'vencidas en false no filtra',
    (select count(*) from public.search_cases(overdue_only => false))
    = (select count(*) from public.cases);

  insert into filter_results
  select login_name, 'contadores con todos los filtros',
    (select coalesce(array_agg(t.status::text || ':' || t.total || ':' || t.overdue || ':' || t.unassigned order by t.status), '{}')
     from public.count_cases_by_status(
       statuses => open_statuses,
       priorities => array['alta', 'media']::public.case_priority[],
       created_from => now() - interval '90 days'
     ) t)
    = (select coalesce(array_agg(d.status::text || ':' || d.total || ':' || d.overdue || ':' || d.unassigned order by d.status), '{}')
       from (
         select c.status, count(*) as total,
           count(*) filter (where public.overdue_stage(c) is not null) as overdue,
           count(*) filter (where c.assigned_to is null) as unassigned
         from public.cases c
         where c.status = any (open_statuses)
           and c.priority in ('alta', 'media')
           and c.created_at >= now() - interval '90 days'
         group by c.status
       ) d);

  insert into filter_results
  select login_name, 'contadores de vencidas',
    (select coalesce(sum(total), 0) from public.count_cases_by_status(overdue_only => true))
    = (select coalesce(sum(overdue), 0) from public.count_cases_by_status())
    and (select coalesce(sum(overdue), 0) from public.count_cases_by_status())
    = (select count(*) from public.cases c where public.overdue_stage(c) is not null);

  -- La llamada de la APK actual (por nombre, sin los parámetros nuevos) sigue funcionando.
  insert into filter_results
  select login_name, 'llamada anterior por nombre',
    (select coalesce(array_agg(id order by id), '{}')
     from public.search_cases(scope => 'todas', priority_filter => 'alta', updated_since => since))
    = (select coalesce(array_agg(id order by id), '{}') from public.cases
       where priority = 'alta' and updated_at >= since)
    and (select coalesce(sum(total), 0)
         from public.count_cases_by_status(scope => 'todas', priority_filter => 'alta'))
    = (select count(*) from public.cases where priority = 'alta');

  reset role;
end;
$$;

select pg_temp.check_filters('admin');
select pg_temp.check_filters('jefe_tec');
select pg_temp.check_filters('tec1');
select pg_temp.check_filters('jefe_sol');
select pg_temp.check_filters('sol2');
select pg_temp.check_filters('auditor');
select pg_temp.check_filters('admin_b');

select test.ok(
  (select bool_and(matches) from filter_results),
  'cada filtro coincide con la consulta directa para administración, jefaturas, técnico, solicitante, auditoría y otra empresa: '
    || coalesce((select string_agg(login || '/' || check_name, ', ') from filter_results where not matches), 'sin diferencias')
);

-- ---------------------------------------------------------------------------
-- 4. Otra empresa y errores
-- ---------------------------------------------------------------------------

select test.login('admin_b');
set local role authenticated;
select
  (select count(*) from public.search_cases(
     created_from => now() - interval '10 years', overdue_only => true,
     priorities => array['alta', 'media', 'baja']::public.case_priority[])
   where organization_id = test.get('org_a')::uuid) = 0
  and (select coalesce(sum(total), 0) from public.count_cases_by_status(created_from => now() - interval '10 years'))
    = (select count(*) from public.cases where organization_id <> test.get('org_a')::uuid)
  as no_cross_org \gset
reset role;
select test.ok(:'no_cross_org'::boolean, 'con los filtros nuevos, otra empresa no recibe casos de A ni en los totales');

select test.login('admin');
set local role authenticated;
select test.throws(
  $$select * from public.search_cases(created_from => now(), created_to => now() - interval '1 day')$$,
  'La fecha final debe ser posterior a la inicial',
  'rechaza un rango de fechas invertido'
);
select test.throws(
  $$select * from public.count_cases_by_status(created_from => '2026-10-01', created_to => '2026-10-01')$$,
  'La fecha final debe ser posterior a la inicial',
  'los contadores rechazan un rango vacío'
);
reset role;

rollback;

\echo 'Todas las pruebas de filtros de Solicitudes pasaron.'
