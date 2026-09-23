-- Apoyo para las Edge Functions de avisos push y limpieza (T-904 y T-905).
--
-- * `claim_pending_push(batch_size)`: toma avisos sin enviar de las últimas 24 horas,
--   los marca como tomados (`push_sent_at`) en la misma operación y los devuelve. Usa
--   `for update skip locked` para que dos ejecuciones simultáneas no envíen el mismo
--   aviso. Solo la ejecuta `service_role` (la Edge Function `send-push`).
-- * `claim_stale_photo_reservations(batch_size)`: devuelve reservas de fotos sin
--   confirmar con más de 24 horas para que `cleanup-photos` borre sus archivos y luego
--   las filas. Solo `service_role`.
-- * `confirm_case_photo` rechaza reservas de más de 23 horas, para no confirmar una foto
--   cuyos archivos la limpieza puede estar borrando.

create or replace function public.claim_pending_push(batch_size integer default 100)
returns table (
  id bigint,
  recipient_id uuid,
  case_id uuid,
  title text,
  body text
)
language sql
security definer
set search_path = ''
as $$
  with pending as (
    select notifications.id
    from public.notifications
    where notifications.push_sent_at is null
      and notifications.created_at > now() - interval '24 hours'
    order by notifications.created_at
    limit least(greatest(coalesce(batch_size, 100), 1), 500)
    for update skip locked
  )
  update public.notifications
  set push_sent_at = now()
  from pending
  where notifications.id = pending.id
  returning
    notifications.id,
    notifications.recipient_id,
    notifications.case_id,
    notifications.title,
    notifications.body;
$$;

revoke all on function public.claim_pending_push(integer) from public, anon, authenticated;
grant execute on function public.claim_pending_push(integer) to service_role;

create or replace function public.claim_stale_photo_reservations(batch_size integer default 200)
returns table (
  id uuid,
  image_path text,
  thumb_path text
)
language sql
stable
security definer
set search_path = ''
as $$
  select case_photos.id, case_photos.image_path, case_photos.thumb_path
  from public.case_photos
  where case_photos.confirmed_at is null
    and case_photos.created_at < now() - interval '24 hours'
  order by case_photos.created_at
  limit least(greatest(coalesce(batch_size, 200), 1), 1000);
$$;

revoke all on function public.claim_stale_photo_reservations(integer)
  from public, anon, authenticated;
grant execute on function public.claim_stale_photo_reservations(integer) to service_role;

create or replace function public.confirm_case_photo(target_photo_id uuid)
returns public.case_photos
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  photo public.case_photos;
  quota bigint;
  uploaded_files integer;
  total_bytes bigint;
begin
  select * into photo
  from public.case_photos
  where id = target_photo_id
    and uploaded_by = current_user_id;

  if not found then
    raise exception 'Foto no encontrada';
  end if;

  -- Mismo orden de bloqueo que reserve_case_photo: primero la empresa, luego la foto.
  select storage_quota_bytes into quota
  from public.organizations
  where id = photo.organization_id
  for update;

  select * into photo
  from public.case_photos
  where id = target_photo_id
  for update;

  if photo.confirmed_at is not null then
    return photo;
  end if;

  -- Las reservas de más de 23 horas vencen: cleanup-photos borra las de más de 24.
  if photo.created_at < now() - interval '23 hours' then
    raise exception 'La reserva de la foto venció; vuelve a subirla';
  end if;

  if not (select private.can_manage_case_photos(photo.case_id, photo.kind)) then
    raise exception 'La solicitud ya no admite cambios en sus fotos';
  end if;

  select count(*), coalesce(sum((metadata ->> 'size')::bigint), 0)
  into uploaded_files, total_bytes
  from storage.objects
  where bucket_id = 'case-media'
    and name in (photo.image_path, photo.thumb_path);

  if uploaded_files <> 2 then
    raise exception 'Sube la foto y su miniatura antes de confirmar';
  end if;

  -- Una reserva de más de una hora deja de contar para el máximo; al confirmarla se
  -- vuelve a comprobar que no haya ya 3 fotos confirmadas de ese tipo.
  if (
    select count(*)
    from public.case_photos
    where case_id = photo.case_id
      and kind = photo.kind
      and confirmed_at is not null
      and id <> photo.id
  ) >= 3 then
    raise exception 'Solo se permiten 3 fotos %',
      case photo.kind when 'antes' then 'de antes' else 'de después' end;
  end if;

  if (select private.organization_storage_bytes(photo.organization_id)) + total_bytes > quota then
    raise exception 'La empresa alcanzó su límite de almacenamiento';
  end if;

  update public.case_photos
  set confirmed_at = now(),
      size_bytes = total_bytes
  where id = photo.id
  returning * into photo;

  return photo;
end;
$$;

revoke all on function public.confirm_case_photo(uuid) from public, anon;
grant execute on function public.confirm_case_photo(uuid) to authenticated;
