-- Pruebas de la validación técnica del administrador cuando el único jefe del área
-- técnica ejecutó el trabajo. Se ejecutan después de 13, sobre los mismos datos.
-- case_jefe: asignado a jefe_tec (único jefe de Mantenimiento) y con reporte enviado.
-- case_q: asignado a tec1, en ejecución.

\set ON_ERROR_STOP 1
\set QUIET 1

-- ---------------------------------------------------------------------------
-- 1. El jefe único ejecutó: valida el administrador
-- ---------------------------------------------------------------------------

select test.ok(
  (select count(*) >= 1 and bool_and(profiles.role = 'administrador')
   from public.notifications
   join public.profiles on profiles.id = notifications.recipient_id
   where notifications.case_id = test.get('case_jefe')::uuid
     and notifications.action = 'enviar_reporte'),
  'si el único jefe ejecutó, el aviso de reporte por validar va a los administradores'
);

select test.login('jefe_tec');
set role authenticated;
select test.ok(
  (public.get_home_summary() -> 'inbox' ->> 'reportes_por_validar')::int = 0,
  'el jefe que ejecutó no ve su propio reporte como pendiente de validar'
);
reset role;

select test.login('admin');
set role authenticated;
select test.ok(
  (public.get_home_summary() -> 'inbox' ->> 'reportes_por_validar')::int = 1,
  'el administrador ve la validación que le toca suplir'
);
select public.validate_case_report(test.get('case_jefe')::uuid, test.get('stroke'), true);
reset role;

select test.ok(
  (select status = 'validado' from public.cases where id = test.get('case_jefe')::uuid)
    and (select signer_role = 'administrador' and signer_id = test.uid('admin')
         from public.case_signatures
         where case_id = test.get('case_jefe')::uuid and signature_type = 'validacion_tecnica')
    and (select comment like 'Validación del administrador%'
         from public.case_events
         where case_id = test.get('case_jefe')::uuid and action = 'validar_reporte'),
  'la validación del administrador queda firmada y registrada como suplencia'
);

-- ---------------------------------------------------------------------------
-- 2. Si hay un jefe que no ejecutó, el administrador no valida
-- ---------------------------------------------------------------------------

select test.login('tec1');
set role authenticated;
insert into public.case_reports (case_id, diagnosis, work_done)
values (test.get('case_q')::uuid, 'Filtración desde la tubería del techo', 'Se selló la tubería y se secó la pared');
select public.submit_case_report(test.get('case_q')::uuid, test.get('stroke'), true);
reset role;

select test.ok(
  (select count(*) = 1 and bool_and(recipient_id = test.uid('jefe_tec'))
   from public.notifications
   where case_id = test.get('case_q')::uuid and action = 'enviar_reporte'),
  'con un jefe disponible, el aviso va solo a él'
);

select test.login('admin');
set role authenticated;
select test.throws(
  format($$select public.validate_case_report(%L, %L, true)$$, test.get('case_q'), test.get('stroke')),
  'Solo el jefe del área técnica',
  'el administrador no valida si hay un jefe que no ejecutó el trabajo'
);
select test.throws(
  format($$select public.return_case_report(%L, 'Revisar la tubería')$$, test.get('case_q')),
  'No puedes devolver este reporte',
  'ni lo devuelve'
);
select test.ok(
  (public.get_home_summary() -> 'inbox' ->> 'reportes_por_validar')::int = 0,
  'y no lo ve como pendiente en su Inicio'
);
reset role;

-- ---------------------------------------------------------------------------
-- 3. El administrador suplente también puede devolver el reporte
-- ---------------------------------------------------------------------------

select test.login('sol2');
set role authenticated;
insert into public.cases (title, description, location, category_id)
values ('Chapa trabada', 'La chapa de la puerta de RRHH está trabada', 'Puerta RRHH', test.get('cat_elec')::uuid);
select test.set('case_dev', (select id::text from public.cases where title = 'Chapa trabada'));
reset role;
select test.login('jefe_tec');
set role authenticated;
select public.transition_case(test.get('case_dev')::uuid, 'aceptar');
select public.transition_case(test.get('case_dev')::uuid, 'asignar', null, test.uid('jefe_tec'));
select public.transition_case(test.get('case_dev')::uuid, 'iniciar');
insert into public.case_reports (case_id, diagnosis, work_done)
values (test.get('case_dev')::uuid, 'Resorte de la chapa vencido', 'Se lubricó y ajustó la chapa');
select public.submit_case_report(test.get('case_dev')::uuid, test.get('stroke'), true);
reset role;

select test.login('admin');
set role authenticated;
select public.return_case_report(test.get('case_dev')::uuid, 'Falta indicar si se cambió el resorte');
reset role;
select test.ok(
  (select status = 'en_ejecucion' from public.cases where id = test.get('case_dev')::uuid)
    and (select returned_by = test.uid('admin') from public.case_report_versions
         where case_id = test.get('case_dev')::uuid and version_number = 1),
  'el administrador suplente devuelve el reporte al jefe que lo ejecutó'
);

select test.login('admin_b');
set role authenticated;
select test.throws(
  format($$select public.validate_case_report(%L, %L, true)$$, test.get('case_q'), test.get('stroke')),
  'Solicitud no encontrada',
  'el administrador de otra empresa no valida'
);
reset role;

\echo 'Todas las pruebas de validación del administrador pasaron.'
