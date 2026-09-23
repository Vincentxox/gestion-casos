-- Fotos de antes y después de cada solicitud (docs/BUSINESS_RULES.md, sección 7.1).
--
-- * Hasta 3 fotos de antes y 3 de después por solicitud. Cada foto son dos archivos en el
--   bucket privado `case-media`: la imagen (1600 px) y su miniatura (400 px), ambos
--   comprimidos por la app. El bucket limita cada archivo a 2 MB y a JPEG o WebP.
-- * Flujo de subida en tres pasos:
--   1. `reserve_case_photo` valida permisos, límites y cuota, y devuelve las rutas.
--   2. La app sube los dos archivos con la API de Storage. RLS solo deja subir a esas
--      rutas reservadas y a quien las reservó.
--   3. `confirm_case_photo` comprueba que ambos archivos existen y guarda su tamaño.
-- * Para borrar: la app elimina los archivos con la API de Storage y luego llama a
--   `delete_case_photo`. Supabase no permite borrar objetos de Storage desde SQL.
-- * Cada tipo de servicio define cuántas fotos de después exige el reporte
--   (`categories.min_after_photos`), y cada empresa tiene una cuota de almacenamiento.

create type public.photo_kind as enum ('antes', 'despues');

-- ---------------------------------------------------------------------------
-- Configuración por tipo de servicio y por empresa
-- ---------------------------------------------------------------------------

alter table public.categories
add column min_after_photos smallint not null default 0
  check (min_after_photos between 0 and 3);

grant insert (min_after_photos) on table public.categories to authenticated;
grant update (min_after_photos) on table public.categories to authenticated;

-- Cuota de almacenamiento: 1 GB por defecto. Solo la cambia el operador de la plataforma.
alter table public.organizations
add column storage_quota_bytes bigint not null default 1073741824
  check (storage_quota_bytes > 0);

-- ---------------------------------------------------------------------------
-- Bucket privado
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('case-media', 'case-media', false, 2097152, array['image/jpeg', 'image/webp'])
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- Tabla de fotos
-- ---------------------------------------------------------------------------

create table public.case_photos (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  case_id uuid not null references public.cases (id) on delete cascade,
  kind public.photo_kind not null,
  image_path text not null unique,
  thumb_path text not null unique,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  uploaded_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);

create index case_photos_case_kind_idx on public.case_photos (case_id, kind, created_at);
create index case_photos_organization_idx on public.case_photos (organization_id);
create index case_photos_uploaded_by_idx on public.case_photos (uploaded_by);

alter table public.case_photos enable row level security;

create policy "Members can read photos of visible cases"
on public.case_photos
for select
to authenticated
using (
  confirmed_at is not null
  and exists (select 1 from public.cases where cases.id = case_photos.case_id)
);

create policy "Uploaders can read their pending photos"
on public.case_photos
for select
to authenticated
using (uploaded_by = (select auth.uid()));

-- Solo lectura desde el cliente: los cambios pasan por las RPC de abajo.
revoke all on table public.case_photos from anon, authenticated;
grant select on table public.case_photos to authenticated;

-- ---------------------------------------------------------------------------
-- Permisos
-- ---------------------------------------------------------------------------

-- ¿Puede el usuario autenticado agregar o quitar fotos de este tipo en la solicitud?
-- Técnico asignado o jefe del área técnica, en los estados de la sección 7.1.
create or replace function private.can_manage_case_photos(
  target_case_id uuid,
  target_kind public.photo_kind
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.cases
    join public.profiles on profiles.id = (select auth.uid())
    where cases.id = target_case_id
      and cases.organization_id = profiles.organization_id
      and (
        cases.assigned_to = profiles.id
        or (profiles.role = 'jefe_area' and profiles.area_id = cases.target_area_id)
      )
      and cases.status = any (
        case target_kind
          when 'antes' then array['asignado', 'en_ejecucion', 'en_espera']::public.case_status[]
          else array['en_ejecucion', 'en_espera']::public.case_status[]
        end
      )
  );
$$;

revoke all on function private.can_manage_case_photos(uuid, public.photo_kind)
  from public, anon;
grant execute on function private.can_manage_case_photos(uuid, public.photo_kind)
  to authenticated;

-- Bytes usados por una empresa: fotos confirmadas. La migración de reportes suma los PDF.
create or replace function private.organization_storage_bytes(target_organization_id uuid)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(size_bytes), 0)::bigint
  from public.case_photos
  where organization_id = target_organization_id
    and confirmed_at is not null;
$$;

revoke all on function private.organization_storage_bytes(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- RPC del flujo de subida
-- ---------------------------------------------------------------------------

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

  -- Serializa las reservas de una misma solicitud para que el límite sea exacto.
  select * into target_case from public.cases where id = target_case_id for update;

  -- Cuentan las fotos confirmadas y las reservas de la última hora.
  select count(*) into used_slots
  from public.case_photos
  where case_id = target_case_id
    and kind = photo_kind
    and (confirmed_at is not null or created_at > now() - interval '1 hour');

  if used_slots >= 3 then
    raise exception 'Solo se permiten 3 fotos %',
      case photo_kind when 'antes' then 'de antes' else 'de después' end;
  end if;

  select storage_quota_bytes into quota
  from public.organizations
  where id = target_case.organization_id;

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
  uploaded_files integer;
  total_bytes bigint;
begin
  select * into photo
  from public.case_photos
  where id = target_photo_id
    and uploaded_by = current_user_id
  for update;

  if not found then
    raise exception 'Foto no encontrada';
  end if;

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

  update public.case_photos
  set confirmed_at = now(),
      size_bytes = total_bytes
  where id = photo.id
  returning * into photo;

  return photo;
end;
$$;

create or replace function public.delete_case_photo(target_photo_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  photo public.case_photos;
begin
  select * into photo
  from public.case_photos
  where id = target_photo_id
    and organization_id = (select private.current_organization_id())
  for update;

  if not found then
    raise exception 'Foto no encontrada';
  end if;

  if not (select private.can_manage_case_photos(photo.case_id, photo.kind)) then
    raise exception 'La solicitud ya no admite cambios en sus fotos';
  end if;

  if exists (
    select 1
    from storage.objects
    where bucket_id = 'case-media'
      and name in (photo.image_path, photo.thumb_path)
  ) then
    raise exception 'Elimina primero los archivos de la foto';
  end if;

  delete from public.case_photos where id = photo.id;
end;
$$;

revoke all on function public.reserve_case_photo(uuid, public.photo_kind) from public, anon;
revoke all on function public.confirm_case_photo(uuid) from public, anon;
revoke all on function public.delete_case_photo(uuid) from public, anon;
grant execute on function public.reserve_case_photo(uuid, public.photo_kind) to authenticated;
grant execute on function public.confirm_case_photo(uuid) to authenticated;
grant execute on function public.delete_case_photo(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Políticas de Storage para `case-media`
-- ---------------------------------------------------------------------------

-- Lectura: la ruta es <empresa>/<solicitud>/<foto>/<archivo> y la solicitud debe ser
-- visible para el usuario (SECURITY INVOKER: aplica la RLS de cases).
create or replace function private.can_read_case_object(object_name text)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1
    from public.cases
    where cases.organization_id::text = (storage.foldername(object_name))[1]
      and cases.id::text = (storage.foldername(object_name))[2]
  );
$$;

-- Subida: solo a una ruta reservada por el mismo usuario, sin confirmar y mientras la
-- solicitud admite fotos de ese tipo.
create or replace function private.can_upload_case_object(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.case_photos
    where (case_photos.image_path = object_name or case_photos.thumb_path = object_name)
      and case_photos.uploaded_by = (select auth.uid())
      and case_photos.confirmed_at is null
      and (select private.can_manage_case_photos(case_photos.case_id, case_photos.kind))
  );
$$;

-- Borrado: quien puede gestionar las fotos de la solicitud mientras la admite.
create or replace function private.can_delete_case_object(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.case_photos
    where (case_photos.image_path = object_name or case_photos.thumb_path = object_name)
      and case_photos.organization_id = (select private.current_organization_id())
      and (select private.can_manage_case_photos(case_photos.case_id, case_photos.kind))
  );
$$;

revoke all on function private.can_read_case_object(text) from public, anon;
revoke all on function private.can_upload_case_object(text) from public, anon;
revoke all on function private.can_delete_case_object(text) from public, anon;
grant execute on function private.can_read_case_object(text) to authenticated;
grant execute on function private.can_upload_case_object(text) to authenticated;
grant execute on function private.can_delete_case_object(text) to authenticated;

create policy "Members can read media of visible cases"
on storage.objects
for select
to authenticated
using (bucket_id = 'case-media' and private.can_read_case_object(name));

create policy "Staff can upload reserved case photos"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'case-media' and private.can_upload_case_object(name));

create policy "Staff can delete case photos while editable"
on storage.objects
for delete
to authenticated
using (bucket_id = 'case-media' and private.can_delete_case_object(name));
