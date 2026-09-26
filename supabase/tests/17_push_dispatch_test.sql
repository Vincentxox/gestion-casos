-- Pruebas de las funciones de apoyo de send-push y cleanup-photos.
-- Se ejecutan después de 16, sobre los mismos datos.

\set ON_ERROR_STOP 1
\set QUIET 1

select test.set('pending_before', (
  select count(*)::text from public.notifications
  where push_sent_at is null and created_at > now() - interval '24 hours'
));

select test.login('tec1');
set role authenticated;
select test.throws(
  $$select * from public.claim_pending_push(10)$$,
  'permission denied',
  'un usuario no toma avisos para enviar'
);
select test.throws(
  $$select * from public.claim_stale_photo_reservations(10)$$,
  'permission denied',
  'un usuario no lista reservas vencidas'
);
reset role;

set role anon;
select test.throws(
  $$select * from public.claim_pending_push(10)$$,
  'permission denied',
  'anon no toma avisos para enviar'
);
reset role;

-- Un aviso viejo no se envía.
update public.notifications
set created_at = now() - interval '2 days'
where id = (select min(id) from public.notifications where push_sent_at is null);

create temporary table claimed_push (
  id bigint, recipient_id uuid, case_id uuid, title text, body text, push_attempts smallint
);
grant all on claimed_push to service_role;
set role service_role;
insert into claimed_push select * from public.claim_pending_push(500);
reset role;
select test.set('claimed', (select count(*)::text from claimed_push));

select test.ok(
  test.get('claimed')::int = test.get('pending_before')::int - 1
    and test.get('claimed')::int > 0,
  'service_role toma los avisos pendientes de las últimas 24 horas'
);
select test.ok(
  (select count(*) from public.notifications
   where created_at > now() - interval '24 hours'
     and (push_claimed_at is null or push_attempts <> 1 or push_sent_at is not null)) = 0,
  'los avisos tomados quedan reclamados (sin marcarse como enviados) con un intento'
);
truncate claimed_push;
set role service_role;
insert into claimed_push select * from public.claim_pending_push(500);
reset role;
select test.ok(
  (select count(*) from claimed_push) = 0,
  'una segunda ejecución no vuelve a tomar los mismos avisos'
);

-- Reservas vencidas: la reserva de 16_photo_limit_test tiene 2 horas; se envejece más.
update public.case_photos
set created_at = now() - interval '2 days'
where id = (test.get('old')::jsonb ->> 'id')::uuid;

create temporary table stale_photos (id uuid, image_path text, thumb_path text);
grant all on stale_photos to service_role;
set role service_role;
insert into stale_photos select * from public.claim_stale_photo_reservations(100);
reset role;
select test.ok(
  (select count(*) = 1 and bool_and(id = (test.get('old')::jsonb ->> 'id')::uuid) from stale_photos),
  'service_role lista solo las reservas sin confirmar de más de 24 horas'
);

select test.login('tec1');
set role authenticated;
select test.throws(
  format($$select public.confirm_case_photo(%L)$$, test.get('old')::jsonb ->> 'id'),
  'venció',
  'una reserva de más de 23 horas ya no se confirma'
);
reset role;

\echo 'Todas las pruebas de apoyo a push y limpieza pasaron.'
