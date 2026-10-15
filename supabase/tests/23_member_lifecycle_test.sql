-- Pruebas: reasignación en ejecución, visibilidad por participación y baja de miembros
-- (docs/BUSINESS_RULES.md 2.2, 5.4 y 5.5.3; hallazgos D-1 a D-3). Se ejecutan después de 22.

\set ON_ERROR_STOP 1
\set QUIET 1

select test.set('case9', (select id::text from public.cases
  where organization_id = test.get('org_a')::uuid and case_number = 'CAS-2026-00009'));
select test.set('case11', (select id::text from public.cases
  where organization_id = test.get('org_a')::uuid and case_number = 'CAS-2026-00011'));
select test.set('case14', (select id::text from public.cases
  where organization_id = test.get('org_a')::uuid and case_number = 'CAS-2026-00014'));
select test.set('case16', (select id::text from public.cases
  where organization_id = test.get('org_a')::uuid and case_number = 'CAS-2026-00016'));

select test.ok(
  (select status = 'en_ejecucion' and assigned_to = test.uid('tec1')
   from public.cases where id = test.get('case9')::uuid)
  and (select status = 'aceptado' from public.cases where id = test.get('case11')::uuid)
  and (select status = 'solicitado' and created_by = test.uid('sol1')
       from public.cases where id = test.get('case14')::uuid)
  and (select status = 'reporte_enviado' from public.cases where id = test.get('case16')::uuid),
  'los casos de A están en el estado que esperan estas pruebas'
);

-- ---------------------------------------------------------------------------
-- 1. Reasignación en ejecución y en espera (D-2)
-- ---------------------------------------------------------------------------

select test.login('jefe_tec');
set role authenticated;
select test.throws(
  format($$select public.transition_case(%L, 'asignar', null, %L)$$, test.get('case9'), test.uid('tec3')),
  'Indica el motivo de la reasignación',
  'reasignar un trabajo en ejecución exige motivo'
);
reset role;

select test.login('tec3');
set role authenticated;
select test.throws(
  format($$select public.transition_case(%L, 'asignar', 'Me lo quedo', %L)$$, test.get('case9'), test.uid('tec3')),
  'Solo el jefe del área técnica puede asignar la solicitud',
  'un técnico no reasigna trabajos'
);
reset role;

select test.login('jefe_tec');
set role authenticated;
select public.transition_case(test.get('case9')::uuid, 'asignar', 'Tomás está de vacaciones', test.uid('tec3'));
reset role;

select test.ok(
  (select status = 'en_ejecucion' and assigned_to = test.uid('tec3') and started_at is not null
   from public.cases where id = test.get('case9')::uuid),
  'el trabajo sigue en ejecución con el nuevo técnico'
);
select test.ok(
  exists (select 1 from public.case_events
          where case_id = test.get('case9')::uuid and action = 'reasignar'
            and from_status = 'en_ejecucion' and to_status = 'en_ejecucion'
            and assignee_id = test.uid('tec3') and comment = 'Tomás está de vacaciones'),
  'la reasignación queda en el historial con su motivo'
);
select test.ok(
  exists (select 1 from public.notifications
          where case_id = test.get('case9')::uuid and action = 'reasignar'
            and recipient_id = test.uid('tec3') and title = 'Te asignaron un trabajo')
  and exists (select 1 from public.notifications
              where case_id = test.get('case9')::uuid and action = 'reasignar'
                and recipient_id = test.uid('tec1') and title = 'Se reasignó un trabajo tuyo'),
  'el nuevo técnico y quien deja el trabajo reciben aviso'
);

select test.login('tec3');
set role authenticated;
select test.ok(private.can_register_case_usage(test.get('case9')::uuid),
  'el nuevo técnico puede registrar recursos y editar el reporte');
select public.transition_case(test.get('case9')::uuid, 'pausar', 'Falta un repuesto');
reset role;

select test.login('tec1');
set role authenticated;
select test.ok(not private.can_register_case_usage(test.get('case9')::uuid),
  'quien dejó el trabajo ya no registra recursos');
reset role;

select test.login('admin');
set role authenticated;
select public.transition_case(test.get('case9')::uuid, 'asignar', 'Lo retoma Óscar', test.uid('outsider'));
reset role;

select test.ok(
  (select status = 'en_espera' and assigned_to = test.uid('outsider')
   from public.cases where id = test.get('case9')::uuid),
  'el administrador reasigna un trabajo en espera y sigue en espera'
);

select test.login('jefe_tec');
set role authenticated;
select test.throws(
  format($$select public.transition_case(%L, 'asignar', 'Cambio tardío', %L)$$, test.get('case16'), test.uid('tec3')),
  'Solo se puede asignar una solicitud aceptada',
  'no se reasigna un reporte enviado'
);
reset role;

-- ---------------------------------------------------------------------------
-- 2. Visibilidad por participación (D-3)
-- ---------------------------------------------------------------------------
-- tec1 pasa al área de Tecnología y jefe_sol pasa a Recursos Humanos como solicitante.

select test.set('tec1_cases', (select array_agg(id order by id)::text from public.cases
  where organization_id = test.get('org_a')::uuid
    and (assigned_to = test.uid('tec1')
         or id in (select case_id from public.case_events where assignee_id = test.uid('tec1'))
         or id in (select case_id from public.case_signatures where signer_id = test.uid('tec1')))));
select test.set('jefe_sol_signed', (select array_agg(distinct case_id order by case_id)::text
  from public.case_signatures where signer_id = test.uid('jefe_sol')));

select test.login('admin');
set role authenticated;
select public.set_member_access(test.uid('tec1'), 'tecnico', test.get('area_tec')::uuid);
select public.set_member_access(test.uid('jefe_sol'), 'solicitante', test.get('area_rrhh')::uuid);
reset role;

select test.login('tec1');
set role authenticated;
select test.ok(
  (select count(*) from public.cases where id = any (test.get('tec1_cases')::uuid[]))
    = cardinality(test.get('tec1_cases')::uuid[])
  and cardinality(test.get('tec1_cases')::uuid[]) >= 4,
  'quien fue técnico asignado o firmó sigue viendo esos casos tras cambiar de área'
);
select test.ok(
  (select count(*) from public.case_signatures where case_id = any (test.get('tec1_cases')::uuid[])) > 0
  and (select count(*) from public.case_events where case_id = test.get('case9')::uuid) > 0,
  'también ve sus firmas y su historial'
);
select test.ok(
  not exists (select 1 from public.cases where id = test.get('case14')::uuid),
  'no ve los casos de su área anterior en los que no participó'
);
reset role;

select test.login('jefe_sol');
set role authenticated;
select test.ok(
  (select count(*) from public.cases where id = any (test.get('jefe_sol_signed')::uuid[]))
    = cardinality(test.get('jefe_sol_signed')::uuid[])
  and cardinality(test.get('jefe_sol_signed')::uuid[]) >= 1,
  'un jefe que cambia de área sigue viendo lo que firmó'
);
select test.ok(
  not exists (select 1 from public.cases where id = test.get('case14')::uuid),
  'y deja de ver lo demás de su área anterior'
);
reset role;

-- ---------------------------------------------------------------------------
-- 3. Baja de miembros (D-1)
-- ---------------------------------------------------------------------------

select test.login('jefe_tec');
set role authenticated;
select test.throws(
  format($$select public.deactivate_member(%L)$$, test.uid('tec3')),
  'Acceso denegado', 'solo un administrador da de baja'
);
reset role;

select test.login('admin_c');
set role authenticated;
select test.throws(
  format($$select public.deactivate_member(%L)$$, test.uid('tec3')),
  'Usuario no encontrado', 'un administrador de otra empresa no da de baja a miembros de A'
);
reset role;

select test.login('admin');
set role authenticated;
select test.throws(
  format($$select public.deactivate_member(%L)$$, test.uid('admin')),
  'No puedes darte de baja a ti mismo', 'el administrador no se da de baja a sí mismo'
);
select test.throws(
  format($$select public.deactivate_member(%L)$$, test.uid('outsider')),
  'Reasigna primero sus trabajos abiertos: CAS-2026-00009',
  'no se da de baja a quien tiene trabajos abiertos, y se dice cuáles'
);
reset role;

-- tec3 tiene un dispositivo registrado y avisos; sol1 creó solicitudes pendientes.
insert into public.push_tokens (user_id, token, platform)
values (test.uid('tec3'), 'ExponentPushToken[tec3-baja]', 'android');
select test.ok(
  exists (select 1 from public.notifications where recipient_id = test.uid('tec3'))
  and exists (select 1 from public.notifications where recipient_id = test.uid('sol1')),
  'las personas que se darán de baja tienen avisos'
);

select test.login('admin');
set role authenticated;
select public.deactivate_member(test.uid('tec3'));
select public.deactivate_member(test.uid('sol1'));
reset role;

select test.ok(
  (select organization_id is null and area_id is null and role = 'solicitante'
   from public.profiles where id = test.uid('tec3'))
  and (select full_name = (select full_name from public.profiles where id = test.uid('tec3'))
         and deactivated_by = test.uid('admin')
       from public.former_members
       where organization_id = test.get('org_a')::uuid and user_id = test.uid('tec3')),
  'la baja deja a la persona sin empresa y registra su nombre, quién y cuándo'
);
select test.ok(
  not exists (select 1 from public.push_tokens where user_id = test.uid('tec3')),
  'la baja borra sus dispositivos para que no reciba notificaciones'
);
select test.ok(
  exists (select 1 from public.case_events where actor_id = test.uid('tec3'))
  and exists (select 1 from public.cases where created_by = test.uid('sol1')),
  'su historial y sus solicitudes se conservan'
);

select test.login('tec3');
set role authenticated;
select test.ok(
  not exists (select 1 from public.cases)
  and not exists (select 1 from public.notifications)
  and not exists (select 1 from public.areas)
  and private.current_organization_id() is null
  and not private.is_admin(),
  'quien fue dado de baja no ve casos, avisos ni datos de la empresa'
);
select test.throws(
  format($$select public.transition_case(%L, 'reanudar')$$, test.get('case9')),
  'Acceso denegado', 'quien fue dado de baja no cambia casos'
);
reset role;

select test.login('sol1');
set role authenticated;
select test.ok(
  not exists (select 1 from public.cases),
  'tampoco ve las solicitudes que creó'
);
reset role;

select test.login('jefe_tec');
set role authenticated;
select test.ok(
  (select full_name from public.former_members where user_id = test.uid('tec3')) is not null
  and not exists (select 1 from public.profiles where id = test.uid('tec3')),
  'sus compañeros siguen viendo su nombre en el historial, pero no su perfil'
);
select test.throws(
  format($$select public.transition_case(%L, 'asignar', null, %L)$$, test.get('case11'), test.uid('tec3')),
  'El técnico debe pertenecer al área técnica de la solicitud',
  'no se asignan trabajos a quien fue dado de baja'
);
select public.transition_case(test.get('case14')::uuid, 'aceptar');
reset role;

select test.ok(
  not exists (select 1 from public.notifications
              where case_id = test.get('case14')::uuid and action = 'aceptar'),
  'quien fue dado de baja no recibe avisos de sus solicitudes'
);

select test.login('admin_c');
set role authenticated;
select test.ok(
  not exists (select 1 from public.profiles where id = test.uid('tec3'))
  and not exists (select 1 from public.former_members),
  'otra empresa no ve a la persona dada de baja ni las bajas de A'
);
reset role;

-- Entra en otra empresa como cualquier persona sin empresa: con el código y la aprobación
-- de un administrador. A no ve sus datos nuevos.
select test.set('join_code_a', (select join_code from public.organizations
  where id = test.get('org_a')::uuid));
select test.set('join_code_b', (select join_code from public.organizations
  where id = test.get('org_b')::uuid));
select test.set('area_oper_b', (select id::text from public.areas
  where organization_id = test.get('org_b')::uuid and name = 'Operaciones'));

select test.login('tec3');
set role authenticated;
select public.request_organization_access(test.get('join_code_b'));
reset role;

select test.login('admin_b');
set role authenticated;
select public.approve_access_request(
  (select id from public.organization_access_requests
   where user_id = test.uid('tec3') and status = 'pendiente'),
  'solicitante', test.get('area_oper_b')::uuid);
reset role;

select test.login('jefe_tec');
set role authenticated;
select test.ok(
  (select organization_id = test.get('org_b')::uuid from public.profiles where id = test.uid('tec3'))
    is null
  and exists (select 1 from public.former_members where user_id = test.uid('tec3')),
  'si entra en otra empresa, A no ve su perfil nuevo y conserva su nombre'
);
reset role;

-- Una segunda baja, ahora en B, no borra el registro de A.
select test.login('admin_b');
set role authenticated;
select public.deactivate_member(test.uid('tec3'));
reset role;

select test.ok(
  (select count(*) from public.former_members where user_id = test.uid('tec3')) = 2,
  'cada empresa conserva su propio registro de la baja'
);

-- Vuelve a A.
select test.login('tec3');
set role authenticated;
select public.request_organization_access(test.get('join_code_a'));
reset role;

select test.login('admin');
set role authenticated;
select public.approve_access_request(
  (select id from public.organization_access_requests
   where user_id = test.uid('tec3') and status = 'pendiente'),
  'tecnico', test.get('area_mant')::uuid);
reset role;

select test.ok(
  (select organization_id = test.get('org_a')::uuid and role = 'tecnico'
   from public.profiles where id = test.uid('tec3')),
  'quien fue dado de baja puede volver con una solicitud de acceso aprobada'
);

\echo 'Todas las pruebas de baja, reasignación y participación pasaron.'
