-- Pruebas de reintento de avisos push: reclamo con vencimiento, confirmación, liberación
-- de fallos transitorios y límite de intentos. Se ejecutan después de 17.

\set ON_ERROR_STOP 1
\set QUIET 1

create temporary table claimed_retry (
  id bigint, recipient_id uuid, case_id uuid, title text, body text, push_attempts smallint
);
grant all on claimed_retry to service_role;

-- Los avisos reclamados en 17 aún tienen el reclamo vigente.
select test.set('ids', (
  select string_agg(id::text, ',' order by id) from public.notifications
  where push_claimed_at is not null and push_sent_at is null
));
select test.set('ok_id', split_part(test.get('ids'), ',', 1));
select test.set('fail_id', split_part(test.get('ids'), ',', 2));
select test.set('perm_id', split_part(test.get('ids'), ',', 3));
select test.get('ok_id') as ok_id, test.get('fail_id') as fail_id, test.get('perm_id') as perm_id \gset

select test.login('tec1');
set role authenticated;
select test.throws(
  format($$select public.complete_push(array[%s]::bigint[])$$, test.get('ok_id')),
  'permission denied',
  'un usuario no marca avisos como enviados'
);
select test.throws(
  format($$select public.release_push(array[%s]::bigint[], 'x')$$, test.get('ok_id')),
  'permission denied',
  'un usuario no libera avisos'
);
reset role;

set role service_role;
select public.complete_push(array[:ok_id]::bigint[]);
select public.complete_push(array[:perm_id]::bigint[], 'DeviceNotRegistered');
select public.release_push(array[:fail_id]::bigint[], 'ErrorDeRed: sin conexión');
reset role;

select test.ok(
  (select push_sent_at is not null and push_error is null and push_claimed_at is null
   from public.notifications where id = test.get('ok_id')::bigint),
  'un aviso enviado queda como enviado y sin error'
);
select test.ok(
  (select push_sent_at is not null and push_error = 'DeviceNotRegistered'
   from public.notifications where id = test.get('perm_id')::bigint),
  'un error permanente cierra el aviso con su motivo'
);
select test.ok(
  (select push_sent_at is null and push_claimed_at is null and push_error like 'ErrorDeRed%'
   from public.notifications where id = test.get('fail_id')::bigint),
  'un fallo transitorio libera el aviso para reintentar'
);

-- El aviso liberado se vuelve a tomar; los reclamados vigentes no.
set role service_role;
insert into claimed_retry select * from public.claim_pending_push(500);
reset role;
select test.ok(
  (select bool_or(id = test.get('fail_id')::bigint) and bool_and(push_attempts <= 2)
   from claimed_retry)
    and not exists (select 1 from claimed_retry where id = test.get('ok_id')::bigint),
  'la siguiente ejecución reintenta el aviso liberado'
);

-- Un reclamo de más de 5 minutos (la función falló a mitad) se retoma.
update public.notifications
set push_claimed_at = now() - interval '10 minutes'
where id = test.get('fail_id')::bigint;
truncate claimed_retry;
set role service_role;
insert into claimed_retry select * from public.claim_pending_push(500);
reset role;
select test.ok(
  (select count(*) = 1 and bool_and(push_attempts = 3) from claimed_retry
   where id = test.get('fail_id')::bigint),
  'un reclamo vencido se retoma y suma un intento'
);

-- Con el quinto intento fallido, el aviso queda descartado.
update public.notifications set push_attempts = 5 where id = test.get('fail_id')::bigint;
set role service_role;
select public.release_push(array[:fail_id]::bigint[], 'MessageRateExceeded');
reset role;
select test.ok(
  (select push_sent_at is not null and push_error = 'MessageRateExceeded'
   from public.notifications where id = test.get('fail_id')::bigint),
  'tras 5 intentos el aviso deja de reintentarse'
);
truncate claimed_retry;
set role service_role;
insert into claimed_retry select * from public.claim_pending_push(500);
reset role;
select test.ok(
  not exists (select 1 from claimed_retry where id = test.get('fail_id')::bigint),
  'un aviso descartado no se vuelve a tomar'
);

\echo 'Todas las pruebas de reintento de push pasaron.'
