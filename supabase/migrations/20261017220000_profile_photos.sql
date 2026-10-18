-- Foto de perfil (BUSINESS_RULES 2.4, contrato C-017).
--
-- `profiles.avatar_url` existe desde la primera migración, pero nadie la usaba y cualquier
-- persona podía escribir ahí cualquier texto. Desde esta migración:
--
-- 1. Las fotos viven en el bucket privado `profile-photos`, en
--    `<empresa>/<persona>/<archivo>`. Cada persona sube y borra solo en su carpeta, con su
--    empresa activa.
-- 2. `avatar_url` guarda la ruta dentro del bucket, no una URL. Ya no se escribe
--    directamente: `set_profile_photo` comprueba que la ruta sea de la carpeta propia y
--    que el archivo exista, y `clear_profile_photo` la quita.
-- 3. Los miembros de la misma empresa leen solo la foto vigente de cada persona: la que
--    figura en su `avatar_url`. Una foto anterior o de alguien dado de baja no se lee.
-- 4. Al cambiar de empresa o darse de baja (2.2), `avatar_url` se vacía.

-- ---------------------------------------------------------------------------
-- 1. Bucket
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-photos', 'profile-photos', false, 1048576, array['image/jpeg', 'image/webp'])
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- 2. Rutas
-- ---------------------------------------------------------------------------

-- La ruta está en la carpeta de la persona autenticada, dentro de su empresa activa:
-- exactamente `<empresa>/<persona>/<archivo>`.
create or replace function private.is_own_profile_photo_path(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    array_length(storage.foldername(object_name), 1) = 2
      and (storage.foldername(object_name))[1] = (select private.current_organization_id())::text
      and (storage.foldername(object_name))[2] = (select auth.uid())::text
      and storage.filename(object_name) <> '',
    false
  );
$$;

revoke all on function private.is_own_profile_photo_path(text) from public, anon;
grant execute on function private.is_own_profile_photo_path(text) to authenticated;

-- La ruta es la foto vigente de un miembro de la empresa activa de quien la pide.
create or replace function private.can_read_profile_photo_object(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where profiles.avatar_url = object_name
      and profiles.organization_id = (select private.current_organization_id())
  );
$$;

revoke all on function private.can_read_profile_photo_object(text) from public, anon;
grant execute on function private.can_read_profile_photo_object(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Políticas de Storage
-- ---------------------------------------------------------------------------

create policy "Members upload photos to their own profile folder"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'profile-photos' and private.is_own_profile_photo_path(name));

create policy "Members read current profile photos of their organization"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'profile-photos'
  and (
    private.is_own_profile_photo_path(name)
    or private.can_read_profile_photo_object(name)
  )
);

create policy "Members remove photos from their own profile folder"
on storage.objects
for delete
to authenticated
using (bucket_id = 'profile-photos' and private.is_own_profile_photo_path(name));

-- ---------------------------------------------------------------------------
-- 4. avatar_url solo cambia mediante RPC
-- ---------------------------------------------------------------------------

revoke update (avatar_url) on table public.profiles from authenticated;

create or replace function public.set_profile_photo(photo_path text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
begin
  -- Bloquea el perfil antes de comprobar la empresa: una baja simultánea termina antes o
  -- espera, así que la foto nunca queda en un perfil ya desvinculado.
  perform 1 from public.profiles where id = current_user_id for update;

  if current_user_id is null or (select private.current_organization_id()) is null then
    raise exception 'Acceso denegado';
  end if;

  if not (select private.is_own_profile_photo_path(photo_path)) then
    raise exception 'La foto debe estar en tu carpeta de perfil';
  end if;

  if not exists (
    select 1
    from storage.objects
    where bucket_id = 'profile-photos'
      and name = photo_path
  ) then
    raise exception 'No se encontró la foto subida';
  end if;

  update public.profiles
  set avatar_url = photo_path
  where id = current_user_id;
end;
$$;

create or replace function public.clear_profile_photo()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null or (select private.current_organization_id()) is null then
    raise exception 'Acceso denegado';
  end if;

  update public.profiles
  set avatar_url = null
  where id = current_user_id;
end;
$$;

revoke all on function public.set_profile_photo(text) from public, anon;
revoke all on function public.clear_profile_photo() from public, anon;
grant execute on function public.set_profile_photo(text) to authenticated;
grant execute on function public.clear_profile_photo() to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Al cambiar de empresa o darse de baja, la foto deja de mostrarse
-- ---------------------------------------------------------------------------

create or replace function private.clear_profile_photo_on_organization_change()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.organization_id is distinct from old.organization_id then
    new.avatar_url := null;
  end if;
  return new;
end;
$$;

revoke all on function private.clear_profile_photo_on_organization_change()
  from public, anon, authenticated;

create trigger profiles_clear_photo_on_organization_change
before update of organization_id on public.profiles
for each row execute function private.clear_profile_photo_on_organization_change();
