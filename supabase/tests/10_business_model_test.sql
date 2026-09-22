-- Pruebas del modelo de negocio: multiempresa, invitaciones, roles, flujo de solicitudes
-- y recursos. Se ejecutan con scripts/test-supabase-migrations.sh sobre un PostgreSQL
-- local; nunca contra el proyecto remoto.

\set ON_ERROR_STOP 1
\set QUIET 1

-- ---------------------------------------------------------------------------
-- Utilidades de prueba
-- ---------------------------------------------------------------------------

create schema test;
grant usage on schema test to authenticated, anon;

create table test.users (name text primary key, id uuid not null);
create table test.vars (key text primary key, value text not null);
grant select on test.users to authenticated, anon;
grant select, insert, update on test.vars to authenticated;
grant select on test.vars to anon;

create function test.uid(user_name text) returns uuid language sql stable
as $$ select id from test.users where name = user_name $$;

create function test.login(user_name text) returns void language plpgsql
as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(test.uid(user_name)::text, ''), false);
end;
$$;

create function test.ok(condition boolean, description text) returns void language plpgsql
as $$
begin
  if condition is distinct from true then
    raise exception 'FALLÓ: %', description;
  end if;
  raise notice 'ok - %', description;
end;
$$;

create function test.throws(statement text, expected text, description text)
returns void language plpgsql
as $$
begin
  begin
    execute statement;
  exception when others then
    if position(lower(expected) in lower(sqlerrm)) = 0 then
      raise exception 'FALLÓ: % (error inesperado: %)', description, sqlerrm;
    end if;
    raise notice 'ok - %', description;
    return;
  end;
  raise exception 'FALLÓ: % (no produjo error)', description;
end;
$$;

create function test.set(key_name text, key_value text) returns void language sql
as $$
  insert into test.vars values (key_name, key_value)
  on conflict (key) do update set value = excluded.value;
$$;

create function test.get(key_name text) returns text language sql stable
as $$ select value from test.vars where key = key_name $$;

grant execute on all functions in schema test to authenticated, anon;

-- Usuario nuevo con correo confirmado (sin invitación).
create function test.register(user_name text, user_email text, full_name text, confirmed boolean default true)
returns uuid language plpgsql
as $$
declare
  new_id uuid;
begin
  insert into auth.users (email, email_confirmed_at, raw_user_meta_data)
  values (user_email, case when confirmed then now() end, jsonb_build_object('full_name', full_name))
  returning id into new_id;
  insert into test.users values (user_name, new_id);
  return new_id;
end;
$$;

insert into test.users values
  ('admin', '00000000-0000-0000-0000-00000000a001'),
  ('sol1', '00000000-0000-0000-0000-00000000a002'),
  ('auditor', '00000000-0000-0000-0000-00000000a003');

-- ---------------------------------------------------------------------------
-- 1. Migración de datos existentes
-- ---------------------------------------------------------------------------

select test.ok(
  (select count(*) from public.organizations) = 1,
  'se crea una empresa inicial'
);
select test.ok(
  (select count(*) from public.profiles where organization_id is null) = 0,
  'todos los perfiles existentes quedan en la empresa inicial'
);
select test.ok(
  (select role from public.profiles where id = test.uid('sol1')) = 'solicitante',
  'visualizador pasa a solicitante'
);
select test.ok(
  (select count(*) from public.categories c join public.areas a on a.id = c.area_id
   where a.kind <> 'tecnica') = 0,
  'solo quedan tipos de servicio en áreas técnicas'
);
select test.ok(
  (select count(*) from public.categories) = 6,
  'se conservan los 6 tipos de servicio de Tecnología y Mantenimiento'
);
select test.ok(
  (select count(*) from public.cases) = 0,
  'los casos del modelo anterior se descartan'
);
select test.ok(
  (select column_default from information_schema.columns
   where table_schema = 'public' and table_name = 'profiles' and column_name = 'role')
  like '%solicitante%',
  'el rol por defecto es solicitante'
);

select test.set('org_a', (select id::text from public.organizations));
select test.set('area_admin', (select id::text from public.areas where name = 'Administración'));
select test.set('area_rrhh', (select id::text from public.areas where name = 'Recursos Humanos'));
select test.set('area_mant', (select id::text from public.areas where name = 'Mantenimiento'));
select test.set('area_tec', (select id::text from public.areas where name = 'Tecnología'));
select test.set('cat_elec', (select id::text from public.categories where name = 'Electricidad'));
select test.set('cat_red', (select id::text from public.categories where name = 'Conectividad'));

-- ---------------------------------------------------------------------------
-- 2. Usuarios sin empresa e invitaciones
-- ---------------------------------------------------------------------------

select test.register('jefe_tec', 'jefe.tec@a.test', 'Julia Jefa Técnica');
select test.register('tec1', 'tec1@a.test', 'Tomás Técnico');
select test.register('tec2', 'tec2@a.test', 'Teresa Técnica TI');
select test.register('jefe_sol', 'jefe.sol@a.test', 'Javier Jefe Administración');
select test.register('sol2', 'sol2@a.test', 'Sara Solicitante RRHH');
select test.register('outsider', 'outsider@x.test', 'Otto Sin Empresa');

select test.ok(
  (select organization_id from public.profiles where id = test.uid('outsider')) is null,
  'un usuario registrado sin invitación queda sin empresa'
);

select test.login('outsider');
set role authenticated;
select test.ok((select count(*) from public.areas) = 0, 'sin empresa no ve áreas');
select test.ok((select count(*) from public.categories) = 0, 'sin empresa no ve tipos de servicio');
select test.ok((select count(*) from public.profiles) = 1, 'sin empresa solo ve su propio perfil');
select test.throws(
  format($$insert into public.cases (title, description, location, category_id)
           values ('Fuga de agua', 'Hay una fuga en el baño', 'Piso 2', %L)$$, test.get('cat_elec')),
  'no está vinculada a una empresa',
  'sin empresa no puede crear solicitudes'
);
select test.ok(public.accept_pending_invitation() = false, 'sin invitación no se vincula');
reset role;

-- El administrador invita a usuarios que ya tienen cuenta: se vinculan de inmediato.
select test.login('admin');
set role authenticated;
insert into public.organization_invitations (email, role, area_id) values
  ('JEFE.TEC@a.test ', 'jefe_area', test.get('area_mant')::uuid),
  ('tec1@a.test', 'tecnico', test.get('area_mant')::uuid),
  ('tec2@a.test', 'tecnico', test.get('area_tec')::uuid),
  ('jefe.sol@a.test', 'jefe_area', test.get('area_admin')::uuid),
  ('sol2@a.test', 'solicitante', test.get('area_rrhh')::uuid);
select test.ok(
  (select count(*) from public.organization_invitations where accepted_at is not null) = 5,
  'las invitaciones a cuentas existentes se aceptan al crearse'
);
select test.throws(
  format($$insert into public.organization_invitations (email, role, area_id)
           values ('nuevo.tec@a.test', 'tecnico', %L)$$, test.get('area_admin')),
  'área técnica',
  'no se invita a un técnico en un área solicitante'
);
select test.throws(
  $$insert into public.organization_invitations (email, role) values ('jefe.sin.area@a.test', 'jefe_area')$$,
  'requiere un área',
  'un jefe de área requiere área'
);
insert into public.organization_invitations (email, role, area_id)
values ('nuevo.tec@a.test', 'tecnico', test.get('area_mant')::uuid);
insert into public.organization_invitations (email) values ('revocar@a.test');
update public.organization_invitations set revoked_at = now() where email = 'revocar@a.test';
select test.ok(
  (select revoked_at is not null from public.organization_invitations where email = 'revocar@a.test'),
  'el administrador revoca una invitación pendiente'
);
select test.throws(
  $$update public.organization_invitations set revoked_at = now() where email = 'revocar@a.test'$$,
  'ya no está pendiente',
  'no se revoca dos veces'
);
select test.throws(
  $$update public.organization_invitations set email = 'otro@a.test' where email = 'nuevo.tec@a.test'$$,
  'permission denied',
  'no se edita el correo de una invitación'
);
reset role;

select test.ok(
  (select role = 'tecnico' and area_id = test.get('area_mant')::uuid
   from public.profiles where id = test.uid('tec1')),
  'el invitado recibe rol y área de la invitación'
);

-- Registro con confirmación de correo posterior.
select test.register('tec3', 'nuevo.tec@a.test', 'Nora Nueva', false);
select test.ok(
  (select organization_id is null from public.profiles where id = test.uid('tec3')),
  'sin correo confirmado no se vincula'
);
update auth.users set email_confirmed_at = now() where id = test.uid('tec3');
select test.ok(
  (select organization_id = test.get('org_a')::uuid and role = 'tecnico'
   from public.profiles where id = test.uid('tec3')),
  'al confirmar el correo se vincula con la invitación'
);

select test.login('sol1');
set role authenticated;
select test.ok((select count(*) from public.organization_invitations) = 0, 'un solicitante no ve invitaciones');
select test.throws(
  $$insert into public.organization_invitations (email) values ('x@a.test')$$,
  'row-level security',
  'un solicitante no invita'
);
reset role;

-- ---------------------------------------------------------------------------
-- 3. Administración de miembros
-- ---------------------------------------------------------------------------

select test.login('sol1');
set role authenticated;
select test.throws(
  format($$select public.set_member_access(%L, 'administrador', null)$$, test.uid('sol1')),
  'acceso denegado',
  'un solicitante no cambia roles'
);
select test.throws(
  format($$update public.profiles set role = 'administrador' where id = %L$$, test.uid('sol1')),
  'solo un administrador',
  'un solicitante no se asigna un rol con UPDATE directo'
);
select test.throws(
  format($$update public.profiles set organization_id = null where id = %L$$, test.uid('sol1')),
  'permission denied',
  'nadie cambia su empresa desde el cliente'
);
update public.profiles set full_name = 'Vera Solicitante' where id = test.uid('sol1');
select test.ok(
  (select full_name from public.profiles where id = test.uid('sol1')) = 'Vera Solicitante',
  'un usuario edita su nombre'
);
select test.ok(
  (select count(*) from public.profiles) = 9,
  'los miembros ven el directorio de su empresa, sin usuarios externos'
);
reset role;

select test.login('admin');
set role authenticated;
select test.throws(
  format($$select public.set_member_access(%L, 'tecnico', %L)$$, test.uid('sol1'), test.get('area_admin')),
  'área técnica',
  'un técnico no puede estar en un área solicitante'
);
select test.throws(
  format($$select public.set_member_access(%L, 'solicitante', null)$$, test.uid('admin')),
  'al menos un administrador',
  'la empresa no se queda sin administrador'
);
select test.throws(
  format($$select public.set_member_access(%L, 'solicitante', null)$$, test.uid('outsider')),
  'usuario no encontrado',
  'el administrador no modifica usuarios de fuera de su empresa'
);
select public.set_member_access(test.uid('auditor'), 'auditor', null);
reset role;

-- ---------------------------------------------------------------------------
-- 4. Catálogos
-- ---------------------------------------------------------------------------

select test.login('admin');
set role authenticated;
select test.throws(
  format($$insert into public.categories (area_id, name) values (%L, 'Papelería')$$, test.get('area_admin')),
  'áreas técnicas',
  'los tipos de servicio solo van en áreas técnicas'
);
select test.throws(
  format($$update public.areas set kind = 'solicitante' where id = %L$$, test.get('area_mant')),
  'tipos de servicio',
  'no cambia el tipo de un área en uso'
);
insert into public.areas (name, kind) values ('Logística', 'solicitante');
select test.ok(
  (select organization_id = test.get('org_a')::uuid from public.areas where name = 'Logística'),
  'un área nueva queda en la empresa del administrador'
);
insert into public.resources (kind, name, unit, unit_cost) values ('material', 'Cable 12 AWG', 'm', 5.50);
insert into public.resources (kind, name) values ('herramienta', 'Taladro');
select test.throws(
  $$insert into public.resources (kind, name) values ('material', 'Cinta aislante')$$,
  'check',
  'un material requiere unidad'
);
select test.set('res_cable', (select id::text from public.resources where name = 'Cable 12 AWG'));
select test.set('res_taladro', (select id::text from public.resources where name = 'Taladro'));
reset role;

select test.login('tec1');
set role authenticated;
select test.throws(
  $$insert into public.resources (kind, name) values ('equipo', 'Escalera')$$,
  'row-level security',
  'un técnico no crea recursos del catálogo'
);
select test.throws(
  $$insert into public.areas (name) values ('Área pirata')$$,
  'row-level security',
  'un técnico no crea áreas'
);
reset role;

-- ---------------------------------------------------------------------------
-- 5. Flujo de una solicitud
-- ---------------------------------------------------------------------------

select test.login('sol1');
set role authenticated;
insert into public.cases (title, description, location, priority, category_id)
values ('  Falla eléctrica en sala  ', 'No hay energía en los tomacorrientes', 'Sala de juntas', 'alta',
        test.get('cat_elec')::uuid);
select test.set('case1', (select id::text from public.cases where title = 'Falla eléctrica en sala'));
select test.ok(
  (select case_number = format('CAS-%s-00001', extract(year from now())::int)
     and status = 'solicitado'
     and requesting_area_id = test.get('area_admin')::uuid
     and target_area_id = test.get('area_mant')::uuid
     and created_by = test.uid('sol1')
   from public.cases where id = test.get('case1')::uuid),
  'la solicitud se crea con número, estado, áreas y creador del servidor'
);
select test.ok(
  (select count(*) from public.case_events where case_id = test.get('case1')::uuid and action = 'crear') = 1,
  'la creación queda en el historial'
);
select test.throws(
  format($$update public.cases set status = 'aprobado' where id = %L$$, test.get('case1')),
  'permission denied',
  'el estado no se cambia con UPDATE directo'
);
select test.throws(
  format($$update public.cases set assigned_to = %L where id = %L$$, test.uid('sol1'), test.get('case1')),
  'permission denied',
  'la asignación no se cambia con UPDATE directo'
);
update public.cases set title = 'Falla eléctrica en la sala' where id = test.get('case1')::uuid;
select test.ok(
  (select title from public.cases where id = test.get('case1')::uuid) = 'Falla eléctrica en la sala',
  'el creador edita su solicitud pendiente'
);
select test.throws(
  format($$select public.transition_case(%L, 'aceptar')$$, test.get('case1')),
  'jefe del área técnica',
  'el solicitante no acepta su solicitud'
);
reset role;

-- Visibilidad
select test.login('sol2');
set role authenticated;
select test.ok((select count(*) from public.cases) = 0, 'otra área solicitante no ve la solicitud');
select test.ok((select count(*) from public.case_events) = 0, 'ni su historial');
reset role;
select test.login('tec2');
set role authenticated;
select test.ok((select count(*) from public.cases) = 0, 'un técnico de otra área técnica no la ve');
reset role;
select test.login('tec1');
set role authenticated;
select test.ok((select count(*) from public.cases) = 1, 'el técnico del área destino la ve');
select test.throws(
  format($$select public.transition_case(%L, 'aceptar')$$, test.get('case1')),
  'jefe del área técnica',
  'un técnico no acepta solicitudes'
);
reset role;
select test.login('jefe_sol');
set role authenticated;
select test.ok((select count(*) from public.cases) = 1, 'el jefe del área solicitante la ve');
reset role;
select test.login('auditor');
set role authenticated;
select test.ok((select count(*) from public.cases) = 1, 'el auditor la ve');
select test.throws(
  format($$insert into public.cases (title, description, location, category_id)
           values ('Revisión general', 'Revisión de auditoría', 'Todo el edificio', %L)$$, test.get('cat_elec')),
  'auditor no puede crear',
  'el auditor no crea solicitudes'
);
reset role;

-- Aceptar y asignar
select test.login('jefe_tec');
set role authenticated;
select public.transition_case(test.get('case1')::uuid, 'aceptar');
select test.throws(
  format($$select public.transition_case(%L, 'asignar', null, %L)$$, test.get('case1'), test.uid('tec2')),
  'área técnica de la solicitud',
  'no se asigna a un técnico de otra área'
);
select test.throws(
  format($$select public.transition_case(%L, 'asignar')$$, test.get('case1')),
  'selecciona un técnico',
  'asignar requiere técnico'
);
select public.transition_case(test.get('case1')::uuid, 'asignar', null, test.uid('jefe_tec'));
select public.transition_case(test.get('case1')::uuid, 'asignar', 'Tomás tiene disponibilidad', test.uid('tec1'));
select test.ok(
  (select array_agg(action::text order by id) from public.case_events where case_id = test.get('case1')::uuid)
    = array['crear', 'aceptar', 'asignar', 'reasignar'],
  'aceptar, asignar y reasignar quedan en el historial'
);
update public.cases set priority = 'media' where id = test.get('case1')::uuid;
select test.ok(
  (select priority from public.cases where id = test.get('case1')::uuid) = 'media',
  'el jefe técnico ajusta la prioridad'
);
select test.throws(
  format($$select public.transition_case(%L, 'iniciar')$$, test.get('case1')),
  'técnico asignado',
  'solo el técnico asignado inicia'
);
reset role;

select test.login('sol1');
set role authenticated;
update public.cases set title = 'Intento de cambio' where id = test.get('case1')::uuid;
select test.ok(
  (select title from public.cases where id = test.get('case1')::uuid) = 'Falla eléctrica en la sala',
  'el creador ya no edita una solicitud aceptada'
);
select test.throws(
  format($$select public.transition_case(%L, 'cancelar')$$, test.get('case1')),
  'pendiente',
  'no se cancela una solicitud aceptada'
);
reset role;

-- Ejecución y recursos
select test.login('tec1');
set role authenticated;
select test.throws(
  format($$insert into public.case_resource_usages (case_id, kind, resource_id, quantity)
           values (%L, 'recurso', %L, 10)$$, test.get('case1'), test.get('res_cable')),
  'row-level security',
  'no se registran recursos antes de iniciar'
);
select public.transition_case(test.get('case1')::uuid, 'iniciar');
insert into public.case_resource_usages (case_id, kind, resource_id, quantity, notes)
values (test.get('case1')::uuid, 'recurso', test.get('res_cable')::uuid, 10, 'Cambio de cableado');
insert into public.case_resource_usages (case_id, kind, resource_id, hours)
values (test.get('case1')::uuid, 'recurso', test.get('res_taladro')::uuid, 1.5);
insert into public.case_resource_usages (case_id, kind, technician_id, hours)
values (test.get('case1')::uuid, 'mano_de_obra', test.uid('tec1'), 2);
select test.ok(
  (select resource_name = 'Cable 12 AWG' and unit = 'm' and unit_cost = 5.50 and registered_by = test.uid('tec1')
   from public.case_resource_usages where resource_id = test.get('res_cable')::uuid),
  'el registro guarda copia del recurso y quién lo registró'
);
select test.throws(
  format($$insert into public.case_resource_usages (case_id, kind, resource_id)
           values (%L, 'recurso', %L)$$, test.get('case1'), test.get('res_cable')),
  'cantidad',
  'un material requiere cantidad'
);
select test.throws(
  format($$insert into public.case_resource_usages (case_id, kind, technician_id, hours)
           values (%L, 'mano_de_obra', %L, 1)$$, test.get('case1'), test.uid('sol1')),
  'área técnica de la solicitud',
  'la mano de obra es de técnicos del área destino'
);
update public.case_resource_usages set quantity = 12 where resource_id = test.get('res_cable')::uuid;
select test.throws(
  format($$update public.case_resource_usages set resource_id = %L where resource_id = %L$$,
         test.get('res_taladro'), test.get('res_cable')),
  'permission denied',
  'no se cambia el recurso de un registro'
);
select test.throws(
  format($$select public.transition_case(%L, 'pausar')$$, test.get('case1')),
  'motivo de la pausa',
  'pausar requiere motivo'
);
select public.transition_case(test.get('case1')::uuid, 'pausar', 'Esperando repuesto');
select public.transition_case(test.get('case1')::uuid, 'reanudar');
select test.throws(
  format($$select public.transition_case(%L, 'enviar_reporte')$$, test.get('case1')),
  'acción no disponible',
  'las acciones del reporte aún no están disponibles'
);
select test.throws(
  format($$update public.cases set status = 'aprobado' where id = %L$$, test.get('case1')),
  'permission denied',
  'el técnico no cambia el estado directamente'
);
reset role;

select test.login('sol1');
set role authenticated;
select test.ok(
  (select count(*) from public.case_resource_usages where case_id = test.get('case1')::uuid) = 3,
  'el solicitante ve los recursos usados en su solicitud'
);
select test.throws(
  format($$insert into public.case_resource_usages (case_id, kind, technician_id, hours)
           values (%L, 'mano_de_obra', %L, 1)$$, test.get('case1'), test.uid('tec1')),
  'row-level security',
  'el solicitante no registra recursos'
);
delete from public.case_resource_usages where case_id = test.get('case1')::uuid;
select test.ok(
  (select count(*) from public.case_resource_usages where case_id = test.get('case1')::uuid) = 3,
  'el solicitante no borra registros'
);
reset role;

select test.login('sol2');
set role authenticated;
select test.ok((select count(*) from public.case_resource_usages) = 0, 'otra área no ve los recursos');
reset role;

-- Rechazo y cancelación
select test.login('sol1');
set role authenticated;
insert into public.cases (title, description, location, category_id)
values ('Sin internet en recepción', 'La red no funciona desde ayer', 'Recepción', test.get('cat_red')::uuid);
insert into public.cases (title, description, location, category_id)
values ('Lámpara fundida', 'Una lámpara del pasillo no enciende', 'Pasillo 3', test.get('cat_elec')::uuid);
select test.set('case2', (select id::text from public.cases where title = 'Sin internet en recepción'));
select test.set('case3', (select id::text from public.cases where title = 'Lámpara fundida'));
select test.ok(
  (select target_area_id = test.get('area_tec')::uuid from public.cases where id = test.get('case2')::uuid),
  'el área destino sale del tipo de servicio'
);
select test.ok(
  (select case_number from public.cases where id = test.get('case3')::uuid)
    = format('CAS-%s-00003', extract(year from now())::int),
  'la numeración es consecutiva por empresa'
);
select public.transition_case(test.get('case3')::uuid, 'cancelar', 'Ya se resolvió');
reset role;

select test.login('tec2');
set role authenticated;
select test.ok((select count(*) from public.cases) = 1, 'el técnico de TI ve solo lo de su área');
reset role;

select test.login('admin');
set role authenticated;
select test.throws(
  format($$select public.transition_case(%L, 'rechazar')$$, test.get('case2')),
  'motivo del rechazo',
  'rechazar requiere motivo'
);
select public.transition_case(test.get('case2')::uuid, 'rechazar', 'Lo atiende el proveedor externo');
select test.ok(
  (select status = 'rechazado' and closed_at is not null from public.cases where id = test.get('case2')::uuid),
  'la solicitud rechazada queda cerrada'
);
update public.cases set title = 'Cambio tardío' where id = test.get('case2')::uuid;
select test.ok(
  (select title from public.cases where id = test.get('case2')::uuid) = 'Sin internet en recepción',
  'una solicitud cerrada no se edita'
);
reset role;

-- ---------------------------------------------------------------------------
-- 6. Aislamiento entre empresas
-- ---------------------------------------------------------------------------

select test.set('org_b', private.create_organization('Empresa B', 'admin@b.test')::text);
select test.register('admin_b', 'admin@b.test', 'Bruno Admin B');
select test.ok(
  (select organization_id = test.get('org_b')::uuid and role = 'administrador'
   from public.profiles where id = test.uid('admin_b')),
  'el administrador de una empresa nueva se vincula al registrarse'
);

select test.login('admin_b');
set role authenticated;
insert into public.areas (name, kind) values ('Mantenimiento', 'tecnica'), ('Operaciones', 'solicitante');
insert into public.categories (area_id, name)
select id, 'Electricidad' from public.areas where name = 'Mantenimiento';
select public.set_member_access(test.uid('admin_b'), 'administrador',
  (select id from public.areas where name = 'Operaciones'));
insert into public.cases (title, description, location, category_id)
select 'Falla en planta B', 'Falla eléctrica en la planta', 'Planta B', id from public.categories;
insert into public.resources (kind, name) values ('equipo', 'Escalera B');
select test.set('case_b', (select id::text from public.cases));
select test.set('cat_b', (select id::text from public.categories));
select test.ok(
  (select case_number from public.cases) = format('CAS-%s-00001', extract(year from now())::int),
  'cada empresa tiene su propia numeración'
);
select test.ok((select count(*) from public.profiles) = 1, 'la empresa B no ve perfiles de A');
select test.ok((select count(*) from public.areas) = 2, 'la empresa B solo ve sus áreas');
select test.throws(
  format($$select public.set_member_access(%L, 'solicitante', null)$$, test.uid('sol1')),
  'usuario no encontrado',
  'el administrador de B no modifica usuarios de A'
);
select test.throws(
  format($$select public.transition_case(%L, 'pausar', 'Intento externo')$$, test.get('case1')),
  'no encontrada',
  'el administrador de B no opera solicitudes de A'
);
reset role;

select test.login('admin');
set role authenticated;
select test.ok((select count(*) from public.cases where id = test.get('case_b')::uuid) = 0, 'A no ve solicitudes de B');
select test.ok((select count(*) from public.categories where id = test.get('cat_b')::uuid) = 0, 'A no ve tipos de servicio de B');
select test.ok((select count(*) from public.resources where name = 'Escalera B') = 0, 'A no ve recursos de B');
select test.ok((select count(*) from public.organizations) = 1, 'A solo ve su empresa');
select test.ok((select count(*) from public.organization_invitations where organization_id = test.get('org_b')::uuid) = 0,
  'A no ve invitaciones de B');
reset role;
select test.login('sol1');
set role authenticated;
select test.throws(
  format($$insert into public.cases (title, description, location, category_id)
           values ('Intento cruzado', 'Usar un tipo de servicio de otra empresa', 'Oficina', %L)$$, test.get('cat_b')),
  'tipo de servicio disponible',
  'A no crea solicitudes con tipos de servicio de B'
);
reset role;
select test.login('admin');
set role authenticated;
select test.throws(
  format($$select public.transition_case(%L, 'aceptar')$$, test.get('case_b')),
  'no encontrada',
  'A no acepta solicitudes de B'
);
update public.cases set title = 'Hackeado' where id = test.get('case_b')::uuid;
update public.organizations set name = 'Hackeada' where id = test.get('org_b')::uuid;
reset role;
select test.ok((select title from public.cases where id = test.get('case_b')::uuid) = 'Falla en planta B',
  'A no edita solicitudes de B');
select test.ok((select name from public.organizations where id = test.get('org_b')::uuid) = 'Empresa B',
  'A no renombra la empresa B');

-- ---------------------------------------------------------------------------
-- 7. Acceso anónimo
-- ---------------------------------------------------------------------------

select test.login('outsider');
set role anon;
select test.throws($$select count(*) from public.cases$$, 'permission denied', 'anon no lee solicitudes');
select test.throws($$select count(*) from public.profiles$$, 'permission denied', 'anon no lee perfiles');
select test.throws(
  format($$select public.transition_case(%L, 'aceptar')$$, test.get('case1')),
  'permission denied',
  'anon no ejecuta transiciones'
);
reset role;

\echo 'Todas las pruebas del modelo de negocio pasaron.'
