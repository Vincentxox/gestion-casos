-- Pruebas de las correcciones a C-007: cuota revalidada al confirmar y lectura de
-- reservas pendientes. Se ejecutan después de 12_reports_test.sql.

\set ON_ERROR_STOP 1
\set QUIET 1

-- Solicitud en ejecución: creada por sol2 (RRHH), asignada a tec1 (Mantenimiento).
select test.login('sol2');
set role authenticated;
insert into public.cases (title, description, location, category_id)
values ('Humedad en pared', 'Aparece humedad en la pared de la bodega', 'Bodega RRHH',
        test.get('cat_elec')::uuid);
select test.set('case_q', (select id::text from public.cases where title = 'Humedad en pared'));
reset role;
select test.login('jefe_tec');
set role authenticated;
select public.transition_case(test.get('case_q')::uuid, 'aceptar');
select public.transition_case(test.get('case_q')::uuid, 'asignar', null, test.uid('tec1'));
reset role;
select test.login('tec1');
set role authenticated;
select public.transition_case(test.get('case_q')::uuid, 'iniciar');
reset role;

-- ---------------------------------------------------------------------------
-- 1. Una reserva pendiente solo la descarga quien la subió
-- ---------------------------------------------------------------------------

select test.login('tec1');
set role authenticated;
select test.set('q1', public.reserve_case_photo(test.get('case_q')::uuid, 'antes')::text);
select test.upload(test.get('q1')::jsonb ->> 'image_path', 100000);
select test.upload(test.get('q1')::jsonb ->> 'thumb_path', 10000);
select test.ok(
  (select count(*) from storage.objects
   where name like test.get('org_a') || '/' || test.get('case_q') || '/%') = 2,
  'quien reservó la foto ve sus archivos antes de confirmar'
);
reset role;

select test.login('sol2');
set role authenticated;
select test.ok(
  (select count(*) from storage.objects
   where name like test.get('org_a') || '/' || test.get('case_q') || '/%') = 0,
  'otro miembro que ve la solicitud no descarga una reserva sin confirmar'
);
reset role;

select test.login('jefe_tec');
set role authenticated;
select test.ok(
  (select count(*) from storage.objects
   where name like test.get('org_a') || '/' || test.get('case_q') || '/%') = 0,
  'ni siquiera el jefe técnico descarga una reserva ajena sin confirmar'
);
reset role;

select test.login('tec1');
set role authenticated;
select public.confirm_case_photo((test.get('q1')::jsonb ->> 'id')::uuid);
reset role;

select test.login('sol2');
set role authenticated;
select test.ok(
  (select count(*) from storage.objects
   where name like test.get('org_a') || '/' || test.get('case_q') || '/%') = 2,
  'una vez confirmada, la foto la descarga quien ve la solicitud'
);
reset role;

-- ---------------------------------------------------------------------------
-- 2. La cuota se vuelve a comprobar al confirmar
-- ---------------------------------------------------------------------------

-- Queda espacio para 100 000 bytes: las dos reservas pasan, pero solo cabe una foto.
update public.organizations
set storage_quota_bytes = private.organization_storage_bytes(test.get('org_a')::uuid) + 100000
where id = test.get('org_a')::uuid;

select test.login('tec1');
set role authenticated;
select test.set('q2', public.reserve_case_photo(test.get('case_q')::uuid, 'antes')::text);
select test.set('q3', public.reserve_case_photo(test.get('case_q')::uuid, 'antes')::text);
select test.upload(test.get('q2')::jsonb ->> 'image_path', 90000);
select test.upload(test.get('q2')::jsonb ->> 'thumb_path', 10000);
select test.upload(test.get('q3')::jsonb ->> 'image_path', 90000);
select test.upload(test.get('q3')::jsonb ->> 'thumb_path', 10000);
select test.ok(
  (select confirmed_at is not null
   from public.confirm_case_photo((test.get('q2')::jsonb ->> 'id')::uuid)),
  'la primera foto cabe en la cuota y se confirma'
);
select test.throws(
  format($$select public.confirm_case_photo(%L)$$, test.get('q3')::jsonb ->> 'id'),
  'límite de almacenamiento',
  'la segunda superaría la cuota: no se confirma aunque su reserva haya pasado'
);
select test.ok(
  (select confirmed_at is null from public.case_photos where id = (test.get('q3')::jsonb ->> 'id')::uuid),
  'la foto que no cabe queda sin confirmar'
);
select test.throws(
  format($$select public.reserve_case_photo(%L, 'despues')$$, test.get('case_q')),
  'límite de almacenamiento',
  'con la cuota llena no se aceptan reservas nuevas'
);
reset role;

select test.ok(
  private.organization_storage_bytes(test.get('org_a')::uuid)
    <= (select storage_quota_bytes from public.organizations where id = test.get('org_a')::uuid),
  'el uso confirmado nunca supera la cuota'
);

update public.organizations set storage_quota_bytes = 1073741824 where id = test.get('org_a')::uuid;

\echo 'Todas las pruebas de correcciones de fotos pasaron.'
