-- Pruebas de las suplencias de firma cuando el firmante designado ya firmó la versión
-- (migración 20261006120000). Usan una empresa nueva, «Empresa C», para controlar
-- cuántos jefes y administradores hay.

\set ON_ERROR_STOP 1
\set QUIET 1

-- ---------------------------------------------------------------------------
-- Preparación: Empresa C con un área técnica, un área solicitante sin jefe, un solo
-- jefe técnico y un solo administrador.
-- ---------------------------------------------------------------------------

select test.set('org_c', private.create_organization('Empresa C', 'admin@c.test')::text);
select test.register('admin_c', 'admin@c.test', 'Ana Admin C');
select test.register('jefe_c', 'jefe@c.test', 'Jorge Jefe C');
select test.register('tec_c', 'tec@c.test', 'Tina Técnica C');
select test.register('tec_c2', 'tec2@c.test', 'Toño Técnico C');
select test.register('sol_c', 'sol@c.test', 'Sofía Solicitante C');

insert into public.areas (organization_id, name, kind)
values
  (test.get('org_c')::uuid, 'Mantenimiento C', 'tecnica'),
  (test.get('org_c')::uuid, 'Ventas C', 'solicitante');
select test.set('area_mant_c', (select id::text from public.areas where name = 'Mantenimiento C'));
select test.set('area_ventas_c', (select id::text from public.areas where name = 'Ventas C'));

insert into public.categories (organization_id, area_id, name)
values (test.get('org_c')::uuid, test.get('area_mant_c')::uuid, 'Plomería C');
select test.set('cat_c', (select id::text from public.categories where name = 'Plomería C'));

update public.profiles
set organization_id = test.get('org_c')::uuid, role = 'jefe_area', area_id = test.get('area_mant_c')::uuid
where id = test.uid('jefe_c');
update public.profiles
set organization_id = test.get('org_c')::uuid, role = 'tecnico', area_id = test.get('area_mant_c')::uuid
where id in (test.uid('tec_c'), test.uid('tec_c2'));
update public.profiles
set organization_id = test.get('org_c')::uuid, role = 'solicitante', area_id = test.get('area_ventas_c')::uuid
where id = test.uid('sol_c');

select test.ok(
  (select role = 'administrador' and organization_id = test.get('org_c')::uuid
   from public.profiles where id = test.uid('admin_c')),
  'la Empresa C tiene un solo administrador'
);

-- ---------------------------------------------------------------------------
-- 1. El área técnica se pide un trabajo a sí misma y su jefe valida
-- ---------------------------------------------------------------------------

select test.login('tec_c');
set role authenticated;
insert into public.cases (title, description, location, category_id)
values ('Fuga en taller', 'Hay una fuga en el lavamanos del taller', 'Taller C', test.get('cat_c')::uuid);
select test.set('case_self', (select id::text from public.cases where title = 'Fuga en taller'));
reset role;

select test.ok(
  (select requesting_area_id = target_area_id from public.cases where id = test.get('case_self')::uuid),
  'la solicitud del área técnica tiene la misma área solicitante y destino'
);

select test.login('jefe_c');
set role authenticated;
select public.transition_case(test.get('case_self')::uuid, 'aceptar');
select public.transition_case(test.get('case_self')::uuid, 'asignar', null, test.uid('tec_c'));
reset role;

select test.login('tec_c');
set role authenticated;
select public.transition_case(test.get('case_self')::uuid, 'iniciar');
insert into public.case_reports (case_id, diagnosis, work_done)
values (test.get('case_self')::uuid, 'Empaque del grifo desgastado', 'Se cambió el empaque del grifo');
select public.submit_case_report(test.get('case_self')::uuid, test.get('stroke'), true);
reset role;

select test.login('jefe_c');
set role authenticated;
with edited as (
  update public.cases set title = 'Fuga en taller (editado)'
  where id = test.get('case_self')::uuid
  returning id
)
select test.ok(
  (select count(*) = 0 from edited),
  'nadie edita la solicitud mientras el reporte está en revisión'
);
select public.validate_case_report(test.get('case_self')::uuid, test.get('stroke'), true);
select test.throws(
  format($$select public.approve_case_report(%L, %L, true)$$, test.get('case_self'), test.get('stroke')),
  'la conformidad la da otra persona',
  'el jefe que validó no da también la conformidad'
);
select test.throws(
  format($$select public.return_case_report(%L, 'Revisar de nuevo')$$, test.get('case_self')),
  'No puedes devolver este reporte',
  'ni la devuelve como área solicitante'
);
select test.ok(
  (public.get_home_summary() -> 'inbox' ->> 'reportes_por_aprobar')::int = 0,
  'el jefe que ya firmó no la ve como pendiente'
);
reset role;

select test.ok(
  (select count(*) = 1 and bool_and(recipient_id = test.uid('admin_c'))
   from public.notifications
   where case_id = test.get('case_self')::uuid and action = 'validar_reporte'),
  'el aviso de reporte por aprobar va al administrador, no al jefe que ya firmó'
);

select test.login('admin_c');
set role authenticated;
select test.ok(
  (public.get_home_summary() -> 'inbox' ->> 'reportes_por_aprobar')::int = 1,
  'el administrador ve la conformidad que le toca suplir'
);
select public.approve_case_report(test.get('case_self')::uuid, test.get('stroke'), true);
reset role;

select test.ok(
  (select status = 'aprobado' from public.cases where id = test.get('case_self')::uuid)
    and (select signer_id = test.uid('admin_c') from public.case_signatures
         where case_id = test.get('case_self')::uuid and signature_type = 'conformidad')
    and (select comment like '%ya firmó esta versión'
         from public.case_events
         where case_id = test.get('case_self')::uuid and action = 'aprobar_reporte'),
  'el administrador da la conformidad y queda registrada como suplencia'
);

-- ---------------------------------------------------------------------------
-- 2. El único jefe técnico ejecutó su propia solicitud: valida el administrador y
--    nadie más puede dar la conformidad.
-- ---------------------------------------------------------------------------

select test.login('jefe_c');
set role authenticated;
insert into public.cases (title, description, location, category_id)
values ('Puerta de bodega', 'La puerta de la bodega no cierra bien', 'Bodega C', test.get('cat_c')::uuid);
select test.set('case_chief', (select id::text from public.cases where title = 'Puerta de bodega'));
select public.transition_case(test.get('case_chief')::uuid, 'aceptar');
select public.transition_case(test.get('case_chief')::uuid, 'asignar', null, test.uid('jefe_c'));
select public.transition_case(test.get('case_chief')::uuid, 'iniciar');
insert into public.case_reports (case_id, diagnosis, work_done)
values (test.get('case_chief')::uuid, 'Bisagra superior suelta', 'Se ajustó y lubricó la bisagra');
select public.submit_case_report(test.get('case_chief')::uuid, test.get('stroke'), true);
reset role;

select test.login('admin_c');
set role authenticated;
select public.validate_case_report(test.get('case_chief')::uuid, test.get('stroke'), true);
reset role;

-- ---------------------------------------------------------------------------
-- 3. El área solicitante no tiene jefe, el único jefe técnico ejecutó y hay un solo
--    administrador.
-- ---------------------------------------------------------------------------

select test.login('sol_c');
set role authenticated;
insert into public.cases (title, description, location, category_id)
values ('Lavamanos de ventas', 'El lavamanos de ventas está tapado', 'Ventas C', test.get('cat_c')::uuid);
select test.set('case_nochief', (select id::text from public.cases where title = 'Lavamanos de ventas'));
reset role;

select test.login('jefe_c');
set role authenticated;
select public.transition_case(test.get('case_nochief')::uuid, 'aceptar');
select public.transition_case(test.get('case_nochief')::uuid, 'asignar', null, test.uid('jefe_c'));
select public.transition_case(test.get('case_nochief')::uuid, 'iniciar');
insert into public.case_reports (case_id, diagnosis, work_done)
values (test.get('case_nochief')::uuid, 'Sifón obstruido con residuos', 'Se desarmó y limpió el sifón');
select public.submit_case_report(test.get('case_nochief')::uuid, test.get('stroke'), true);
reset role;

select test.login('admin_c');
set role authenticated;
select public.validate_case_report(test.get('case_nochief')::uuid, test.get('stroke'), true);
select test.throws(
  format($$select public.approve_case_report(%L, %L, true)$$, test.get('case_nochief'), test.get('stroke')),
  'nadie más puede dar la conformidad',
  'el único administrador ya validó: el error explica que falta otro firmante'
);
select test.ok(
  (public.get_home_summary() -> 'admin' ->> 'conformidades_sin_firmante')::int = 2,
  'el Inicio del administrador cuenta las conformidades sin firmante'
);
select test.ok(
  (public.get_home_summary() -> 'inbox' ->> 'reportes_por_aprobar')::int = 0,
  'y no las muestra como pendientes suyas'
);
reset role;

select test.login('jefe_c');
set role authenticated;
select test.throws(
  format($$select public.approve_case_report(%L, %L, true)$$, test.get('case_chief'), test.get('stroke')),
  'nadie más puede dar la conformidad',
  'el jefe que ejecutó tampoco da la conformidad de su propia solicitud'
);
reset role;

-- Un segundo administrador destraba ambos casos.
select test.register('admin_c2', 'admin2@c.test', 'Alberto Admin C');
update public.profiles
set organization_id = test.get('org_c')::uuid, role = 'administrador'
where id = test.uid('admin_c2');

select test.login('admin_c2');
set role authenticated;
select test.ok(
  (public.get_home_summary() -> 'inbox' ->> 'reportes_por_aprobar')::int = 2
    and (public.get_home_summary() -> 'admin' ->> 'conformidades_sin_firmante')::int = 0,
  'con otro administrador, las conformidades vuelven a tener firmante'
);
select public.approve_case_report(test.get('case_chief')::uuid, test.get('stroke'), true);
select public.approve_case_report(test.get('case_nochief')::uuid, test.get('stroke'), true);
reset role;

select test.ok(
  (select bool_and(status = 'aprobado') from public.cases
   where id in (test.get('case_chief')::uuid, test.get('case_nochief')::uuid))
    and (select comment like '%no tiene jefe'
         from public.case_events
         where case_id = test.get('case_nochief')::uuid and action = 'aprobar_reporte'),
  'el segundo administrador aprueba y la suplencia queda registrada'
);
select test.ok(
  (select count(distinct signer_id) = 3 from public.case_signatures
   where case_id = test.get('case_chief')::uuid),
  'cada firma de la versión es de una persona distinta'
);

-- ---------------------------------------------------------------------------
-- 4. Al reasignar, quien deja el trabajo recibe un aviso
-- ---------------------------------------------------------------------------

select test.login('sol_c');
set role authenticated;
insert into public.cases (title, description, location, category_id)
values ('Llave de paso', 'La llave de paso del baño gotea', 'Baño ventas', test.get('cat_c')::uuid);
select test.set('case_reassign', (select id::text from public.cases where title = 'Llave de paso'));
reset role;

select test.login('jefe_c');
set role authenticated;
select public.transition_case(test.get('case_reassign')::uuid, 'aceptar');
select public.transition_case(test.get('case_reassign')::uuid, 'asignar', null, test.uid('tec_c'));
select public.transition_case(test.get('case_reassign')::uuid, 'asignar', null, test.uid('tec_c2'));
reset role;

select test.ok(
  (select title = 'Se reasignó un trabajo tuyo' from public.notifications
   where case_id = test.get('case_reassign')::uuid
     and action = 'reasignar' and recipient_id = test.uid('tec_c'))
    and (select title = 'Te asignaron un trabajo' from public.notifications
         where case_id = test.get('case_reassign')::uuid
           and action = 'reasignar' and recipient_id = test.uid('tec_c2')),
  'la persona reemplazada y la nueva reciben su aviso'
);

\echo 'Todas las pruebas de suplencias de firma pasaron.'
