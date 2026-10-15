-- Pruebas: búsqueda y paginación de casos en el servidor (hallazgo D-4). Se ejecutan
-- después de 23. Comparan `search_cases` con una consulta directa a `cases` (con la misma
-- RLS) que aplica los alcances de la pantalla, para varias personas y roles.

\set ON_ERROR_STOP 1
\set QUIET 1

select test.ok(
  not (select prosecdef from pg_proc where oid = 'public.search_cases(text, public.case_status[], public.case_priority, timestamptz, text)'::regprocedure)
  and not (select prosecdef from pg_proc where oid = 'public.count_cases_by_status(text, public.case_priority, timestamptz, text)'::regprocedure)
  and (select provolatile = 'i' from pg_proc where oid = 'private.check_case_search(text, text)'::regprocedure),
  'la búsqueda es SECURITY INVOKER: respeta la política de cases'
);

-- PostgreSQL debe incorporar las funciones a la consulta (sin «Function Scan»): así el
-- orden y la página del cliente usan índices y no se producen antes todos los casos.
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
  pg_temp.plan_text($q$select id from public.search_cases('mis_trabajos', array['asignado']::public.case_status[], 'alta', now(), 'x') order by created_at desc limit 30$q$)
    not like '%Function Scan%'
  and pg_temp.plan_text($q$select * from public.count_cases_by_status('mi_area', 'alta', now(), 'x')$q$)
    not like '%Function Scan%',
  'search_cases y count_cases_by_status se incorporan a la consulta del cliente'
);
select test.ok(
  not has_function_privilege('anon', 'public.search_cases(text, public.case_status[], public.case_priority, timestamptz, text)', 'execute')
  and not has_function_privilege('anon', 'public.count_cases_by_status(text, public.case_priority, timestamptz, text)', 'execute')
  and has_function_privilege('authenticated', 'public.search_cases(text, public.case_status[], public.case_priority, timestamptz, text)', 'execute'),
  'anon no puede buscar casos'
);

-- ---------------------------------------------------------------------------
-- 1. Cada alcance devuelve lo mismo que la consulta directa, para cada persona
-- ---------------------------------------------------------------------------

create temporary table scope_results (login text, scope text, matches boolean, total int);
grant insert, select on scope_results to authenticated;

create or replace function pg_temp.check_scopes(login_name text)
returns void
language plpgsql
as $$
declare
  scope_name text;
begin
  perform test.login(login_name);
  set local role authenticated;
  foreach scope_name in array array[
    'todas', 'mias', 'mis_trabajos', 'mi_area', 'bandeja', 'por_aceptar', 'sin_asignar', 'en_curso'
  ] loop
    insert into scope_results
    select login_name, scope_name,
      (select coalesce(array_agg(id order by id), '{}') from public.search_cases(scope_name))
      = (
        select coalesce(array_agg(c.id order by c.id), '{}')
        from public.cases c
        left join public.profiles me on me.id = (select auth.uid())
        where case scope_name
          when 'todas' then true
          when 'mias' then c.created_by = me.id
          when 'mis_trabajos' then c.assigned_to = me.id
          when 'mi_area' then c.requesting_area_id = me.area_id or c.target_area_id = me.area_id
          when 'bandeja' then (me.role = 'administrador' or c.target_area_id = me.area_id)
            and (c.status = 'solicitado' or (c.status = 'aceptado' and c.assigned_to is null))
          when 'por_aceptar' then c.status = 'solicitado'
          when 'sin_asignar' then c.status = 'aceptado' and c.assigned_to is null
          when 'en_curso' then c.status in ('asignado', 'en_ejecucion', 'en_espera')
        end
      ),
      (select count(*) from public.search_cases(scope_name));
  end loop;
  reset role;
end;
$$;

begin;
select pg_temp.check_scopes('admin');
commit;
begin;
select pg_temp.check_scopes('jefe_tec');
commit;
begin;
select pg_temp.check_scopes('tec1');
commit;
begin;
select pg_temp.check_scopes('jefe_sol');
commit;
begin;
select pg_temp.check_scopes('sol2');
commit;
begin;
select pg_temp.check_scopes('auditor');
commit;
begin;
select pg_temp.check_scopes('admin_b');
commit;

select test.ok(
  (select bool_and(matches) from scope_results),
  'cada alcance coincide con la consulta directa para administración, jefaturas, técnico, solicitante, auditoría y otra empresa: '
    || coalesce((select string_agg(login || '/' || scope, ', ') from scope_results where not matches), 'sin diferencias')
);
select test.ok(
  (select count(distinct scope) from scope_results where total > 0) = 8,
  'los datos de prueba cubren los ocho alcances con al menos un caso'
);

-- La búsqueda no amplía lo visible: sin filtros devuelve exactamente lo que deja ver RLS.
select test.login('tec1');
set role authenticated;
select (select array_agg(id order by id) from public.search_cases())
  = (select array_agg(id order by id) from public.cases) as same_as_rls \gset
reset role;
select test.ok(:'same_as_rls'::boolean, 'sin filtros, la búsqueda devuelve lo mismo que la política de cases');

select test.login('admin_b');
set role authenticated;
select count(*) = 0
  and (select coalesce(sum(total), 0) from public.count_cases_by_status())
    = (select count(*) from public.cases where organization_id <> test.get('org_a')::uuid)
  as no_cross_org
from public.search_cases()
where organization_id = test.get('org_a')::uuid \gset
reset role;
select test.ok(:'no_cross_org'::boolean, 'otra empresa no recibe casos de A en la búsqueda ni en los totales');

-- ---------------------------------------------------------------------------
-- 2. Filtros de estado, prioridad, fecha y texto
-- ---------------------------------------------------------------------------

select test.set('search_case', (
  select c.id::text from public.cases c
  join public.categories k on k.id = c.category_id
  where c.organization_id = test.get('org_a')::uuid
  order by c.case_number limit 1
));
select test.set('search_number', (select case_number from public.cases where id = test.get('search_case')::uuid));
select test.set('search_category', (
  select upper(substr(k.name, 2, 4)) from public.cases c
  join public.categories k on k.id = c.category_id
  where c.id = test.get('search_case')::uuid
));

select test.set('search_location', (
  select substr(location, 2, 5) from public.cases
  where organization_id = test.get('org_a')::uuid and char_length(location) >= 6
  order by case_number limit 1
));

select test.login('admin');
set role authenticated;
select
  (select bool_and(strpos(lower(location), lower(test.get('search_location'))) > 0
            or strpos(lower(title), lower(test.get('search_location'))) > 0
            or strpos(lower(case_number), lower(test.get('search_location'))) > 0)
     and count(*) > 0
     and count(*) = (select count(*) from public.cases c
                     where strpos(lower(concat_ws(' ', c.case_number, c.title, c.location,
                       (select name from public.categories k where k.id = c.category_id))),
                       lower(test.get('search_location'))) > 0)
   from public.search_cases('todas', null, null, null, test.get('search_location'))) as by_location,
  (select array_agg(case_number) from public.search_cases('todas', null, null, null, '  ' || lower(test.get('search_number')) || ' '))
    = array[test.get('search_number')] as by_number,
  test.get('search_case')::uuid in (select id from public.search_cases('todas', null, null, null, test.get('search_category'))) as by_category,
  (select count(*) from public.search_cases('todas', null, null, null, '%')) = 0
    and (select count(*) from public.search_cases('todas', null, null, null, '_')) = 0 as no_wildcards,
  test.get('search_case')::uuid in (
    select id from public.search_cases('todas', null, null, null,
      (select upper(substr(title, 3, 6)) from public.cases where id = test.get('search_case')::uuid))
  ) as by_title,
  (select bool_and(priority = 'alta') and count(*) = (select count(*) from public.cases where priority = 'alta')
   from public.search_cases('todas', null, 'alta')) as by_priority,
  (select count(*) from public.search_cases('todas', null, null, now() + interval '1 day')) = 0 as future_date,
  (select count(*) from public.search_cases('todas', null, null, now() - interval '30 days'))
    = (select count(*) from public.cases where updated_at >= now() - interval '30 days') as past_date,
  (select bool_and(status in ('rechazado', 'cancelado', 'aprobado')) and count(*) = (
     select count(*) from public.cases where status in ('rechazado', 'cancelado', 'aprobado'))
   from public.search_cases('todas', array['rechazado', 'cancelado', 'aprobado']::public.case_status[])) as by_status,
  (select count(*) from public.search_cases('todas', '{}'::public.case_status[])) = 0 as empty_statuses
\gset
reset role;

select test.ok(:'by_number'::boolean, 'busca por número de caso sin distinguir mayúsculas ni espacios');
select test.ok(:'by_title'::boolean, 'busca por el título');
select test.ok(:'by_category'::boolean, 'busca por el nombre del tipo de caso');
select test.ok(:'by_location'::boolean, 'busca por la ubicación');
select test.ok(:'no_wildcards'::boolean, 'los comodines de LIKE se buscan como texto');
select test.ok(:'by_priority'::boolean, 'filtra por prioridad');
select test.ok(:'future_date'::boolean and :'past_date'::boolean, 'filtra por fecha de actualización');
select test.ok(:'by_status'::boolean and :'empty_statuses'::boolean, 'filtra por lista de estados');

-- ---------------------------------------------------------------------------
-- 3. Totales por estado y orden con paginación
-- ---------------------------------------------------------------------------

select test.login('jefe_tec');
set role authenticated;
select
  (select coalesce(array_agg(status::text || ':' || total order by status), '{}') from public.count_cases_by_status('mi_area'))
    = (select coalesce(array_agg(status::text || ':' || n order by status), '{}')
       from (select status, count(*) n from public.search_cases('mi_area') group by status) t) as counts_match,
  (select sum(total) from public.count_cases_by_status('todas', 'alta'))
    = (select count(*) from public.search_cases('todas', null, 'alta')) as counts_with_filters,
  (select array_agg(id) from (
     select id from public.search_cases() order by priority, created_at desc, id limit 3 offset 2) page)
    = (select (array_agg(id order by priority, created_at desc, id))[3:5] from public.cases) as page_order
\gset
reset role;

select test.ok(:'counts_match'::boolean, 'los totales por estado coinciden con la búsqueda');
select test.ok(:'counts_with_filters'::boolean, 'los totales aplican los mismos filtros');
select test.ok(:'page_order'::boolean, 'el cliente ordena y pagina el resultado (range)');

-- ---------------------------------------------------------------------------
-- 4. Errores
-- ---------------------------------------------------------------------------

select test.login('admin');
set role authenticated;
select test.throws(
  $$select * from public.search_cases('otra')$$,
  'Alcance no válido',
  'rechaza un alcance desconocido'
);
select test.throws(
  format($$select * from public.search_cases('todas', null, null, null, %L)$$, repeat('a', 101)),
  'La búsqueda no puede exceder 100 caracteres',
  'limita el texto de búsqueda a 100 caracteres'
);
reset role;

drop table scope_results;

\echo 'Todas las pruebas de búsqueda de casos pasaron.'
