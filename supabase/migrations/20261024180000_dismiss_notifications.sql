-- Borrar avisos leídos de la propia lista y limpieza automática (contrato C-023, aprobado
-- por el responsable el 24/10/2026; BUSINESS_RULES 9).
--
-- 1. `notifications.dismissed_at`: el aviso queda oculto para su destinatario. No cambia la
--    solicitud, su historial ni los avisos de otras personas.
-- 2. La política de lectura deja fuera los avisos ocultos, así la lista y el contador de la
--    campana los ignoran sin cambiar sus consultas.
-- 3. `dismiss_notifications` oculta avisos propios y ya leídos (sin ids, todos los leídos);
--    `restore_notifications` los devuelve, para «Deshacer».
-- 4. `private.purge_old_notifications` borra de verdad los ocultos con más de 30 días y
--    cualquier aviso con más de 180. La ejecuta una tarea de pg_cron diaria
--    (`docs/EDGE_FUNCTIONS.md`).

alter table public.notifications add column dismissed_at timestamptz;

alter table public.notifications add constraint notifications_dismissed_after_read
  check (dismissed_at is null or read_at is not null);

create index notifications_dismissed_idx
  on public.notifications (dismissed_at)
  where dismissed_at is not null;

alter policy "Recipients can read their notifications"
on public.notifications
using (
  recipient_id = (select auth.uid())
  and organization_id = (select private.current_organization_id())
  and dismissed_at is null
);

create or replace function public.dismiss_notifications(notification_ids bigint[] default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed integer;
begin
  update public.notifications
  set dismissed_at = now()
  where recipient_id = (select auth.uid())
    and organization_id = (select private.current_organization_id())
    and read_at is not null
    and dismissed_at is null
    and (notification_ids is null or id = any (notification_ids));
  get diagnostics changed = row_count;
  return changed;
end;
$$;

create or replace function public.restore_notifications(notification_ids bigint[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed integer;
begin
  update public.notifications
  set dismissed_at = null
  where recipient_id = (select auth.uid())
    and organization_id = (select private.current_organization_id())
    and dismissed_at is not null
    and id = any (coalesce(notification_ids, '{}'));
  get diagnostics changed = row_count;
  return changed;
end;
$$;

revoke all on function public.dismiss_notifications(bigint[]) from public, anon;
revoke all on function public.restore_notifications(bigint[]) from public, anon;
grant execute on function public.dismiss_notifications(bigint[]) to authenticated;
grant execute on function public.restore_notifications(bigint[]) to authenticated;

-- Limpieza: sin usuario, solo la llama pg_cron. Devuelve cuántos avisos borró.
create or replace function private.purge_old_notifications()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed integer;
begin
  delete from public.notifications
  where dismissed_at < now() - interval '30 days'
    or created_at < now() - interval '180 days';
  get diagnostics removed = row_count;
  return removed;
end;
$$;

revoke all on function private.purge_old_notifications() from public, anon, authenticated;
