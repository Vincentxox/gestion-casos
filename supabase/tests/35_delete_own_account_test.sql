-- Pruebas: eliminar la propia cuenta (contrato C-024). Se ejecutan después de 34.

\set ON_ERROR_STOP 1
\set QUIET 1

-- Todo el archivo corre en una transacción que se revierte.
begin;

-- ---------------------------------------------------------------------------
-- 1. Bloqueos
-- ---------------------------------------------------------------------------

select test.login('');
set role authenticated;
select test.throws(
  'select public.prepare_account_deletion()',
  'Acceso denegado',
  'sin sesión no se elimina ninguna cuenta'
);
reset role;

select test.set('open_tech', (
  select users.name from test.users users
  join public.cases c on c.assigned_to = users.id
  where c.status in ('asignado', 'en_ejecucion', 'en_espera')
  order by users.name
  limit 1
));
select test.login(test.get('open_tech'));
set role authenticated;
select test.throws(
  'select public.prepare_account_deletion()',
  'Pide que reasignen primero tus trabajos abiertos',
  'no se elimina una cuenta con trabajos asignados abiertos'
);
reset role;
select test.ok(
  (select deleted_at is null and organization_id is not null
   from public.profiles where id = test.uid(test.get('open_tech'))),
  'el bloqueo no cambia el perfil'
);

select test.ok(
  (select count(*) = 1 from public.profiles
   where organization_id = test.get('org_b')::uuid and role = 'administrador')
  and (select count(*) > 1 from public.profiles where organization_id = test.get('org_b')::uuid),
  'la empresa B tiene un solo administrador y más miembros'
);
select test.login('admin_b');
set role authenticated;
select test.throws(
  'select public.prepare_account_deletion()',
  'Nombra a otro administrador antes de eliminar tu cuenta',
  'el único administrador de una empresa con miembros no elimina su cuenta'
);
reset role;

-- ---------------------------------------------------------------------------
-- 2. Camino normal
-- ---------------------------------------------------------------------------

insert into public.push_tokens (token, user_id, platform)
values ('ExponentPushToken[eliminar-cuenta-sol2]', test.uid('sol2'), 'android');

select test.set('sol2_name', (select full_name from public.profiles where id = test.uid('sol2')));
select test.set('sol2_cases', (select count(*)::text from public.cases where created_by = test.uid('sol2')));
select test.ok(
  test.get('sol2_cases')::int > 0
  and exists (select 1 from public.notifications where recipient_id = test.uid('sol2')),
  'la persona que se elimina tiene solicitudes y avisos'
);

select test.login('sol2');
set role authenticated;
select public.prepare_account_deletion() as folder \gset
reset role;

select test.ok(
  :'folder' = test.get('org_a') || '/' || test.uid('sol2')::text || '/',
  'devuelve la carpeta de su foto de perfil'
);
select test.ok(
  (select full_name = 'Cuenta eliminada' and avatar_url is null and organization_id is null
     and area_id is null and role = 'solicitante' and deleted_at is not null
   from public.profiles where id = test.uid('sol2')),
  'el perfil queda sin datos personales ni empresa'
);
select test.ok(
  not exists (select 1 from public.push_tokens where user_id = test.uid('sol2'))
  and not exists (select 1 from public.notifications where recipient_id = test.uid('sol2')),
  'se borran sus dispositivos y sus avisos'
);
select test.ok(
  (select count(*) from public.cases where created_by = test.uid('sol2')) = test.get('sol2_cases')::int,
  'sus solicitudes se conservan'
);
select test.ok(
  exists (select 1 from public.former_members
          where organization_id = test.get('org_a')::uuid
            and user_id = test.uid('sol2')
            and full_name = test.get('sol2_name')),
  'la empresa conserva su nombre en former_members'
);

select test.login('sol2');
set role authenticated;
select public.prepare_account_deletion() is null as repeated \gset
reset role;
select test.ok(:'repeated', 'repetirla no falla ni cambia nada');

-- ---------------------------------------------------------------------------
-- 3. Único miembro: la empresa queda inactiva
-- ---------------------------------------------------------------------------

select test.ok(
  (select count(*) = 1 from public.profiles p
   where p.organization_id = (select organization_id from public.profiles where id = test.uid('admin_e'))),
  'admin_e es el único miembro de su empresa'
);
select test.set('org_e', (select organization_id::text from public.profiles where id = test.uid('admin_e')));
select test.login('admin_e');
set role authenticated;
select public.prepare_account_deletion();
reset role;
select test.ok(
  (select not is_active from public.organizations where id = test.get('org_e')::uuid),
  'la empresa del único miembro queda inactiva'
);
select test.ok(
  (select deleted_at is not null and organization_id is null
   from public.profiles where id = test.uid('admin_e')),
  'el único miembro elimina su cuenta'
);

-- ---------------------------------------------------------------------------
-- 4. Empresa inactiva
-- ---------------------------------------------------------------------------

select test.set('org_c', (select organization_id::text from public.profiles where id = test.uid('sol_c')));
select test.login('');
update public.organizations set is_active = false where id = test.get('org_c')::uuid;

select test.login('sol_c');
set role authenticated;
select public.prepare_account_deletion();
reset role;
select test.ok(
  (select deleted_at is not null and organization_id is null
   from public.profiles where id = test.uid('sol_c')),
  'quien pertenece a una empresa inactiva también elimina su cuenta'
);

-- La marca de la transacción es solo de quien se elimina: otra persona de C sigue bloqueada.
select test.login('jefe_c');
set role authenticated;
select test.throws(
  format($$update public.profiles set full_name = 'Otro nombre' where id = %L$$, test.uid('jefe_c')),
  'Tu empresa está inactiva',
  'la eliminación no abre la empresa inactiva a los demás'
);
reset role;

-- ---------------------------------------------------------------------------
-- 5. Permisos
-- ---------------------------------------------------------------------------

select test.ok(
  not has_function_privilege('anon', 'public.prepare_account_deletion()', 'execute'),
  'anon no ejecuta la eliminación'
);

rollback;

\echo 'Todas las pruebas de eliminar la propia cuenta pasaron'
