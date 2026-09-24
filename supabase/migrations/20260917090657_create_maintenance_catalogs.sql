-- Base del dominio de mantenimiento. Auth y profiles provienen de la primera migración.
create or replace function private.has_role(expected_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = expected_role
  );
$$;

revoke all on function private.has_role(public.app_role) from public;
grant execute on function private.has_role(public.app_role) to authenticated;

create table public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 150),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index services_name_key on public.services (lower(btrim(name)));

create table public.areas (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services (id) on delete restrict,
  name text not null check (char_length(btrim(name)) between 2 and 200),
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index areas_service_name_key on public.areas (service_id, lower(btrim(name)));
create index areas_service_id_idx on public.areas (service_id);

create table public.job_titles (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 80),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index job_titles_name_key on public.job_titles (lower(btrim(name)));

create table public.employees (
  id uuid primary key default gen_random_uuid(),
  area_id uuid not null references public.areas (id) on delete restrict,
  job_title_id uuid not null references public.job_titles (id) on delete restrict,
  first_name text not null check (char_length(btrim(first_name)) between 2 and 100),
  last_name text not null check (char_length(btrim(last_name)) between 2 and 100),
  email text,
  birth_date date,
  address text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (email is null or (char_length(email) <= 254 and position('@' in email) > 1))
);
create index employees_area_id_idx on public.employees (area_id);
create index employees_job_title_id_idx on public.employees (job_title_id);
create unique index employees_email_key on public.employees (lower(btrim(email))) where email is not null;

create table public.equipment_types (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 100),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index equipment_types_name_key on public.equipment_types (lower(btrim(name)));

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 80),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index brands_name_key on public.brands (lower(btrim(name)));

create table public.models (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands (id) on delete restrict,
  name text not null check (char_length(btrim(name)) between 1 and 100),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index models_brand_name_key on public.models (brand_id, lower(btrim(name)));
create index models_brand_id_idx on public.models (brand_id);

create table public.equipment (
  id uuid primary key default gen_random_uuid(),
  area_id uuid not null references public.areas (id) on delete restrict,
  model_id uuid not null references public.models (id) on delete restrict,
  equipment_type_id uuid not null references public.equipment_types (id) on delete restrict,
  serial_number text not null check (char_length(btrim(serial_number)) between 2 and 100),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index equipment_serial_key on public.equipment (lower(btrim(serial_number)));
create index equipment_area_id_idx on public.equipment (area_id);
create index equipment_model_id_idx on public.equipment (model_id);
create index equipment_type_id_idx on public.equipment (equipment_type_id);

create table public.activity_types (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 80),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index activity_types_name_key on public.activity_types (lower(btrim(name)));
insert into public.activity_types (name) values
  ('Preventivo'), ('Correctivo'), ('Predictivo');

create table public.supplies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 100),
  description text,
  quantity_on_hand integer not null default 0 check (quantity_on_hand >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index supplies_name_key on public.supplies (lower(btrim(name)));

create table public.spare_parts (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 100),
  description text,
  quantity_on_hand integer not null default 0 check (quantity_on_hand >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index spare_parts_name_key on public.spare_parts (lower(btrim(name)));

-- Solo personal de mantenimiento accede a los catálogos; únicamente el administrador los modifica.
do $catalogs$
declare catalog_name text;
begin
  foreach catalog_name in array array[
    'services', 'areas', 'job_titles', 'employees', 'equipment_types',
    'brands', 'models', 'equipment', 'activity_types', 'supplies', 'spare_parts'
  ] loop
    execute format('alter table public.%I enable row level security', catalog_name);
    execute format('revoke all on table public.%I from anon, authenticated', catalog_name);
    execute format('grant select, insert, update on table public.%I to authenticated', catalog_name);
    execute format(
      'create policy %I on public.%I for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()))',
      'Admins manage ' || catalog_name, catalog_name
    );
    if catalog_name = 'employees' then
      execute format(
        'create policy %I on public.%I for select to authenticated using ((select private.has_role(''coordinador'')))',
        'Coordinators read ' || catalog_name, catalog_name
      );
    else
      execute format(
        'create policy %I on public.%I for select to authenticated using ((select private.has_role(''coordinador'')) or (select private.has_role(''tecnico'')))',
        'Maintenance staff read ' || catalog_name, catalog_name
      );
    end if;
    execute format(
      'create trigger %I before update on public.%I for each row execute function private.set_updated_at()',
      catalog_name || '_set_updated_at', catalog_name
    );
  end loop;
end;
$catalogs$;

-- El perfil sigue vinculado a auth.users; el empleado solo se asocia si tiene acceso a la app.
alter table public.profiles
  add column area_id uuid references public.areas (id) on delete set null,
  add column employee_id uuid references public.employees (id) on delete set null;
create index profiles_area_id_idx on public.profiles (area_id);
create unique index profiles_employee_id_key on public.profiles (employee_id) where employee_id is not null;

create policy "Coordinators read technician profiles"
on public.profiles for select to authenticated
using ((select private.has_role('coordinador')) and role = 'tecnico');

create or replace function public.set_user_area(target_user_id uuid, new_area_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select private.is_admin()) then raise exception 'Acceso denegado'; end if;
  if new_area_id is not null and not exists (
    select 1 from public.areas where id = new_area_id and is_active
  ) then raise exception 'Área no disponible'; end if;
  update public.profiles set area_id = new_area_id where id = target_user_id;
  if not found then raise exception 'Usuario no encontrado'; end if;
end;
$$;
revoke all on function public.set_user_area(uuid, uuid) from public;
grant execute on function public.set_user_area(uuid, uuid) to authenticated;

create or replace function public.set_user_employee(target_user_id uuid, new_employee_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select private.is_admin()) then raise exception 'Acceso denegado'; end if;
  if new_employee_id is not null and not exists (
    select 1 from public.employees where id = new_employee_id and is_active
  ) then raise exception 'Empleado no disponible'; end if;
  update public.profiles set employee_id = new_employee_id where id = target_user_id;
  if not found then raise exception 'Usuario no encontrado'; end if;
end;
$$;
revoke all on function public.set_user_employee(uuid, uuid) from public;
grant execute on function public.set_user_employee(uuid, uuid) to authenticated;
