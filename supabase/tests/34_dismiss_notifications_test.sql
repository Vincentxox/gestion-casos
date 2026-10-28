-- Pruebas: borrar avisos leídos de la propia lista y limpieza automática (contrato C-023,
-- BUSINESS_RULES 9). Se ejecutan después de 33.

\set ON_ERROR_STOP 1
\set QUIET 1

-- Todo el archivo corre en una transacción que se revierte.
begin;

-- Una persona de la empresa A con al menos tres avisos y otra persona de A sin acceso a ellos.
select test.set('owner', (
  select users.name from test.users users
  join public.notifications n on n.recipient_id = users.id
  join public.profiles p on p.id = users.id and p.organization_id = n.organization_id
  where n.organization_id = test.get('org_a')::uuid
  group by users.name
  having count(*) >= 3
  order by count(*) desc, users.name
  limit 1
));
select test.set('other', (
  select users.name from test.users users
  join public.profiles p on p.id = users.id
  where p.organization_id = test.get('org_a')::uuid and users.name <> test.get('owner')
  order by users.name
  limit 1
));
select test.set('n1', (select id::text from public.notifications
  where recipient_id = test.uid(test.get('owner')) order by id limit 1));
select test.set('n2', (select id::text from public.notifications
  where recipient_id = test.uid(test.get('owner')) order by id limit 1 offset 1));
select test.set('n3', (select id::text from public.notifications
  where recipient_id = test.uid(test.get('owner')) order by id limit 1 offset 2));
update public.notifications set read_at = null, dismissed_at = null
where recipient_id = test.uid(test.get('owner'));
select test.set('owner_total', (select count(*)::text from public.notifications
  where recipient_id = test.uid(test.get('owner'))
    and organization_id = test.get('org_a')::uuid));

select test.ok(
  test.get('owner') is not null and test.get('other') is not null and test.get('n3') is not null,
  'hay una persona con tres avisos sin leer y otra persona de la misma empresa'
);

-- ---------------------------------------------------------------------------
-- 1. Solo se ocultan avisos propios y leídos
-- ---------------------------------------------------------------------------

select test.login(test.get('owner'));
set local role authenticated;
select public.mark_notifications_read(array[test.get('n1'), test.get('n2')]::bigint[]) as marked \gset
select public.dismiss_notifications(array[test.get('n1'), test.get('n3')]::bigint[]) as dismissed \gset
select test.get('n1')::bigint in (select id from public.notifications) as n1_visible \gset
select test.get('n3')::bigint in (select id from public.notifications) as n3_visible \gset
reset role;
select test.ok(:marked = 2, 'la persona marca dos avisos como leídos');
select test.ok(:dismissed = 1, 'oculta solo el aviso leído; el sin leer no se oculta');
select test.ok(not :'n1_visible'::boolean, 'el aviso oculto ya no aparece en su lista');
select test.ok(:'n3_visible'::boolean, 'el aviso sin leer sigue en su lista');
select test.ok(
  (select dismissed_at is not null from public.notifications where id = test.get('n1')::bigint),
  'el aviso oculto sigue guardado con la fecha en que se ocultó'
);

select test.login(test.get('other'));
set local role authenticated;
select public.dismiss_notifications(array[test.get('n2')]::bigint[]) as other_dismissed \gset
select public.restore_notifications(array[test.get('n1')]::bigint[]) as other_restored \gset
reset role;
select test.login('sol_c');
set local role authenticated;
select public.dismiss_notifications(array[test.get('n2')]::bigint[]) as c_dismissed \gset
reset role;
select test.ok(:other_dismissed = 0, 'otra persona no oculta avisos ajenos');
select test.ok(:c_dismissed = 0, 'una persona de otra empresa no oculta avisos de A');
select test.ok(:other_restored = 0, 'otra persona no devuelve avisos ajenos');

select test.throws(
  format('update public.notifications set dismissed_at = now() where id = %s', test.get('n3')),
  'notifications_dismissed_after_read',
  'la base no permite ocultar un aviso sin leer'
);

-- ---------------------------------------------------------------------------
-- 2. Deshacer y borrar todos los leídos
-- ---------------------------------------------------------------------------

select test.login(test.get('owner'));
set local role authenticated;
select public.restore_notifications(array[test.get('n1')]::bigint[]) as restored \gset
select public.restore_notifications(null) as restored_none \gset
select test.get('n1')::bigint in (select id from public.notifications) as n1_back \gset
select public.dismiss_notifications() as dismissed_all \gset
select count(*) as visible_after_all from public.notifications \gset
reset role;
select test.ok(:restored = 1 and :'n1_back'::boolean, '«Deshacer» devuelve el aviso a la lista');
select test.ok(:restored_none = 0, 'sin ids no se devuelve nada');
select test.ok(:dismissed_all = 2, 'sin ids se ocultan todos los avisos leídos');
select test.ok(:visible_after_all = test.get('owner_total')::integer - 2,
  'en la lista quedan solo los avisos sin leer');

-- ---------------------------------------------------------------------------
-- 3. Limpieza automática
-- ---------------------------------------------------------------------------

-- n1: oculto hace 31 días; n2: oculto hace 5 días; n3: sin leer, creado hace 181 días.
update public.notifications set dismissed_at = now() - interval '31 days'
where id = test.get('n1')::bigint;
update public.notifications set dismissed_at = now() - interval '5 days'
where id = test.get('n2')::bigint;
update public.notifications set created_at = now() - interval '181 days'
where id = test.get('n3')::bigint;

select test.login(test.get('owner'));
set local role authenticated;
select test.throws(
  'select private.purge_old_notifications()',
  'permission denied',
  'una persona no puede ejecutar la limpieza'
);
reset role;

select private.purge_old_notifications() >= 2 as purged \gset
select test.ok(:'purged'::boolean, 'la limpieza borra avisos');
select test.ok(
  not exists (select 1 from public.notifications where id = test.get('n1')::bigint),
  'se borra el aviso oculto hace más de 30 días'
);
select test.ok(
  exists (select 1 from public.notifications where id = test.get('n2')::bigint),
  'se conserva el aviso oculto hace menos de 30 días'
);
select test.ok(
  not exists (select 1 from public.notifications where id = test.get('n3')::bigint),
  'se borra cualquier aviso con más de 180 días, aunque esté sin leer'
);
select test.ok(
  not exists (select 1 from public.notifications
              where created_at < now() - interval '180 days'
                 or dismissed_at < now() - interval '30 days'),
  'no queda ningún aviso que la limpieza debía borrar'
);

rollback;

\echo 'Todas las pruebas de avisos ocultos pasaron'
