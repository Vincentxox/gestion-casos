-- Pruebas: tiempos por prioridad, vencimiento e indicadores (T-502, docs/BUSINESS_RULES.md
-- 9 y 9.2). Se ejecutan después de 20.

\set ON_ERROR_STOP 1
\set QUIET 1

-- ---------------------------------------------------------------------------
-- 1. Valores por defecto
-- ---------------------------------------------------------------------------

select test.ok(
  (select count(*) = 3
     and bool_and(
       (priority = 'alta' and accept_hours = 4 and resolve_hours = 24)
       or (priority = 'media' and accept_hours = 8 and resolve_hours = 72)
       or (priority = 'baja' and accept_hours = 24 and resolve_hours = 168)
     )
   from public.priority_targets
   where organization_id = test.get('org_a')::uuid),
  'las empresas existentes reciben los tiempos por defecto'
);
select test.ok(
  (select count(*) = 3 from public.priority_targets where organization_id = test.get('org_b')::uuid),
  'una empresa nueva también los recibe'
);

-- ---------------------------------------------------------------------------
-- 2. Quién lee y quién cambia
-- ---------------------------------------------------------------------------

select test.login('sol1');
set role authenticated;
select test.ok((select count(*) = 3 from public.priority_targets), 'un miembro lee los tiempos de su empresa');
select test.throws(
  $$update public.priority_targets set accept_hours = 1$$,
  'permission denied',
  'nadie cambia la tabla directamente'
);
select test.throws(
  $$select public.set_priority_target('alta', 2, 10)$$,
  'Solo el administrador puede cambiar los tiempos por prioridad',
  'un solicitante no cambia los tiempos'
);
reset role;

select test.login('admin_b');
set role authenticated;
select test.ok(
  (select bool_and(organization_id = test.get('org_b')::uuid) and count(*) = 3
   from public.priority_targets),
  'el administrador de B solo ve los tiempos de B'
);
reset role;

select test.login('admin');
set role authenticated;
select test.throws(
  $$select public.set_priority_target('media', 10, 5)$$,
  'no puede ser menor',
  'resolver no puede ser menor que aceptar'
);
select test.throws(
  $$select public.set_priority_target('media', 0, 5)$$,
  'entre 1 y 720 horas',
  'el tiempo para aceptar tiene límites'
);
select public.set_priority_target('baja', 48, 240);
reset role;

select test.ok(
  (select accept_hours = 48 and resolve_hours = 240 and updated_by = test.uid('admin')
   from public.priority_targets
   where organization_id = test.get('org_a')::uuid and priority = 'baja'),
  'el administrador cambia los tiempos y queda registrado quién'
);
select test.ok(
  (select accept_hours = 24 and resolve_hours = 168
   from public.priority_targets
   where organization_id = test.get('org_b')::uuid and priority = 'baja'),
  'el cambio no afecta a otra empresa'
);

-- ---------------------------------------------------------------------------
-- 2b. Cada solicitud guarda sus tiempos
-- ---------------------------------------------------------------------------

select test.ok(
  (select bool_and(accept_target_hours is not null and resolve_target_hours is not null)
   from public.cases),
  'las solicitudes existentes reciben los tiempos de su prioridad'
);

select test.login('sol1');
set role authenticated;
insert into public.cases (title, description, location, priority, category_id)
values ('Lámpara antigua', 'Una lámpara del pasillo parpadea', 'Pasillo 1', 'media', test.get('cat_elec')::uuid);
select test.set('case_old', (select id::text from public.cases where title = 'Lámpara antigua'));
reset role;

select test.login('admin');
set role authenticated;
select public.set_priority_target('media', 10, 80);
reset role;

select test.login('sol1');
set role authenticated;
insert into public.cases (title, description, location, priority, category_id)
values ('Lámpara nueva', 'Otra lámpara del pasillo parpadea', 'Pasillo 2', 'media', test.get('cat_elec')::uuid);
select test.set('case_new', (select id::text from public.cases where title = 'Lámpara nueva'));
select test.ok(
  (select accept_target_hours = 8 and resolve_target_hours = 72
   from public.cases where id = test.get('case_old')::uuid),
  'cambiar los tiempos no afecta a una solicitud ya creada'
);
select test.ok(
  (select accept_target_hours = 10 and resolve_target_hours = 80
   from public.cases where id = test.get('case_new')::uuid),
  'una solicitud nueva toma los tiempos vigentes'
);
update public.cases set priority = 'alta' where id = test.get('case_old')::uuid;
select test.ok(
  (select accept_target_hours = 4 and resolve_target_hours = 24
   from public.cases where id = test.get('case_old')::uuid),
  'al cambiar la prioridad, la solicitud toma los tiempos de la nueva prioridad'
);
select test.throws(
  format($$update public.cases set accept_target_hours = 999 where id = %L$$, test.get('case_new')),
  'permission denied',
  'el cliente no cambia los tiempos guardados de una solicitud'
);
reset role;

-- ---------------------------------------------------------------------------
-- 3. Vencimiento
-- ---------------------------------------------------------------------------

select test.login('sol1');
set role authenticated;
insert into public.cases (title, description, location, priority, category_id)
values ('Fuga en baño', 'Hay una fuga de agua en el baño', 'Piso 2', 'alta', test.get('cat_elec')::uuid);
select test.set('case_sla', (select id::text from public.cases where title = 'Fuga en baño'));
select test.ok(
  (select public.overdue_stage(cases) is null
     and public.due_at(cases) = cases.created_at + interval '4 hours'
   from public.cases where id = test.get('case_sla')::uuid),
  'una solicitud nueva de prioridad alta vence en 4 horas para aceptarse'
);
reset role;

update public.cases set created_at = now() - interval '5 hours'
where id = test.get('case_sla')::uuid;

select test.login('sol1');
set role authenticated;
select test.ok(
  (select public.overdue_stage(cases) = 'aceptacion' from public.cases where id = test.get('case_sla')::uuid),
  'pasadas 4 horas sin aceptar, vence la aceptación'
);
reset role;

select test.login('admin');
set role authenticated;
select public.transition_case(test.get('case_sla')::uuid, 'aceptar');
select test.ok(
  (select public.overdue_stage(cases) is null
     and public.due_at(cases) = cases.created_at + interval '24 hours'
   from public.cases where id = test.get('case_sla')::uuid),
  'al aceptarla deja de estar vencida y su plazo pasa a ser el de resolución'
);
reset role;

update public.cases set created_at = now() - interval '25 hours'
where id = test.get('case_sla')::uuid;

select test.login('admin');
set role authenticated;
select test.ok(
  (select public.overdue_stage(cases) = 'resolucion' from public.cases where id = test.get('case_sla')::uuid),
  'pasadas 24 horas sin enviar el reporte, vence la resolución'
);
reset role;

-- Con el reporte enviado deja de contar; si se devuelve, vuelve a contar. El estado se
-- fija directamente: aquí se prueba el cálculo, no el flujo de firmas (pruebas 12 y 20).
update public.cases set status = 'reporte_enviado' where id = test.get('case_sla')::uuid;
select test.ok(
  (select public.overdue_stage(cases) is null from public.cases where id = test.get('case_sla')::uuid),
  'con el reporte enviado, la solicitud no está vencida'
);
update public.cases set status = 'en_ejecucion' where id = test.get('case_sla')::uuid;
select test.ok(
  (select public.overdue_stage(cases) = 'resolucion' from public.cases where id = test.get('case_sla')::uuid),
  'si el reporte se devuelve, la resolución vuelve a estar vencida'
);

select test.ok(
  (select public.due_at(cases) is null and public.overdue_stage(cases) is null
   from public.cases where status in ('aprobado', 'cancelado', 'rechazado') limit 1),
  'una solicitud cerrada no vence'
);

-- ---------------------------------------------------------------------------
-- 4. Indicadores
-- ---------------------------------------------------------------------------

select test.login('sol1');
set role authenticated;
select test.throws(
  $$select public.get_case_indicators()$$,
  'Solo el administrador, los jefes de área y el auditor',
  'un solicitante no ve el panel'
);
reset role;

select test.login('admin');
set role authenticated;
select test.throws(
  $$select public.get_case_indicators(now(), now() - interval '1 day')$$,
  'El periodo no es válido',
  'el periodo debe terminar después de empezar'
);
select test.set('indicators_a', public.get_case_indicators()::text);
select test.set('indicators_recent', public.get_case_indicators(now() - interval '2 hours', now() + interval '1 hour')::text);
reset role;

select test.ok(
  (test.get('indicators_a')::jsonb ->> 'total')::int = (select count(*) from public.cases where organization_id = test.get('org_a')::uuid),
  'el administrador cuenta todas las solicitudes de su empresa'
);
select test.ok(
  (test.get('indicators_a')::jsonb -> 'vencidas_hoy' ->> 'resolucion')::int >= 1
    and (test.get('indicators_a')::jsonb -> 'vencidas_hoy' ->> 'alta')::int >= 1,
  'los vencidos de hoy incluyen la solicitud atrasada'
);
select test.ok(
  (select sum(value::int) from jsonb_each_text(test.get('indicators_a')::jsonb -> 'por_estado'))
    = (test.get('indicators_a')::jsonb ->> 'total')::int,
  'el conteo por estado suma el total'
);
select test.ok(
  jsonb_typeof(test.get('indicators_a')::jsonb -> 'costo_recursos_por_area') = 'array'
    and (test.get('indicators_a')::jsonb -> 'tiempos_promedio_horas') ? 'envio_a_aprobacion',
  'el panel trae costos por área y el tiempo de envío a aprobación'
);
select test.ok(
  (select coalesce(sum((item ->> 'costo')::numeric), 0)
   from jsonb_array_elements(test.get('indicators_a')::jsonb -> 'costo_recursos_por_area') as item)
    = (select coalesce(sum(quantity * unit_cost), 0)
       from public.case_resource_usages
       where organization_id = test.get('org_a')::uuid and kind = 'recurso'),
  'el costo por área suma cantidad por costo unitario de los recursos'
);
select test.ok(
  (test.get('indicators_recent')::jsonb ->> 'total')::int
    < (test.get('indicators_a')::jsonb ->> 'total')::int,
  'el periodo filtra por fecha de creación'
);

select test.login('jefe_tec');
set role authenticated;
select test.set('indicators_jefe', public.get_case_indicators()::text);
select test.ok(
  (test.get('indicators_jefe')::jsonb ->> 'total')::int = (select count(*) from public.cases),
  'el jefe de área cuenta solo las solicitudes que puede ver'
);
reset role;
select test.ok(
  (test.get('indicators_jefe')::jsonb ->> 'total')::int
    < (test.get('indicators_a')::jsonb ->> 'total')::int,
  'y son menos que las de toda la empresa'
);

select test.login('auditor');
set role authenticated;
select test.ok(
  (public.get_case_indicators() ->> 'total')::int = (test.get('indicators_a')::jsonb ->> 'total')::int,
  'el auditor ve los mismos indicadores que el administrador'
);
reset role;

select test.login('admin_b');
set role authenticated;
select test.ok(
  (public.get_case_indicators() ->> 'total')::int
    = (select count(*) from public.cases),
  'el administrador de B solo cuenta las solicitudes de B'
);
reset role;
select test.ok(
  (select count(*) from public.cases where organization_id = test.get('org_b')::uuid)
    < (test.get('indicators_a')::jsonb ->> 'total')::int,
  'y son menos que las de A'
);

\echo 'Todas las pruebas de tiempos por prioridad pasaron.'
