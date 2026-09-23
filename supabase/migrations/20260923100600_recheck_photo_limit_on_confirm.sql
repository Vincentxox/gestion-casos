-- Corrección de la revisión de Codex a C-007: una reserva de más de una hora deja de
-- contar para el máximo de 3 fotos por tipo, pero aún podía confirmarse después y superar
-- ese límite. `confirm_case_photo` vuelve a contar las fotos confirmadas bajo el mismo
-- bloqueo de la empresa que usa `reserve_case_photo`.

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

  -- Una reserva vencida (más de una hora) deja de contar para el máximo; al confirmarla
  -- se vuelve a comprobar que no haya ya 3 fotos confirmadas de ese tipo.
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
