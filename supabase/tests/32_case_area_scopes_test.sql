-- Pruebas: alcances «lo que atiende» y «enviadas» de un área (contrato C-020). Se ejecutan
-- después de 31. Comparan `search_cases` y `count_cases_by_status` con una consulta directa
-- a `cases` (con la misma RLS) para varias personas y roles.

\set ON_ERROR_STOP 1
\set QUIET 1

select test.ok(
  not (select prosecdef from pg_proc where oid = 'public.search_cases(text, public.case_status[], public.case_priority, timestamptz, text, public.case_priority[], timestamptz, timestamptz, boolean)'::regprocedure)
  and has_function_privilege('authenticated', 'public.search_cases(text, public.case_status[], public.case_priority, timestamptz, text, public.case_priority[], timestamptz, timestamptz, boolean)', 'execute')
  and not has_function_privilege('anon', 'public.search_cases(text, public.case_status[], public.case_priority, timestamptz, text, public.case_priority[], timestamptz, timestamptz, boolean)', 'execute')
  and (select provolatile = 'i' from pg_proc where oid = 'private.check_case_search(text, text)'::regprocedure),
  'la búsqueda sigue siendo SECURITY INVOKER, con los mismos permisos'
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
  pg_temp.plan_text($q$select id from public.search_cases('area_atiende') order by created_at desc limit 30$q$)
    not like '%Function Scan%'
  and pg_temp.plan_text($q$select * from public.count_cases_by_status(scope => 'area_envia')$q$)
    not like '%Function Scan%',
  'con los alcances nuevos, las funciones siguen incorporadas a la consulta del cliente'
);

-- ---------------------------------------------------------------------------
-- Cada alcance coincide con la consulta directa, para cada persona
-- ---------------------------------------------------------------------------

create temporary table area_scope_results (login text, scope text, matches boolean, total int);
grant insert, select on area_scope_results to authenticated;

create or replace function pg_temp.check_area_scopes(login_name text)
returns void
language plpgsql
as $$
declare
  scope_name text;
begin
  perform test.login(login_name);
  set local role authenticated;
  foreach scope_name in array array['area_atiende', 'area_envia'] loop
    insert into area_scope_results
    select login_name, scope_name,
      (select coalesce(array_agg(id order by id), '{}') from public.search_cases(scope_name))
      = (
        select coalesce(array_agg(c.id order by c.id), '{}')
        from public.cases c
        left join public.profiles me on me.id = (select auth.uid())
        where case scope_name
          when 'area_atiende' then c.target_area_id = me.area_id
          when 'area_envia' then c.requesting_area_id = me.area_id
        end
      )
      and (select coalesce(sum(total), 0) from public.count_cases_by_status(scope => scope_name))
        = (select count(*) from public.search_cases(scope_name)),
      (select count(*) from public.search_cases(scope_name));
  end loop;
  -- Las dos partes juntas son `mi_area`.
  insert into area_scope_results
  select login_name, 'mi_area = atiende + envia',
    (select coalesce(array_agg(id order by id), '{}') from public.search_cases('mi_area'))
    = (select coalesce(array_agg(id order by id), '{}') from (
         select id from public.search_cases('area_atiende')
         union
         select id from public.search_cases('area_envia')
       ) t),
    null;
  reset role;
end;
$$;

begin;
select pg_temp.check_area_scopes('admin');
commit;
begin;
select pg_temp.check_area_scopes('jefe_tec');
commit;
begin;
select pg_temp.check_area_scopes('tec1');
commit;
begin;
select pg_temp.check_area_scopes('jefe_sol');
commit;
begin;
select pg_temp.check_area_scopes('sol2');
commit;
begin;
select pg_temp.check_area_scopes('auditor');
commit;
begin;
select pg_temp.check_area_scopes('admin_b');
commit;

select test.ok(
  (select bool_and(matches) from area_scope_results),
  'los alcances de área coinciden con la consulta directa para administración, jefaturas, técnico, solicitante, auditoría y otra empresa: '
    || coalesce((select string_agg(login || '/' || scope, ', ') from area_scope_results where not matches), 'sin diferencias')
);
select test.ok(
  (select count(*) from area_scope_results where login = 'jefe_tec' and scope = 'area_atiende' and total > 0) = 1
  and (select count(*) from area_scope_results where login = 'jefe_sol' and scope = 'area_envia' and total > 0) = 1,
  'los datos de prueba cubren los dos alcances con al menos un caso'
);

-- Otra empresa no recibe casos de A con los alcances nuevos.
select test.login('admin_b');
set role authenticated;
select (select count(*) from public.search_cases('area_atiende') where organization_id = test.get('org_a')::uuid) = 0
  and (select count(*) from public.search_cases('area_envia') where organization_id = test.get('org_a')::uuid) = 0
  as no_cross_org \gset
reset role;
select test.ok(:'no_cross_org'::boolean, 'otra empresa no recibe casos de A con los alcances de área');

select test.login('admin');
set role authenticated;
select test.throws(
  $$select * from public.search_cases('area_otra')$$,
  'Alcance no válido',
  'sigue rechazando un alcance desconocido'
);
reset role;

drop table area_scope_results;

\echo 'Todas las pruebas de alcances de área pasaron.'
