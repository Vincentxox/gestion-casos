-- Correcciones de la revisión de Codex a C-007 (fotos).
--
-- 1. Cuota: `reserve_case_photo` y `confirm_case_photo` se serializan con un bloqueo en
--    la fila de la empresa, y al confirmar se vuelve a comprobar que el uso más los
--    bytes de la foto no supere la cuota. Si la supera, la foto no se confirma; la app
--    debe borrar sus archivos y la limpieza de reservas (T-904) elimina los restos.
-- 2. Lectura de archivos: una reserva sin confirmar solo la puede descargar quien la
--    subió, igual que en `case_photos`. Los PDF de `case-reports` mantienen su regla.

create or replace function public.reserve_case_photo(
  target_case_id uuid,
  photo_kind public.photo_kind
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_case public.cases;
  quota bigint;
  used_slots integer;
  new_photo_id uuid := gen_random_uuid();
  folder text;
begin
  if current_user_id is null then
    raise exception 'Acceso denegado';
  end if;

  if photo_kind is null then
    raise exception 'Indica si la foto es de antes o de después';
  end if;

  if not (select private.can_manage_case_photos(target_case_id, photo_kind)) then
    raise exception 'No puedes agregar fotos % a esta solicitud',
      case photo_kind when 'antes' then 'de antes' else 'de después' end;
  end if;

  select * into target_case from public.cases where id = target_case_id;

  -- Bloqueo común con confirm_case_photo: la cuota se evalúa de a una operación por empresa.
  select storage_quota_bytes into quota
  from public.organizations
  where id = target_case.organization_id
  for update;

  select count(*) into used_slots
  from public.case_photos
  where case_id = target_case_id
    and kind = photo_kind
    and (confirmed_at is not null or created_at > now() - interval '1 hour');

  if used_slots >= 3 then
    raise exception 'Solo se permiten 3 fotos %',
      case photo_kind when 'antes' then 'de antes' else 'de después' end;
  end if;

  if (select private.organization_storage_bytes(target_case.organization_id)) >= quota then
    raise exception 'La empresa alcanzó su límite de almacenamiento';
  end if;

  folder := format('%s/%s/%s', target_case.organization_id, target_case.id, new_photo_id);

  insert into public.case_photos (
    id,
    organization_id,
    case_id,
    kind,
    image_path,
    thumb_path,
    uploaded_by
  ) values (
    new_photo_id,
    target_case.organization_id,
    target_case.id,
    photo_kind,
    folder || '/full.jpg',
    folder || '/thumb.jpg',
    current_user_id
  );

  return jsonb_build_object(
    'id', new_photo_id,
    'bucket', 'case-media',
    'image_path', folder || '/full.jpg',
    'thumb_path', folder || '/thumb.jpg'
  );
end;
$$;

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

revoke all on function public.reserve_case_photo(uuid, public.photo_kind) from public, anon;
revoke all on function public.confirm_case_photo(uuid) from public, anon;
grant execute on function public.reserve_case_photo(uuid, public.photo_kind) to authenticated;
grant execute on function public.confirm_case_photo(uuid) to authenticated;

-- Lectura de fotos en Storage: la misma visibilidad que `case_photos` (RLS de la tabla:
-- fotos confirmadas de solicitudes visibles, o reservas propias). SECURITY INVOKER.
create or replace function private.can_read_case_photo_object(object_name text)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1
    from public.case_photos
    where case_photos.image_path = object_name
       or case_photos.thumb_path = object_name
  );
$$;

revoke all on function private.can_read_case_photo_object(text) from public, anon;
grant execute on function private.can_read_case_photo_object(text) to authenticated;

drop policy if exists "Members can read media of visible cases" on storage.objects;

create policy "Members can read confirmed media of visible cases"
on storage.objects
for select
to authenticated
using (bucket_id = 'case-media' and private.can_read_case_photo_object(name));
