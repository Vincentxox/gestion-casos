-- Multiempresa, tipos de área y administración de miembros
-- (docs/BUSINESS_RULES.md, secciones 2, 3 y 4).
--
-- Reglas que aplica esta migración:
-- * Cada usuario pertenece como máximo a una empresa. Sin empresa no ve datos.
-- * La empresa del usuario solo la asigna el servidor (invitaciones); el cliente nunca
--   puede cambiarla.
-- * Áreas y categorías (tipos de servicio) pertenecen a una empresa.
-- * Los tipos de servicio solo pertenecen a áreas técnicas.
-- * Solo un administrador de la empresa cambia roles y áreas, y no puede quedar una
--   empresa sin administrador.

-- ---------------------------------------------------------------------------
-- Empresas
-- ---------------------------------------------------------------------------

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 120),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.organizations enable row level security;

create trigger organizations_set_updated_at
before update on public.organizations
for each row execute procedure private.set_updated_at();

alter table public.profiles
add column organization_id uuid references public.organizations (id) on delete restrict;

create index profiles_organization_id_idx on public.profiles (organization_id);

-- ---------------------------------------------------------------------------
-- Helpers de autorización.
-- SECURITY DEFINER es necesario para leer el perfil propio sin recursión de RLS.
-- Solo leen el perfil del usuario autenticado y no reciben parámetros del cliente.
-- ---------------------------------------------------------------------------

create or replace function private.current_organization_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select organization_id
  from public.profiles
  where id = (select auth.uid());
$$;

create or replace function private.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select role
  from public.profiles
  where id = (select auth.uid())
    and organization_id is not null;
$$;

create or replace function private.current_area_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select area_id
  from public.profiles
  where id = (select auth.uid())
    and organization_id is not null;
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and organization_id is not null
      and role = 'administrador'
  );
$$;

create or replace function private.has_role(expected_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and organization_id is not null
      and role = expected_role
  );
$$;

revoke all on function private.current_organization_id() from public, anon;
revoke all on function private.current_app_role() from public, anon;
revoke all on function private.current_area_id() from public, anon;
revoke all on function private.is_admin() from public, anon;
revoke all on function private.has_role(public.app_role) from public, anon;
grant execute on function private.current_organization_id() to authenticated;
grant execute on function private.current_app_role() to authenticated;
grant execute on function private.current_area_id() to authenticated;
grant execute on function private.is_admin() to authenticated;
grant execute on function private.has_role(public.app_role) to authenticated;

-- ---------------------------------------------------------------------------
-- Datos existentes: una empresa inicial para todos los usuarios actuales.
-- ---------------------------------------------------------------------------

create type public.area_kind as enum ('solicitante', 'tecnica');

alter table public.areas
add column organization_id uuid references public.organizations (id) on delete restrict,
add column kind public.area_kind not null default 'solicitante';

alter table public.categories
add column organization_id uuid references public.organizations (id) on delete restrict;

do $$
declare
  initial_organization_id uuid;
begin
  insert into public.organizations (name)
  values ('Organización inicial')
  returning id into initial_organization_id;

  update public.profiles set organization_id = initial_organization_id;
  update public.areas set organization_id = initial_organization_id;

  update public.areas
  set kind = 'tecnica'
  where name in ('Tecnología', 'Mantenimiento');

  update public.categories
  set organization_id = areas.organization_id
  from public.areas
  where areas.id = categories.area_id;

  -- Los tipos de servicio solo pertenecen a áreas técnicas.
  delete from public.categories
  using public.areas
  where areas.id = categories.area_id
    and areas.kind <> 'tecnica';
end $$;

alter table public.areas alter column organization_id set not null;
alter table public.categories alter column organization_id set not null;

drop index if exists public.areas_name_unique_idx;
drop index if exists public.areas_active_name_idx;
create unique index areas_organization_name_unique_idx
  on public.areas (organization_id, lower(btrim(name)));
create index areas_organization_active_name_idx
  on public.areas (organization_id, is_active, name);

create index categories_organization_id_idx on public.categories (organization_id);

-- ---------------------------------------------------------------------------
-- Validación de rol y área de un miembro
-- ---------------------------------------------------------------------------

create or replace function private.assert_member_access(
  target_organization_id uuid,
  target_role public.app_role,
  target_area_id uuid
)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  selected_area public.areas;
begin
  if target_area_id is not null then
    select * into selected_area
    from public.areas
    where id = target_area_id;

    if not found
      or selected_area.organization_id is distinct from target_organization_id
      or not selected_area.is_active then
      raise exception 'Área no disponible';
    end if;
  end if;

  if target_role in ('tecnico', 'jefe_area') and target_area_id is null then
    raise exception 'Este rol requiere un área asignada';
  end if;

  if target_role = 'tecnico' and selected_area.kind <> 'tecnica' then
    raise exception 'Un técnico debe pertenecer a un área técnica';
  end if;
end;
$$;

-- Se ejecuta desde el trigger de perfiles con el rol del usuario; solo valida y no
-- devuelve datos.
revoke all on function private.assert_member_access(uuid, public.app_role, uuid)
  from public, anon;
grant execute on function private.assert_member_access(uuid, public.app_role, uuid)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Perfiles
-- ---------------------------------------------------------------------------

drop trigger if exists profiles_protect_area_assignment on public.profiles;
drop function if exists private.protect_profile_area_assignment();

create or replace function private.guard_profile_changes()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.id is distinct from old.id then
    raise exception 'No se puede cambiar el identificador del usuario';
  end if;

  -- Solo el servidor (funciones SECURITY DEFINER) puede vincular a una empresa.
  if current_user in ('anon', 'authenticated')
    and new.organization_id is distinct from old.organization_id then
    raise exception 'No puedes cambiar la empresa del usuario';
  end if;

  if new.role is distinct from old.role or new.area_id is distinct from old.area_id then
    if current_user in ('anon', 'authenticated')
      and (
        not (select private.is_admin())
        or old.organization_id is distinct from (select private.current_organization_id())
      ) then
      raise exception 'Solo un administrador de la empresa puede cambiar el rol o el área';
    end if;

    if new.organization_id is not null then
      perform private.assert_member_access(new.organization_id, new.role, new.area_id);
    end if;

    if old.role = 'administrador'
      and new.role is distinct from 'administrador'
      and old.organization_id is not null
      and not exists (
        select 1
        from public.profiles
        where organization_id = old.organization_id
          and role = 'administrador'
          and id <> old.id
      ) then
      raise exception 'La empresa debe conservar al menos un administrador';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.guard_profile_changes() from public, anon, authenticated;

create trigger profiles_guard_changes
before update on public.profiles
for each row execute procedure private.guard_profile_changes();

drop policy if exists "Users can read their profile and admins can read all" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Admins can update user assignments" on public.profiles;

-- Los miembros de una empresa se ven entre sí (nombre, rol y área) para mostrar
-- solicitantes, técnicos y firmantes. La tabla no contiene datos sensibles.
create policy "Members can read profiles of their organization"
on public.profiles
for select
to authenticated
using (
  id = (select auth.uid())
  or (
    organization_id is not null
    and organization_id = (select private.current_organization_id())
  )
);

create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy "Administrators can update members of their organization"
on public.profiles
for update
to authenticated
using (
  organization_id = (select private.current_organization_id())
  and (select private.is_admin())
)
with check (
  organization_id = (select private.current_organization_id())
  and (select private.is_admin())
);

revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (full_name, avatar_url, role, area_id) on table public.profiles to authenticated;

create or replace function public.set_member_access(
  target_user_id uuid,
  new_role public.app_role,
  new_area_id uuid
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not (select private.is_admin()) then
    raise exception 'Acceso denegado';
  end if;

  update public.profiles
  set role = new_role,
      area_id = new_area_id
  where id = target_user_id
    and organization_id = (select private.current_organization_id());

  if not found then
    raise exception 'Usuario no encontrado';
  end if;
end;
$$;

revoke all on function public.set_member_access(uuid, public.app_role, uuid) from public, anon;
grant execute on function public.set_member_access(uuid, public.app_role, uuid)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Empresas: lectura para miembros y cambio de nombre para administradores
-- ---------------------------------------------------------------------------

create policy "Members can read their organization"
on public.organizations
for select
to authenticated
using (id = (select private.current_organization_id()));

create policy "Administrators can rename their organization"
on public.organizations
for update
to authenticated
using (id = (select private.current_organization_id()) and (select private.is_admin()))
with check (id = (select private.current_organization_id()) and (select private.is_admin()));

revoke all on table public.organizations from anon, authenticated;
grant select on table public.organizations to authenticated;
grant update (name) on table public.organizations to authenticated;

-- ---------------------------------------------------------------------------
-- Áreas
-- ---------------------------------------------------------------------------

create or replace function private.guard_area_changes()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if current_user in ('anon', 'authenticated') then
      new.organization_id := (select private.current_organization_id());
    end if;

    return new;
  end if;

  if new.organization_id is distinct from old.organization_id then
    raise exception 'No se puede cambiar la empresa de un área';
  end if;

  if new.kind is distinct from old.kind then
    if exists (select 1 from public.categories where area_id = old.id) then
      raise exception 'No puedes cambiar el tipo de un área que tiene tipos de servicio';
    end if;

    if exists (
      select 1
      from public.profiles
      where area_id = old.id
        and role = 'tecnico'
    ) then
      raise exception 'No puedes cambiar el tipo de un área que tiene técnicos';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.guard_area_changes() from public, anon, authenticated;

create trigger areas_guard_changes
before insert or update on public.areas
for each row execute procedure private.guard_area_changes();

drop policy if exists "Authenticated users can read active areas" on public.areas;
drop policy if exists "Administrators can create areas" on public.areas;
drop policy if exists "Administrators can update areas" on public.areas;

create policy "Members can read areas of their organization"
on public.areas
for select
to authenticated
using (
  organization_id = (select private.current_organization_id())
  and (is_active or (select private.is_admin()))
);

create policy "Administrators can create areas"
on public.areas
for insert
to authenticated
with check (
  organization_id = (select private.current_organization_id())
  and (select private.is_admin())
);

create policy "Administrators can update areas"
on public.areas
for update
to authenticated
using (
  organization_id = (select private.current_organization_id())
  and (select private.is_admin())
)
with check (
  organization_id = (select private.current_organization_id())
  and (select private.is_admin())
);

revoke all on table public.areas from anon, authenticated;
grant select on table public.areas to authenticated;
grant insert (name, description, kind) on table public.areas to authenticated;
grant update (name, description, kind, is_active) on table public.areas to authenticated;

-- ---------------------------------------------------------------------------
-- Categorías (tipos de servicio)
-- ---------------------------------------------------------------------------

create or replace function private.guard_category_changes()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  selected_area public.areas;
begin
  if tg_op = 'UPDATE' and new.organization_id is distinct from old.organization_id then
    raise exception 'No se puede cambiar la empresa de un tipo de servicio';
  end if;

  if tg_op = 'INSERT' or new.area_id is distinct from old.area_id then
    select * into selected_area
    from public.areas
    where id = new.area_id;

    if not found
      or (
        current_user in ('anon', 'authenticated')
        and selected_area.organization_id is distinct from (select private.current_organization_id())
      ) then
      raise exception 'Área no disponible';
    end if;

    if selected_area.kind <> 'tecnica' then
      raise exception 'Los tipos de servicio solo pertenecen a áreas técnicas';
    end if;

    if tg_op = 'UPDATE' and selected_area.organization_id is distinct from old.organization_id then
      raise exception 'Área no disponible';
    end if;

    new.organization_id := selected_area.organization_id;
  end if;

  return new;
end;
$$;

revoke all on function private.guard_category_changes() from public, anon, authenticated;

create trigger categories_guard_changes
before insert or update on public.categories
for each row execute procedure private.guard_category_changes();

drop policy if exists "Authenticated users can read active categories" on public.categories;
drop policy if exists "Administrators can create categories" on public.categories;
drop policy if exists "Administrators can update categories" on public.categories;

create policy "Members can read service types of their organization"
on public.categories
for select
to authenticated
using (
  organization_id = (select private.current_organization_id())
  and (
    (
      is_active
      and exists (
        select 1
        from public.areas
        where areas.id = categories.area_id
          and areas.is_active
      )
    )
    or (select private.is_admin())
  )
);

create policy "Administrators can create service types"
on public.categories
for insert
to authenticated
with check (
  organization_id = (select private.current_organization_id())
  and (select private.is_admin())
);

create policy "Administrators can update service types"
on public.categories
for update
to authenticated
using (
  organization_id = (select private.current_organization_id())
  and (select private.is_admin())
)
with check (
  organization_id = (select private.current_organization_id())
  and (select private.is_admin())
);

revoke all on table public.categories from anon, authenticated;
grant select on table public.categories to authenticated;
grant insert (area_id, name, description) on table public.categories to authenticated;
grant update (area_id, name, description, is_active) on table public.categories to authenticated;
