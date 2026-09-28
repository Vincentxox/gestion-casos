-- Pruebas: el administrador acepta, rechaza y asigna en lugar del jefe técnico, pero solo
-- cancela las solicitudes que él mismo creó (docs/BUSINESS_RULES.md, 5.3).
-- Se ejecutan después de 18.

\set ON_ERROR_STOP 1
\set QUIET 1

select test.login('sol1');
set role authenticated;
insert into public.cases (title, description, location, category_id)
values ('Puerta atascada', 'La puerta del almacén no abre', 'Almacén', test.get('cat_elec')::uuid);
insert into public.cases (title, description, location, category_id)
values ('Toma sin energía', 'Un tomacorriente no funciona', 'Oficina 4', test.get('cat_elec')::uuid);
select test.set('case_door', (select id::text from public.cases where title = 'Puerta atascada'));
select test.set('case_plug', (select id::text from public.cases where title = 'Toma sin energía'));
reset role;

select test.login('admin');
set role authenticated;
select test.throws(
  format($$select public.transition_case(%L, 'cancelar', 'La retiro yo')$$, test.get('case_door')),
  'Solo quien creó la solicitud o el jefe de su área puede cancelarla',
  'el administrador no cancela una solicitud que no creó'
);
select public.transition_case(test.get('case_door')::uuid, 'rechazar', 'No corresponde al área');
select public.transition_case(test.get('case_plug')::uuid, 'aceptar');
reset role;

select test.ok(
  (select status = 'rechazado' from public.cases where id = test.get('case_door')::uuid),
  'el administrador sigue pudiendo rechazar'
);
select test.ok(
  (select status = 'aceptado' from public.cases where id = test.get('case_plug')::uuid),
  'el administrador sigue pudiendo aceptar'
);

-- El creador y el jefe del área solicitante siguen cancelando.
select test.login('sol1');
set role authenticated;
insert into public.cases (title, description, location, category_id)
values ('Silla rota', 'Una silla de la sala está rota', 'Sala 1', test.get('cat_elec')::uuid);
select test.set('case_chair', (select id::text from public.cases where title = 'Silla rota'));
select public.transition_case(test.get('case_chair')::uuid, 'cancelar', 'Ya la cambiaron');
reset role;
select test.ok(
  (select status = 'cancelado' from public.cases where id = test.get('case_chair')::uuid),
  'el creador cancela su solicitud'
);

-- Si el administrador creó la solicitud, puede cancelarla como creador.
update public.profiles set area_id = test.get('area_admin')::uuid where id = test.uid('admin');
select test.login('admin');
set role authenticated;
insert into public.cases (title, description, location, category_id)
values ('Pintar oficina', 'Pintar la oficina de gerencia', 'Gerencia', test.get('cat_elec')::uuid);
select test.set('case_paint', (select id::text from public.cases where title = 'Pintar oficina'));
select public.transition_case(test.get('case_paint')::uuid, 'cancelar', 'Se pospone');
reset role;
select test.ok(
  (select status = 'cancelado' from public.cases where id = test.get('case_paint')::uuid),
  'el administrador cancela la solicitud que él creó'
);

\echo 'Todas las pruebas de cancelación del administrador pasaron.'
