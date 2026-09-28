-- Corrección de la revisión de Codex a T-905: `claim_pending_push` marcaba el aviso como
-- enviado antes de llamar a Expo, así que un fallo de red lo dejaba perdido.
--
-- Ahora el reclamo y el envío son estados distintos:
-- * `push_claimed_at`: una ejecución tomó el aviso. El reclamo vence a los 5 minutos,
--   así que si la función falla a mitad, otra ejecución lo retoma.
-- * `push_attempts`: intentos hechos. Se reintenta hasta 5 veces dentro de 24 horas.
-- * `push_sent_at`: estado final (enviado, error permanente o intentos agotados), con el
--   detalle en `push_error`.
-- `send-push` confirma los enviados con `complete_push` y devuelve los fallos
-- transitorios con `release_push`.

alter table public.notifications
  add column push_claimed_at timestamptz,
  add column push_attempts smallint not null default 0 check (push_attempts >= 0);

drop function public.claim_pending_push(integer);

create function public.claim_pending_push(batch_size integer default 100)
returns table (
  id bigint,
  recipient_id uuid,
  case_id uuid,
  title text,
  body text,
  push_attempts smallint
)
language sql
security definer
set search_path = ''
as $$
  with pending as (
    select notifications.id
    from public.notifications
    where notifications.push_sent_at is null
      and notifications.push_attempts < 5
      and notifications.created_at > now() - interval '24 hours'
      and (
        notifications.push_claimed_at is null
        or notifications.push_claimed_at < now() - interval '5 minutes'
      )
    order by notifications.created_at
    limit least(greatest(coalesce(batch_size, 100), 1), 500)
    for update skip locked
  )
  update public.notifications
  set push_claimed_at = now(),
      push_attempts = notifications.push_attempts + 1
  from pending
  where notifications.id = pending.id
  returning
    notifications.id,
    notifications.recipient_id,
    notifications.case_id,
    notifications.title,
    notifications.body,
    notifications.push_attempts;
$$;

-- Estado final: enviado (sin error) o descartado (con el motivo).
create function public.complete_push(notification_ids bigint[], error_message text default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed integer;
begin
  update public.notifications
  set push_sent_at = now(),
      push_claimed_at = null,
      push_error = left(error_message, 300)
  where id = any (notification_ids)
    and push_sent_at is null;
  get diagnostics changed = row_count;
  return changed;
end;
$$;

-- Fallo transitorio: libera el reclamo para reintentar. Si ya se agotaron los intentos,
-- deja el aviso como descartado.
create function public.release_push(notification_ids bigint[], error_message text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed integer;
begin
  update public.notifications
  set push_claimed_at = null,
      push_error = left(error_message, 300),
      push_sent_at = case when push_attempts >= 5 then now() end
  where id = any (notification_ids)
    and push_sent_at is null;
  get diagnostics changed = row_count;
  return changed;
end;
$$;

revoke all on function public.claim_pending_push(integer) from public, anon, authenticated;
revoke all on function public.complete_push(bigint[], text) from public, anon, authenticated;
revoke all on function public.release_push(bigint[], text) from public, anon, authenticated;
grant execute on function public.claim_pending_push(integer) to service_role;
grant execute on function public.complete_push(bigint[], text) to service_role;
grant execute on function public.release_push(bigint[], text) to service_role;

drop index if exists public.notifications_push_pending_idx;
create index notifications_push_pending_idx
  on public.notifications (created_at)
  where push_sent_at is null;
