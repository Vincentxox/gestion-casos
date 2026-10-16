-- Pruebas: empresa inactiva sin acceso (docs/BUSINESS_RULES.md 2.3, hallazgo D-5).
-- Usa la Empresa C de las pruebas 20 y 22, la desactiva y la vuelve a activar al final.

\set ON_ERROR_STOP 1
\set QUIET 1

select test.register('nuevo_c', 'nuevo@c.test', 'Nicolás Nuevo');
select test.set('c_join_code', (select join_code from public.organizations
  where id = test.get('org_c')::uuid));
select test.set('c_cases', (select count(*)::text from public.cases
  where organization_id = test.get('org_c')::uuid));
select test.set('a_cases_admin', (select count(*)::text from public.cases
  where organization_id = test.get('org_a')::uuid));

select test.ok(
  (select status = 'asignado' and assigned_to = test.uid('tec_c2')
   from public.cases where id = test.get('c_case_assigned')::uuid)
  and test.get('c_cases')::integer >= 4,
  'la Empresa C está en el estado que esperan estas pruebas'
);

select test.login('admin_c');
set role authenticated;
select test.ok(
  (select count(*) from public.cases) = test.get('c_cases')::integer
  and (select private.is_admin()),
  'con la empresa activa, su administrador ve todos sus casos'
);
reset role;

-- La plataforma desactiva la empresa (sin usuario autenticado).
select test.login('nadie');
update public.organizations set is_active = false where id = test.get('org_c')::uuid;

-- ---------------------------------------------------------------------------
-- 1. Lectura
-- ---------------------------------------------------------------------------

select test.login('admin_c');
set role authenticated;
select test.ok(
  (select private.current_organization_id()) is null
  and (select private.current_app_role()) is null
  and not (select private.is_admin())
  and not (select private.has_role('administrador')),
  'los helpers tratan al miembro de una empresa inactiva como a alguien sin empresa'
);
select test.ok(
  (select count(*) from public.cases) = 0
  and (select count(*) from public.case_events) = 0
  and (select count(*) from public.areas) = 0
  and (select count(*) from public.categories) = 0
  and (select count(*) from public.resources) = 0
  and (select count(*) from public.notifications) = 0
  and (select count(*) from public.priority_targets) = 0
  and (select count(*) from public.former_members) = 0
  and (select count(*) from public.organization_invitations) = 0,
  'el administrador no ve casos, historial, catálogos, avisos ni invitaciones'
);
select test.ok(
  (select count(*) from public.profiles) = 1
  and (select organization_id = test.get('org_c')::uuid and role = 'administrador'
       from public.profiles where id = test.uid('admin_c')),
  'solo ve su propio perfil, que conserva empresa y rol'
);
select test.ok(
  (select count(*) = 1 and bool_and(not is_active and name = 'Empresa C')
   from public.organizations),
  've el nombre y el estado de su empresa, para que la app le explique el bloqueo'
);
select test.ok(
  (select count(*) from public.search_cases()) = 0
  and (select count(*) from public.count_cases_by_status()) = 0,
  'la búsqueda y los contadores no devuelven nada'
);
reset role;

select test.login('tec_c2');
set role authenticated;
select test.ok(
  (select count(*) from public.cases) = 0
  and (select count(*) from public.case_signatures) = 0
  and (select count(*) from public.case_report_versions) = 0,
  'el técnico tampoco ve sus trabajos, firmas ni reportes'
);
reset role;

-- ---------------------------------------------------------------------------
-- 2. Escritura, también mediante RPC
-- ---------------------------------------------------------------------------

select test.login('sol_c');
set role authenticated;
select test.throws(
  format($$insert into public.cases (title, description, category_id, location, priority)
           values ('Fuga de agua', 'Hay una fuga en el baño', %L, 'Baño', 'media')$$,
         test.get('cat_c')),
  'Tu empresa está inactiva',
  'un solicitante no crea solicitudes'
);
select test.throws(
  $$update public.profiles set full_name = 'Sofía C' where id = auth.uid()$$,
  'Tu empresa está inactiva',
  'nadie cambia su perfil mientras la empresa está inactiva'
);
reset role;

select test.login('jefe_c');
set role authenticated;
select test.throws(
  format($$select public.transition_case(%L, 'asignar', 'Cambio', %L)$$,
         test.get('c_case_assigned'), test.uid('tec_c')),
  'Tu empresa está inactiva',
  'el jefe técnico no reasigna, aunque la RPC lea el perfil directamente'
);
reset role;

select test.login('tec_c2');
set role authenticated;
select test.throws(
  format($$select public.transition_case(%L, 'iniciar')$$, test.get('c_case_assigned')),
  'Tu empresa está inactiva',
  'el técnico no inicia su trabajo'
);
select test.throws(
  $$select public.mark_notifications_read(null)$$,
  'Tu empresa está inactiva',
  'no marca avisos como leídos'
);
reset role;

select test.login('admin_c');
set role authenticated;
select test.throws(
  format($$select public.deactivate_member(%L)$$, test.uid('tec_c')),
  'Acceso denegado',
  'el administrador no da de baja miembros'
);
select test.throws(
  format($$select public.set_member_access(%L, 'tecnico', null)$$, test.uid('sol_c')),
  'Acceso denegado',
  'el administrador no cambia roles'
);
select test.throws(
  $$select public.get_organization_join_code()$$,
  'Acceso denegado',
  'el administrador no ve el código de acceso'
);
select test.throws(
  $$insert into public.organization_invitations (email, role) values ('nueva@c.test', 'solicitante')$$,
  'row-level security',
  'el administrador no invita'
);
select test.throws(
  $$update public.organizations set is_active = true$$,
  'permission denied',
  'el administrador no puede reactivar su empresa'
);
update public.organizations set name = 'Empresa C renombrada';
reset role;

select test.ok(
  (select name = 'Empresa C' and not is_active
   from public.organizations where id = test.get('org_c')::uuid),
  'el administrador no renombra su empresa'
);

select test.login('nuevo_c');
set role authenticated;
select test.ok(
  public.request_organization_access(test.get('c_join_code'))->>'status' = 'codigo_invalido',
  'el código de una empresa inactiva no sirve para pedir acceso'
);
reset role;

-- ---------------------------------------------------------------------------
-- 3. Lo que no cambia
-- ---------------------------------------------------------------------------

select test.login('admin');
set role authenticated;
select test.ok(
  (select private.is_admin())
  and (select count(*) from public.cases) = test.get('a_cases_admin')::integer
  and (select count(*) from public.organizations) = 1,
  'las demás empresas siguen igual y no ven la empresa inactiva'
);
reset role;

-- Tareas del servidor (sin usuario autenticado): no se bloquean.
select test.login('nadie');
update public.notifications set read_at = coalesce(read_at, now())
where organization_id = test.get('org_c')::uuid;
select test.ok(
  not exists (select 1 from public.notifications
              where organization_id = test.get('org_c')::uuid and read_at is null),
  'las tareas del servidor siguen funcionando'
);
select test.ok(
  (select count(*) from public.cases where organization_id = test.get('org_c')::uuid)
    = test.get('c_cases')::integer
  and (select status = 'asignado' and assigned_to = test.uid('tec_c2')
       from public.cases where id = test.get('c_case_assigned')::uuid),
  'no se borra ni se modifica ningún dato de la empresa'
);

-- ---------------------------------------------------------------------------
-- 4. Reactivación
-- ---------------------------------------------------------------------------

update public.organizations set is_active = true where id = test.get('org_c')::uuid;

select test.login('admin_c');
set role authenticated;
select test.ok(
  (select private.is_admin())
  and (select count(*) from public.cases) = test.get('c_cases')::integer
  and (select count(*) from public.profiles) > 1,
  'al reactivar, el administrador recupera el acceso con el mismo rol'
);
reset role;

select test.login('tec_c2');
set role authenticated;
select public.transition_case(test.get('c_case_assigned')::uuid, 'iniciar');
reset role;

select test.ok(
  (select status = 'en_ejecucion' from public.cases where id = test.get('c_case_assigned')::uuid),
  'el técnico vuelve a trabajar en sus casos'
);

\echo 'Todas las pruebas de empresa inactiva pasaron.'
