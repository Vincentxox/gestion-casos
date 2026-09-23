-- Pruebas de solicitudes de acceso con código de empresa y del resumen del Inicio.
-- Se ejecutan después de 10_business_model_test.sql, sobre los mismos datos.

\set ON_ERROR_STOP 1
\set QUIET 1

-- ---------------------------------------------------------------------------
-- 1. Código de empresa
-- ---------------------------------------------------------------------------

select test.ok(
  (select bool_and(join_code ~ '^[A-HJ-KM-NP-Z2-9]{4}-[A-HJ-KM-NP-Z2-9]{4}$') from public.organizations),
  'cada empresa tiene un código XXXX-XXXX sin caracteres ambiguos'
);
select test.ok(
  (select count(distinct join_code) = count(*) from public.organizations),
  'los códigos son únicos'
);

select test.login('admin');
set role authenticated;
select test.set('code_a', public.get_organization_join_code());
select test.throws(
  $$select join_code from public.organizations$$,
  'permission denied',
  'el código no se lee directamente de la tabla'
);
select test.ok(
  (select name from public.organizations) is not null,
  'el nombre de la empresa sigue siendo legible'
);
reset role;
select test.ok(
  test.get('code_a') = (select join_code from public.organizations where id = test.get('org_a')::uuid),
  'el administrador obtiene el código de su empresa'
);

select test.login('sol1');
set role authenticated;
select test.throws($$select public.get_organization_join_code()$$, 'acceso denegado',
  'un solicitante no obtiene el código');
select test.throws($$select public.regenerate_organization_join_code()$$, 'acceso denegado',
  'un solicitante no regenera el código');
reset role;

-- ---------------------------------------------------------------------------
-- 2. Solicitud, aprobación y aislamiento
-- ---------------------------------------------------------------------------

select test.login('outsider');
set role authenticated;
select test.ok(
  public.request_organization_access('ZZZZ-ZZZZ') ->> 'status' = 'codigo_invalido',
  'un código inexistente responde codigo_invalido'
);
select test.ok(
  (select public.request_organization_access(lower(replace(test.get('code_a'), '-', ' ')))) ->> 'organization_name'
    = 'Organización inicial',
  'el código se acepta sin guion y en minúsculas, y devuelve el nombre de la empresa'
);
select test.throws(
  format($$select public.request_organization_access(%L)$$, test.get('code_a')),
  'ya tienes una solicitud pendiente',
  'solo una solicitud pendiente por persona'
);
select test.ok(
  (select status = 'pendiente' and organization_name = 'Organización inicial'
   from public.get_my_access_request()),
  'la persona ve el estado de su solicitud'
);
select test.ok(
  (select count(*) from public.organizations) = 0,
  'solicitar acceso no da acceso a los datos de la empresa'
);
select test.throws(
  $$update public.organization_access_requests set status = 'aprobada'$$,
  'permission denied',
  'nadie se aprueba a sí mismo con UPDATE directo'
);
reset role;

select test.set('request_outsider', (
  select id::text from public.organization_access_requests
  where user_id = test.uid('outsider') and status = 'pendiente'
));

select test.login('sol1');
set role authenticated;
select test.ok((select count(*) from public.organization_access_requests) = 0,
  'un solicitante no ve las solicitudes de acceso de su empresa');
select test.throws(
  format($$select public.approve_access_request(%L, 'solicitante', null)$$, test.get('request_outsider')),
  'acceso denegado',
  'un solicitante no aprueba solicitudes'
);
reset role;

select test.login('admin_b');
set role authenticated;
select test.ok((select count(*) from public.organization_access_requests) = 0,
  'el administrador de otra empresa no ve la solicitud');
select test.throws(
  format($$select public.approve_access_request(%L, 'solicitante', null)$$, test.get('request_outsider')),
  'no encontrada',
  'el administrador de otra empresa no la aprueba'
);
reset role;

select test.login('admin');
set role authenticated;
select test.ok(
  (select count(*) = 1 and bool_and(email = 'outsider@x.test' and full_name = 'Otto Sin Empresa')
   from public.organization_access_requests where status = 'pendiente'),
  'el administrador ve la solicitud con nombre y correo'
);
select test.throws(
  format($$select public.approve_access_request(%L, 'tecnico', %L)$$,
         test.get('request_outsider'), test.get('area_admin')),
  'área técnica',
  'la aprobación valida rol y área'
);
select public.approve_access_request(test.get('request_outsider')::uuid, 'tecnico', test.get('area_mant')::uuid);
select test.ok(
  (select status = 'aprobada' and decided_by = test.uid('admin') and assigned_role = 'tecnico'
   from public.organization_access_requests where id = test.get('request_outsider')::uuid),
  'la solicitud queda aprobada con quién decidió y el rol asignado'
);
select test.throws(
  format($$select public.approve_access_request(%L, 'tecnico', %L)$$,
         test.get('request_outsider'), test.get('area_mant')),
  'ya no está pendiente',
  'no se aprueba dos veces'
);
reset role;

select test.ok(
  (select organization_id = test.get('org_a')::uuid and role = 'tecnico' and area_id = test.get('area_mant')::uuid
   from public.profiles where id = test.uid('outsider')),
  'al aprobar, la persona entra con el rol y el área elegidos'
);

select test.login('outsider');
set role authenticated;
select test.throws(
  format($$select public.request_organization_access(%L)$$, test.get('code_a')),
  'ya pertenece a una empresa',
  'un miembro no puede solicitar acceso'
);
reset role;

-- ---------------------------------------------------------------------------
-- 3. Rechazo, cancelación, correo sin confirmar e invitación
-- ---------------------------------------------------------------------------

select test.register('pedro', 'pedro@x.test', 'Pedro Pendiente');
select test.register('carla', 'carla@x.test', 'Carla Cancela');
select test.register('nina', 'nina@x.test', 'Nina Invitada');
select test.register('sinconf', 'sinconf@x.test', 'Sin Confirmar', false);

select test.login('sinconf');
set role authenticated;
select test.throws(
  format($$select public.request_organization_access(%L)$$, test.get('code_a')),
  'confirma tu correo',
  'se exige correo confirmado'
);
reset role;

select test.login('pedro');
set role authenticated;
select public.request_organization_access(test.get('code_a'));
reset role;
select test.login('admin');
set role authenticated;
select test.throws(
  format($$select public.reject_access_request(%L, 'no')$$,
         (select id from public.organization_access_requests where user_id = test.uid('pedro'))),
  'entre 3 y 300',
  'el motivo de rechazo respeta la longitud'
);
select public.reject_access_request(
  (select id from public.organization_access_requests where user_id = test.uid('pedro')),
  'No pertenece a la empresa'
);
reset role;
select test.login('pedro');
set role authenticated;
select test.ok(
  (select status = 'rechazada' and decision_note = 'No pertenece a la empresa'
   from public.get_my_access_request()),
  'la persona ve el rechazo y su motivo'
);
select test.ok(
  public.request_organization_access(test.get('code_a')) ->> 'status' = 'pendiente',
  'tras un rechazo se puede volver a solicitar'
);
reset role;

select test.login('carla');
set role authenticated;
select public.request_organization_access(test.get('code_a'));
select public.cancel_my_access_request();
select test.ok(
  (select status = 'cancelada' from public.get_my_access_request()),
  'la persona cancela su solicitud'
);
select test.throws($$select public.cancel_my_access_request()$$, 'no tienes una solicitud pendiente',
  'no se cancela dos veces');
reset role;

select test.login('nina');
set role authenticated;
select public.request_organization_access(test.get('code_a'));
reset role;
select test.login('admin');
set role authenticated;
insert into public.organization_invitations (email, role, area_id)
values ('nina@x.test', 'solicitante', test.get('area_rrhh')::uuid);
reset role;
select test.ok(
  (select organization_id = test.get('org_a')::uuid from public.profiles where id = test.uid('nina')),
  'la invitación vincula a quien tenía una solicitud pendiente'
);
select test.ok(
  (select status = 'cancelada' from public.organization_access_requests where user_id = test.uid('nina')),
  'y su solicitud pendiente queda cancelada'
);

-- ---------------------------------------------------------------------------
-- 4. Límite de intentos y regeneración del código
-- ---------------------------------------------------------------------------

select test.register('curioso', 'curioso@x.test', 'Curioso');
select test.login('curioso');
set role authenticated;
select public.request_organization_access('AAAA-AAA' || n) from generate_series(1, 10) as n;
select test.ok(
  public.request_organization_access(test.get('code_a')) ->> 'status' = 'demasiados_intentos',
  'tras 10 códigos inválidos en una hora se bloquean los intentos, incluso con un código válido'
);
reset role;

select test.login('admin');
set role authenticated;
select test.set('code_a_new', public.regenerate_organization_join_code());
select test.ok(test.get('code_a_new') <> test.get('code_a'), 'el administrador regenera el código');
reset role;
select test.register('tardio', 'tardio@x.test', 'Tardío');
select test.login('tardio');
set role authenticated;
select test.ok(
  public.request_organization_access(test.get('code_a')) ->> 'status' = 'codigo_invalido',
  'el código anterior deja de servir'
);
reset role;

-- ---------------------------------------------------------------------------
-- 5. Resumen del Inicio por rol
-- ---------------------------------------------------------------------------

select test.login('outsider');
set role authenticated;
select test.set('home_tec', public.get_home_summary()::text);
reset role;
select test.ok(
  (test.get('home_tec')::jsonb -> 'admin') = 'null'::jsonb
    and (test.get('home_tec')::jsonb ->> 'role') = 'tecnico',
  'un técnico no recibe la sección de administración'
);

select test.login('tec1');
set role authenticated;
select test.ok(
  (public.get_home_summary() -> 'mine' ->> 'trabajos_en_ejecucion')::int = 1,
  'el técnico ve su trabajo en ejecución'
);
reset role;

select test.login('sol1');
set role authenticated;
insert into public.cases (title, description, location, category_id)
values ('Fuga en el baño', 'El lavamanos gotea todo el día', 'Baño piso 1', test.get('cat_elec')::uuid);
select test.ok(
  (public.get_home_summary() -> 'mine' ->> 'solicitudes_activas')::int = 2,
  'el solicitante ve sus solicitudes activas'
);
select test.ok(
  (public.get_home_summary() -> 'inbox' ->> 'por_aceptar')::int = 0,
  'un solicitante no tiene bandeja por aceptar'
);
reset role;

select test.login('jefe_tec');
set role authenticated;
select test.ok(
  (public.get_home_summary() -> 'inbox' ->> 'por_aceptar')::int = 1,
  'el jefe técnico ve lo que tiene por aceptar en su área'
);
reset role;

select test.login('tec2');
set role authenticated;
select test.ok(
  (public.get_home_summary() -> 'cases' ->> 'activas')::int = 0,
  'un técnico de otra área no cuenta solicitudes que no ve'
);
reset role;

select test.login('admin');
set role authenticated;
select test.set('home_admin', public.get_home_summary()::text);
reset role;
select test.ok(
  (test.get('home_admin')::jsonb -> 'admin' -> 'areas_tecnicas_sin_jefe') = '["Tecnología"]'::jsonb,
  'el administrador ve qué áreas técnicas no tienen jefe'
);
select test.ok(
  (test.get('home_admin')::jsonb -> 'admin' ->> 'solicitudes_acceso_pendientes')::int = 1,
  'el administrador ve las solicitudes de acceso pendientes'
);
select test.ok(
  (test.get('home_admin')::jsonb -> 'inbox' ->> 'por_aceptar')::int = 1,
  'el administrador ve lo que está por aceptar en la empresa'
);

select test.login('admin_b');
set role authenticated;
select test.ok(
  (public.get_home_summary() -> 'admin' ->> 'solicitudes_acceso_pendientes')::int = 0,
  'el resumen de otra empresa no cuenta solicitudes ajenas'
);
reset role;

select test.login('curioso');
set role authenticated;
select test.throws($$select public.get_home_summary()$$, 'no está vinculada',
  'sin empresa no hay resumen');
reset role;

set role anon;
select test.throws($$select public.request_organization_access('AAAA-AAAA')$$, 'permission denied',
  'anon no solicita acceso');
select test.throws($$select public.get_home_summary()$$, 'permission denied',
  'anon no obtiene el resumen');
reset role;

\echo 'Todas las pruebas de acceso e Inicio pasaron.'
