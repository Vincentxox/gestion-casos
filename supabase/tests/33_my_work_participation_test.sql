-- Pruebas: «Mis trabajos» incluye los casos en los que la persona participó (contrato C-021,
-- BUSINESS_RULES 5.4). Se ejecutan después de 32.

\set ON_ERROR_STOP 1
\set QUIET 1

-- CAS-2026-00011 está aceptado y sin técnico. La jefa técnica lo asigna a Otto (outsider) y
-- después se lo reasigna a sí misma, así Otto queda en el historial sin ser el técnico
-- actual. Todo el archivo corre en una transacción que se revierte.
begin;

select test.set('case11', (select id::text from public.cases
  where organization_id = test.get('org_a')::uuid and case_number = 'CAS-2026-00011'));

select test.login('jefe_tec');
set local role authenticated;
select public.transition_case(test.get('case11')::uuid, 'asignar', null, test.uid('outsider'));
select public.transition_case(test.get('case11')::uuid, 'asignar', 'Cambio de turno', test.uid('jefe_tec'));
reset role;

select test.ok(
  (select assigned_to = test.uid('jefe_tec') from public.cases where id = test.get('case11')::uuid)
  and exists (
    select 1 from public.case_events
    where case_id = test.get('case11')::uuid and assignee_id = test.uid('outsider')
  ),
  'CAS-2026-00011 está asignado a la jefa técnica y Otto lo tuvo antes'
);

-- ---------------------------------------------------------------------------
-- 1. Quien tuvo el caso lo sigue viendo en «Mis trabajos»
-- ---------------------------------------------------------------------------

select test.login('outsider');
set local role authenticated;
select test.get('case11')::uuid in (select id from public.search_cases('mis_trabajos'))
  as former_sees \gset
select (select coalesce(sum(total), 0) from public.count_cases_by_status(scope => 'mis_trabajos'))
  = (select count(*) from public.search_cases('mis_trabajos')) as counts_match \gset
reset role;
select test.ok(:'former_sees'::boolean,
  'el técnico anterior ve en «Mis trabajos» el caso que se reasignó');
select test.ok(:'counts_match'::boolean,
  'los totales de «Mis trabajos» coinciden con la lista');

select test.login('jefe_tec');
set local role authenticated;
select test.get('case11')::uuid in (select id from public.search_cases('mis_trabajos'))
  as current_sees \gset
reset role;
select test.ok(:'current_sees'::boolean, 'quien lo tiene ahora también lo ve en «Mis trabajos»');

-- ---------------------------------------------------------------------------
-- 2. Sigue ahí aunque cambie de área; no aparece en otra empresa
-- ---------------------------------------------------------------------------

savepoint move_area;
update public.profiles set area_id = null, role = 'solicitante' where id = test.uid('outsider');
select test.login('outsider');
set local role authenticated;
select test.get('case11')::uuid in (select id from public.search_cases('mis_trabajos'))
  as sees_after_move \gset
reset role;
rollback to savepoint move_area;
select test.ok(:'sees_after_move'::boolean,
  'después de cambiar de área y de rol, el caso sigue en «Mis trabajos»');

savepoint move_org;
update public.profiles
set organization_id = test.get('org_b')::uuid, area_id = null, role = 'solicitante'
where id = test.uid('outsider');
select test.login('outsider');
set local role authenticated;
select not exists (
  select 1 from public.search_cases('mis_trabajos')
  where organization_id = test.get('org_a')::uuid
) as no_old_org \gset
reset role;
rollback to savepoint move_org;
select test.ok(:'no_old_org'::boolean,
  'en otra empresa, «Mis trabajos» no trae casos de la empresa anterior');

-- ---------------------------------------------------------------------------
-- 3. Quien no participó no recibe casos de más
-- ---------------------------------------------------------------------------

select test.login('sol2');
set local role authenticated;
select not exists (
  select 1 from public.search_cases('mis_trabajos') c
  where c.assigned_to is distinct from (select auth.uid())
    and c.id not in (select private.participated_case_ids())
) as no_extra \gset
reset role;
select test.ok(:'no_extra'::boolean,
  '«Mis trabajos» solo trae casos asignados a la persona o en los que participó');

rollback;

\echo 'Todas las pruebas de «Mis trabajos» con participación pasaron.'
