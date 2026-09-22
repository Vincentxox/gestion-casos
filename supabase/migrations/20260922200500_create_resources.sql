-- Catálogo de recursos y registro de uso por solicitud (docs/BUSINESS_RULES.md, sección 6).
--
-- * El administrador mantiene el catálogo de su empresa.
-- * El técnico asignado o el jefe del área técnica registran materiales, herramientas,
--   equipos y mano de obra mientras la solicitud está en ejecución o en espera.
-- * Cada registro guarda una copia del nombre, la unidad y el costo del recurso para que
--   la evidencia no cambie si luego se edita el catálogo.
-- * Sin control de inventario en el MVP.

create type public.resource_kind as enum ('material', 'herramienta', 'equipo');
create type public.usage_kind as enum ('recurso', 'mano_de_obra');

-- ---------------------------------------------------------------------------
-- Catálogo
-- ---------------------------------------------------------------------------

create table public.resources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  kind public.resource_kind not null,
  name text not null check (char_length(btrim(name)) between 2 and 120),
  description text check (
    description is null or char_length(btrim(description)) between 3 and 300
  ),
  unit text check (unit is null or char_length(btrim(unit)) between 1 and 30),
  unit_cost numeric(12, 2) check (unit_cost is null or unit_cost >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (kind <> 'material' or unit is not null)
);

create unique index resources_organization_name_unique_idx
  on public.resources (organization_id, lower(btrim(name)));
create index resources_organization_active_kind_idx
  on public.resources (organization_id, is_active, kind, name);

alter table public.resources enable row level security;

create trigger resources_set_updated_at
before update on public.resources
for each row execute procedure private.set_updated_at();

create or replace function private.guard_resource_changes()
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
  elsif new.organization_id is distinct from old.organization_id then
    raise exception 'No se puede cambiar la empresa de un recurso';
  end if;

  new.name := btrim(new.name);
  new.description := nullif(btrim(new.description), '');
  new.unit := nullif(btrim(new.unit), '');

  return new;
end;
$$;

revoke all on function private.guard_resource_changes() from public, anon, authenticated;

create trigger resources_guard_changes
before insert or update on public.resources
for each row execute procedure private.guard_resource_changes();

create policy "Members can read resources of their organization"
on public.resources
for select
to authenticated
using (
  organization_id = (select private.current_organization_id())
  and (is_active or (select private.is_admin()))
);

create policy "Administrators can create resources"
on public.resources
for insert
to authenticated
with check (
  organization_id = (select private.current_organization_id())
  and (select private.is_admin())
);

create policy "Administrators can update resources"
on public.resources
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

revoke all on table public.resources from anon, authenticated;
grant select on table public.resources to authenticated;
grant insert (kind, name, description, unit, unit_cost) on table public.resources to authenticated;
grant update (kind, name, description, unit, unit_cost, is_active)
  on table public.resources to authenticated;

-- ---------------------------------------------------------------------------
-- Registro de uso
-- ---------------------------------------------------------------------------

create table public.case_resource_usages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  case_id uuid not null references public.cases (id) on delete cascade,
  kind public.usage_kind not null,
  resource_id uuid references public.resources (id) on delete restrict,
  resource_kind public.resource_kind,
  resource_name text,
  unit text,
  unit_cost numeric(12, 2),
  quantity numeric(12, 3) check (quantity is null or (quantity > 0 and quantity <= 1000000)),
  hours numeric(7, 2) check (hours is null or (hours > 0 and hours <= 1000)),
  technician_id uuid references public.profiles (id) on delete restrict,
  notes text check (notes is null or char_length(btrim(notes)) between 3 and 300),
  registered_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (kind = 'recurso' and resource_id is not null and technician_id is null)
    or (
      kind = 'mano_de_obra'
      and resource_id is null
      and technician_id is not null
      and hours is not null
    )
  )
);

create index case_resource_usages_case_idx
  on public.case_resource_usages (case_id, created_at);
create index case_resource_usages_resource_idx
  on public.case_resource_usages (resource_id) where resource_id is not null;
create index case_resource_usages_technician_idx
  on public.case_resource_usages (technician_id) where technician_id is not null;
create index case_resource_usages_organization_idx
  on public.case_resource_usages (organization_id);

alter table public.case_resource_usages enable row level security;

create trigger case_resource_usages_set_updated_at
before update on public.case_resource_usages
for each row execute procedure private.set_updated_at();

-- ¿Puede el usuario autenticado registrar recursos en esta solicitud?
create or replace function private.can_register_case_usage(target_case_id uuid)
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
      and cases.status in ('en_ejecucion', 'en_espera')
      and (
        cases.assigned_to = profiles.id
        or (profiles.role = 'jefe_area' and profiles.area_id = cases.target_area_id)
      )
  );
$$;

revoke all on function private.can_register_case_usage(uuid) from public, anon;
grant execute on function private.can_register_case_usage(uuid) to authenticated;

create or replace function private.prepare_case_usage()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_case public.cases;
  selected_resource public.resources;
begin
  if tg_op = 'UPDATE' then
    if new.case_id is distinct from old.case_id
      or new.kind is distinct from old.kind
      or new.resource_id is distinct from old.resource_id
      or new.technician_id is distinct from old.technician_id then
      raise exception 'Solo puedes corregir cantidad, horas y notas';
    end if;
  else
    select * into target_case from public.cases where id = new.case_id;

    if not found then
      raise exception 'Solicitud no encontrada';
    end if;

    new.organization_id := target_case.organization_id;
    new.registered_by := (select auth.uid());

    if new.kind = 'recurso' then
      select * into selected_resource
      from public.resources
      where id = new.resource_id
        and organization_id = target_case.organization_id
        and is_active;

      if not found then
        raise exception 'Recurso no disponible';
      end if;

      new.resource_kind := selected_resource.kind;
      new.resource_name := selected_resource.name;
      new.unit := selected_resource.unit;
      new.unit_cost := selected_resource.unit_cost;
      new.technician_id := null;
    else
      if not exists (
        select 1
        from public.profiles
        where id = new.technician_id
          and organization_id = target_case.organization_id
          and area_id = target_case.target_area_id
          and role in ('tecnico', 'jefe_area')
      ) then
        raise exception 'El técnico debe pertenecer al área técnica de la solicitud';
      end if;

      new.resource_id := null;
      new.resource_kind := null;
      new.resource_name := null;
      new.unit := 'h';
      new.unit_cost := null;
      new.quantity := null;
    end if;
  end if;

  new.notes := nullif(btrim(new.notes), '');

  if new.kind = 'recurso' and new.resource_kind = 'material' and new.quantity is null then
    raise exception 'Indica la cantidad de material utilizada';
  end if;

  if new.kind = 'mano_de_obra' and new.hours is null then
    raise exception 'Indica las horas trabajadas';
  end if;

  return new;
end;
$$;

revoke all on function private.prepare_case_usage() from public, anon, authenticated;

create trigger case_resource_usages_prepare
before insert or update on public.case_resource_usages
for each row execute procedure private.prepare_case_usage();

create policy "Members can read usages of visible cases"
on public.case_resource_usages
for select
to authenticated
using (
  exists (
    select 1
    from public.cases
    where cases.id = case_resource_usages.case_id
  )
);

create policy "Assigned staff can register usages"
on public.case_resource_usages
for insert
to authenticated
with check (
  organization_id = (select private.current_organization_id())
  and registered_by = (select auth.uid())
  and (select private.can_register_case_usage(case_id))
);

create policy "Assigned staff can correct usages"
on public.case_resource_usages
for update
to authenticated
using ((select private.can_register_case_usage(case_id)))
with check ((select private.can_register_case_usage(case_id)));

create policy "Assigned staff can remove usages"
on public.case_resource_usages
for delete
to authenticated
using ((select private.can_register_case_usage(case_id)));

revoke all on table public.case_resource_usages from anon, authenticated;
grant select, delete on table public.case_resource_usages to authenticated;
grant insert (case_id, kind, resource_id, quantity, hours, technician_id, notes)
  on table public.case_resource_usages to authenticated;
grant update (quantity, hours, notes) on table public.case_resource_usages to authenticated;
