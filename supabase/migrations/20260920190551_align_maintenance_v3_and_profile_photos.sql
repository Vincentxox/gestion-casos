-- V3: el tipo describe la solicitud; la actividad describe el trabajo.
alter table public.solicitudes_mantenimiento
  add column id_tipo_actividad uuid references public.tipos_actividad (id) on delete restrict;

do $comprobar_tipos$
begin
  if exists (
    select 1 from public.actividades
    group by id_solicitud having count(distinct id_tipo_actividad) > 1
  ) then
    raise exception 'Hay actividades de tipos distintos en una misma solicitud; resuélvelas antes de migrar';
  end if;
end;
$comprobar_tipos$;

update public.solicitudes_mantenimiento s
set id_tipo_actividad = a.id_tipo_actividad
from (
  select distinct on (id_solicitud) id_solicitud, id_tipo_actividad
  from public.actividades order by id_solicitud, creado_en
) a
where a.id_solicitud = s.id;

do $comprobar_solicitudes$
begin
  if exists (select 1 from public.solicitudes_mantenimiento where id_tipo_actividad is null) then
    raise exception 'Hay solicitudes sin actividad: asígnales un tipo antes de migrar';
  end if;
end;
$comprobar_solicitudes$;

alter table public.solicitudes_mantenimiento
  alter column id_tipo_actividad set not null;
create index solicitudes_tipo_actividad_idx
  on public.solicitudes_mantenimiento (id_tipo_actividad);
grant update (id_tipo_actividad) on public.solicitudes_mantenimiento to authenticated;

-- El disparador conservaba una comparación con la columna que se retira.
create or replace function private.prepare_activity_change()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.estado <> 'pendiente' then raise exception 'Una actividad nueva debe iniciar pendiente'; end if;
    return new;
  end if;

  if private.has_role('tecnico') and not private.is_maintenance_manager() then
    if new.descripcion is distinct from old.descripcion
      or new.fecha_fin_prevista is distinct from old.fecha_fin_prevista then
      raise exception 'El técnico solo puede actualizar estado y observaciones';
    end if;
    if new.estado is distinct from old.estado and not (
      (old.estado = 'pendiente' and new.estado = 'en_proceso')
      or (old.estado = 'en_proceso' and new.estado = 'finalizada')
    ) then
      raise exception 'Cambio de estado no permitido';
    end if;
  end if;

  if new.estado is distinct from old.estado then
    if new.estado = 'en_proceso' then
      new.iniciada_en := coalesce(old.iniciada_en, now());
    end if;
    if new.estado = 'finalizada' then
      if not exists (
        select 1 from public.fotos_actividad where id_actividad = new.id
      ) then
        raise exception 'Se requiere al menos una fotografía para finalizar la actividad';
      end if;
      new.iniciada_en := coalesce(old.iniciada_en, now());
      new.finalizada_en := now();
    elsif old.estado = 'finalizada' then
      new.finalizada_en := null;
    end if;
  end if;
  return new;
end;
$$;

drop index if exists public.activities_type_idx;
alter table public.actividades drop column id_tipo_actividad;

-- El área del usuario se obtiene exclusivamente por su empleado.
do $comprobar_areas$
begin
  if exists (
    select 1 from public.perfiles p
    left join public.empleados e on e.id = p.id_empleado
    where p.id_area is not null and p.id_area is distinct from e.id_area
  ) then
    raise exception 'Hay áreas de perfiles que no coinciden con las de sus empleados';
  end if;
end;
$comprobar_areas$;

drop function public.set_user_area(uuid, uuid);
drop index if exists public.profiles_area_id_idx;
alter table public.perfiles drop column id_area;

-- Un técnico puede leer su ficha de empleado para resolver el área al iniciar sesión.
create policy "Leer ficha de empleado vinculada al perfil propio"
on public.empleados for select to authenticated
using (exists (
  select 1 from public.perfiles p
  where p.id = (select auth.uid()) and p.id_empleado = empleados.id
));

-- Fotos de actividades: solo se relacionan con actividades.
drop policy "Record assigned activity_photos" on public.fotos_actividad;
drop index if exists public.activity_photos_uploader_idx;
alter table public.fotos_actividad drop column id_usuario_carga;
create policy "Registrar fotos de actividad accesible"
on public.fotos_actividad for insert to authenticated
with check (private.can_access_activity(id_actividad));

-- Fotos de perfiles: tabla y bucket propios, sin relación con actividades.
create table public.fotos_perfil (
  id uuid primary key default gen_random_uuid(),
  id_perfil uuid not null unique references public.perfiles (id) on delete cascade,
  url_externa text,
  ruta_almacenamiento text unique,
  creado_en timestamptz not null default now(),
  check ((url_externa is not null)::integer + (ruta_almacenamiento is not null)::integer = 1),
  check (url_externa is null or char_length(url_externa) <= 2048),
  check (ruta_almacenamiento is null or ruta_almacenamiento like (id_perfil::text || '/%'))
);

insert into public.fotos_perfil (id_perfil, url_externa)
select p.id,
  coalesce(nullif(btrim(p.url_avatar), ''), nullif(btrim(u.raw_user_meta_data ->> 'avatar_url'), ''))
from public.perfiles p
join auth.users u on u.id = p.id
where coalesce(nullif(btrim(p.url_avatar), ''),
  nullif(btrim(u.raw_user_meta_data ->> 'avatar_url'), '')) ~ '^https?://';
alter table public.perfiles drop column url_avatar;

alter table public.fotos_perfil enable row level security;
revoke all on table public.fotos_perfil from anon, authenticated;
grant select, insert, update, delete on table public.fotos_perfil to authenticated;

create policy "Ver foto propia o de administración" on public.fotos_perfil
for select to authenticated
using (id_perfil = (select auth.uid()) or (select private.is_admin()));
create policy "Subir foto propia" on public.fotos_perfil
for insert to authenticated with check (id_perfil = (select auth.uid()));
create policy "Actualizar foto propia" on public.fotos_perfil
for update to authenticated
using (id_perfil = (select auth.uid()))
with check (id_perfil = (select auth.uid()));
create policy "Eliminar foto propia" on public.fotos_perfil
for delete to authenticated using (id_perfil = (select auth.uid()));

create trigger fotos_perfil_audit_changes
after insert or update or delete on public.fotos_perfil
for each row execute function private.record_maintenance_audit();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-photos', 'profile-photos', false, 5242880,
  array['image/jpeg', 'image/png', 'image/webp']);

create policy "Leer fotos de perfil autorizadas" on storage.objects
for select to authenticated
using (
  bucket_id = 'profile-photos'
  and ((storage.foldername(name))[1] = (select auth.uid())::text
    or (select private.is_admin()))
);
create policy "Subir foto al perfil propio" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
create policy "Eliminar foto del perfil propio" on storage.objects
for delete to authenticated
using (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- Los nuevos inicios de sesión de Google pueden traer una foto externa.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare avatar_url text := nullif(btrim(new.raw_user_meta_data ->> 'avatar_url'), '');
begin
  insert into public.perfiles (id, nombre_completo)
  values (
    new.id,
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
      split_part(new.email, '@', 1), 'Usuario')
  );
  if avatar_url ~ '^https?://' then
    insert into public.fotos_perfil (id_perfil, url_externa)
    values (new.id, avatar_url);
  end if;
  return new;
end;
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;

-- Una operación atómica evita solicitudes sin actividad si la segunda inserción falla.
create function public.crear_solicitud_con_actividad(
  p_numero_solicitud text,
  p_id_area uuid,
  p_id_equipo uuid,
  p_id_empleado uuid,
  p_fecha_solicitud date,
  p_id_tipo_actividad uuid,
  p_descripcion_solicitud text,
  p_descripcion_actividad text,
  p_prioridad public.prioridad_actividad
)
returns uuid language plpgsql security invoker set search_path = ''
as $$
declare solicitud_id uuid;
declare actividad_id uuid;
begin
  if auth.uid() is null or not private.is_maintenance_manager() then
    raise exception 'Acceso denegado';
  end if;
  if char_length(btrim(p_numero_solicitud)) not between 3 and 50 then
    raise exception 'El número de solicitud debe tener entre 3 y 50 caracteres';
  end if;
  if not exists (
    select 1 from public.empleados
    where id = p_id_empleado and id_area = p_id_area and activo
  ) then
    raise exception 'El empleado solicitante no pertenece al área seleccionada';
  end if;
  if p_id_equipo is not null and not exists (
    select 1 from public.equipos
    where id = p_id_equipo and id_area = p_id_area and activo
  ) then
    raise exception 'El equipo no está activo en el área seleccionada';
  end if;

  insert into public.solicitudes_mantenimiento
    (numero_solicitud, id_area, id_equipo, id_empleado_solicitante,
     fecha_solicitud, id_tipo_actividad, descripcion)
  values
    (btrim(p_numero_solicitud), p_id_area, p_id_equipo, p_id_empleado,
     p_fecha_solicitud, p_id_tipo_actividad, btrim(p_descripcion_solicitud))
  returning id into solicitud_id;

  insert into public.actividades (id_solicitud, descripcion, prioridad)
  values (solicitud_id, btrim(p_descripcion_actividad), p_prioridad)
  returning id into actividad_id;
  return actividad_id;
end;
$$;
revoke all on function public.crear_solicitud_con_actividad(
  text, uuid, uuid, uuid, date, uuid, text, text, public.prioridad_actividad
) from public, anon;
grant execute on function public.crear_solicitud_con_actividad(
  text, uuid, uuid, uuid, date, uuid, text, text, public.prioridad_actividad
) to authenticated;
