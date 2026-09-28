-- Prueba: una reserva vencida no permite superar el máximo de 3 fotos al confirmarse.
-- Se ejecuta después de 15. case_limit: asignado a tec1 y en ejecución.

\set ON_ERROR_STOP 1
\set QUIET 1

select test.login('sol2');
set role authenticated;
insert into public.cases (title, description, location, category_id)
values ('Ventana rota', 'El vidrio de la ventana de RRHH está roto', 'Oficina RRHH', test.get('cat_elec')::uuid);
select test.set('case_limit', (select id::text from public.cases where title = 'Ventana rota'));
reset role;
select test.login('jefe_tec');
set role authenticated;
select public.transition_case(test.get('case_limit')::uuid, 'aceptar');
select public.transition_case(test.get('case_limit')::uuid, 'asignar', null, test.uid('tec1'));
reset role;

select test.login('tec1');
set role authenticated;
select public.transition_case(test.get('case_limit')::uuid, 'iniciar');
-- Reserva que quedará vencida sin confirmar.
select test.set('old', public.reserve_case_photo(test.get('case_limit')::uuid, 'despues')::text);
select test.upload(test.get('old')::jsonb ->> 'image_path', 50000);
select test.upload(test.get('old')::jsonb ->> 'thumb_path', 5000);
reset role;

update public.case_photos
set created_at = now() - interval '2 hours'
where id = (test.get('old')::jsonb ->> 'id')::uuid;

-- Con la reserva vencida ya no cuenta: se confirman otras tres.
select test.login('tec1');
set role authenticated;
select test.set('n1', public.reserve_case_photo(test.get('case_limit')::uuid, 'despues')::text);
select test.set('n2', public.reserve_case_photo(test.get('case_limit')::uuid, 'despues')::text);
select test.set('n3', public.reserve_case_photo(test.get('case_limit')::uuid, 'despues')::text);
select test.upload(test.get('n1')::jsonb ->> 'image_path', 50000);
select test.upload(test.get('n1')::jsonb ->> 'thumb_path', 5000);
select test.upload(test.get('n2')::jsonb ->> 'image_path', 50000);
select test.upload(test.get('n2')::jsonb ->> 'thumb_path', 5000);
select test.upload(test.get('n3')::jsonb ->> 'image_path', 50000);
select test.upload(test.get('n3')::jsonb ->> 'thumb_path', 5000);
select public.confirm_case_photo((test.get('n1')::jsonb ->> 'id')::uuid);
select public.confirm_case_photo((test.get('n2')::jsonb ->> 'id')::uuid);
select public.confirm_case_photo((test.get('n3')::jsonb ->> 'id')::uuid);
select test.throws(
  format($$select public.confirm_case_photo(%L)$$, test.get('old')::jsonb ->> 'id'),
  'Solo se permiten 3 fotos de después',
  'una reserva vencida no se confirma si ya hay 3 fotos confirmadas'
);
reset role;

select test.ok(
  (select count(*) = 3 from public.case_photos
   where case_id = test.get('case_limit')::uuid and kind = 'despues' and confirmed_at is not null),
  'la solicitud queda con 3 fotos de después, no 4'
);

\echo 'Todas las pruebas del máximo de fotos pasaron.'
