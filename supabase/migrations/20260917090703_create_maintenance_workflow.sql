create type public.maintenance_status as enum ('pendiente', 'en_proceso', 'finalizada');

create table public.maintenance_requests (
  id uuid primary key default gen_random_uuid(),
  request_number text not null unique default (
    'SOL-' || to_char(now(), 'YYYY') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
  ),
  area_id uuid not null references public.areas (id) on delete restrict,
  equipment_id uuid references public.equipment (id) on delete restrict,
  requester_employee_id uuid not null references public.employees (id) on delete restrict,
  description text not null check (char_length(btrim(description)) between 10 and 2000),
  requested_on date not null default current_date,
  status public.maintenance_status not null default 'pendiente',
  submitted_by uuid not null default auth.uid() references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index maintenance_requests_area_idx on public.maintenance_requests (area_id);
create index maintenance_requests_equipment_idx on public.maintenance_requests (equipment_id) where equipment_id is not null;
create index maintenance_requests_employee_idx on public.maintenance_requests (requester_employee_id);
create index maintenance_requests_submitter_idx on public.maintenance_requests (submitted_by);
create index maintenance_requests_status_date_idx on public.maintenance_requests (status, requested_on desc);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.maintenance_requests (id) on delete restrict,
  activity_type_id uuid not null references public.activity_types (id) on delete restrict,
  description text not null check (char_length(btrim(description)) between 10 and 2000),
  observations text,
  status public.maintenance_status not null default 'pendiente',
  planned_end_date date,
  started_at timestamptz,
  completed_at timestamptz,
  created_by uuid not null default auth.uid() references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (completed_at is null or started_at is not null)
);
create index activities_request_idx on public.activities (request_id);
create index activities_type_idx on public.activities (activity_type_id);
create index activities_creator_idx on public.activities (created_by);
create index activities_status_idx on public.activities (status, created_at desc);

create table public.activity_assignments (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities (id) on delete restrict,
  technician_id uuid not null references public.profiles (id) on delete restrict,
  assigned_by uuid not null default auth.uid() references public.profiles (id) on delete restrict,
  is_active boolean not null default true,
  assigned_at timestamptz not null default now(),
  unique (activity_id, technician_id)
);
create index activity_assignments_technician_idx on public.activity_assignments (technician_id, is_active);

create table public.activity_supplies (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities (id) on delete restrict,
  supply_id uuid not null references public.supplies (id) on delete restrict,
  quantity integer not null check (quantity > 0),
  recorded_by uuid not null default auth.uid() references public.profiles (id) on delete restrict,
  recorded_at timestamptz not null default now()
);
create index activity_supplies_activity_idx on public.activity_supplies (activity_id);
create index activity_supplies_supply_idx on public.activity_supplies (supply_id);
create index activity_supplies_recorder_idx on public.activity_supplies (recorded_by);

create table public.activity_spare_parts (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities (id) on delete restrict,
  spare_part_id uuid not null references public.spare_parts (id) on delete restrict,
  quantity integer not null check (quantity > 0),
  recorded_by uuid not null default auth.uid() references public.profiles (id) on delete restrict,
  recorded_at timestamptz not null default now()
);
create index activity_spare_parts_activity_idx on public.activity_spare_parts (activity_id);
create index activity_spare_parts_part_idx on public.activity_spare_parts (spare_part_id);
create index activity_spare_parts_recorder_idx on public.activity_spare_parts (recorded_by);

create table public.activity_photos (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities (id) on delete restrict,
  storage_path text not null unique check (char_length(storage_path) between 40 and 300),
  caption text,
  uploaded_by uuid not null default auth.uid() references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  check (storage_path like (activity_id::text || '/%'))
);
create index activity_photos_activity_idx on public.activity_photos (activity_id);
create index activity_photos_uploader_idx on public.activity_photos (uploaded_by);

create table public.activity_status_history (
  id bigint generated always as identity primary key,
  activity_id uuid not null references public.activities (id) on delete restrict,
  previous_status public.maintenance_status,
  new_status public.maintenance_status not null,
  changed_by uuid references public.profiles (id) on delete set null,
  changed_at timestamptz not null default now()
);
create index activity_status_history_activity_idx on public.activity_status_history (activity_id, changed_at desc);
create index activity_status_history_actor_idx on public.activity_status_history (changed_by) where changed_by is not null;

create or replace function private.is_maintenance_manager()
returns boolean language sql stable security definer set search_path = ''
as $$ select private.is_admin() or private.has_role('coordinador'); $$;
revoke all on function private.is_maintenance_manager() from public;
grant execute on function private.is_maintenance_manager() to authenticated;

create or replace function private.is_assigned_to_activity(target_activity_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select private.has_role('tecnico') and exists (
    select 1 from public.activity_assignments
    where activity_id = target_activity_id
      and technician_id = (select auth.uid())
      and is_active
  );
$$;
revoke all on function private.is_assigned_to_activity(uuid) from public;
grant execute on function private.is_assigned_to_activity(uuid) to authenticated;

create or replace function private.can_access_activity(target_activity_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select private.is_maintenance_manager()
    or private.is_assigned_to_activity(target_activity_id);
$$;
revoke all on function private.can_access_activity(uuid) from public;
grant execute on function private.can_access_activity(uuid) to authenticated;

create or replace function private.can_access_request(target_request_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select private.is_maintenance_manager() or (private.has_role('tecnico') and exists (
    select 1 from public.activities a
    join public.activity_assignments aa on aa.activity_id = a.id
    where a.request_id = target_request_id
      and aa.technician_id = (select auth.uid())
      and aa.is_active
  ));
$$;
revoke all on function private.can_access_request(uuid) from public;
grant execute on function private.can_access_request(uuid) to authenticated;

-- Un equipo seleccionado debe pertenecer al área de la solicitud.
create or replace function private.validate_request_equipment()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if new.equipment_id is not null and not exists (
    select 1 from public.equipment
    where id = new.equipment_id and area_id = new.area_id
  ) then
    raise exception 'El equipo no pertenece al área de la solicitud';
  end if;
  return new;
end;
$$;
revoke all on function private.validate_request_equipment() from public;
create trigger maintenance_requests_validate_equipment
before insert or update of area_id, equipment_id on public.maintenance_requests
for each row execute function private.validate_request_equipment();

-- Las asignaciones solo pueden apuntar a perfiles de técnicos.
create or replace function private.validate_technician_assignment()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.is_active and not exists (
    select 1 from public.profiles where id = new.technician_id and role = 'tecnico'
  ) then
    raise exception 'El perfil asignado debe tener rol de técnico';
  end if;
  return new;
end;
$$;
revoke all on function private.validate_technician_assignment() from public;
create trigger activity_assignments_validate_technician
before insert or update of technician_id, is_active on public.activity_assignments
for each row execute function private.validate_technician_assignment();

-- Cada archivo se sube primero a Storage y después se registra en esta tabla.
create or replace function private.validate_activity_photo()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (
    select 1 from storage.objects
    where bucket_id = 'activity-photos' and name = new.storage_path
  ) then
    raise exception 'La fotografía no existe en Storage';
  end if;
  return new;
end;
$$;
revoke all on function private.validate_activity_photo() from public;
create trigger activity_photos_validate_storage
before insert on public.activity_photos
for each row execute function private.validate_activity_photo();

-- El técnico cambia estado y observaciones; el coordinador o administrador edita los demás campos.
create or replace function private.prepare_activity_change()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.status <> 'pendiente' then raise exception 'Una actividad nueva debe iniciar pendiente'; end if;
    return new;
  end if;

  if private.has_role('tecnico') and not private.is_maintenance_manager() then
    if new.activity_type_id is distinct from old.activity_type_id
      or new.description is distinct from old.description
      or new.planned_end_date is distinct from old.planned_end_date then
      raise exception 'El técnico solo puede actualizar estado y observaciones';
    end if;
    if new.status is distinct from old.status and not (
      (old.status = 'pendiente' and new.status = 'en_proceso')
      or (old.status = 'en_proceso' and new.status = 'finalizada')
    ) then
      raise exception 'Cambio de estado no permitido';
    end if;
  end if;

  if new.status is distinct from old.status then
    if new.status = 'en_proceso' then new.started_at := coalesce(old.started_at, now()); end if;
    if new.status = 'finalizada' then
      if not exists (
        select 1 from public.activity_photos where activity_id = new.id
      ) then
        raise exception 'Se requiere al menos una fotografía para finalizar la actividad';
      end if;
      new.started_at := coalesce(old.started_at, now());
      new.completed_at := now();
    elsif old.status = 'finalizada' then
      new.completed_at := null;
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.prepare_activity_change() from public;
create trigger activities_prepare_change
before insert or update on public.activities
for each row execute function private.prepare_activity_change();

create or replace function private.record_activity_status()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.activity_status_history (activity_id, previous_status, new_status, changed_by)
    values (new.id, null, new.status, auth.uid());
  elsif old.status is distinct from new.status then
    insert into public.activity_status_history (activity_id, previous_status, new_status, changed_by)
    values (new.id, old.status, new.status, auth.uid());
  end if;
  return new;
end;
$$;
revoke all on function private.record_activity_status() from public;
create trigger activities_record_status
after insert or update of status on public.activities
for each row execute function private.record_activity_status();

create or replace function private.sync_request_status()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare next_status public.maintenance_status;
begin
  select case
    when count(*) = 0 then 'pendiente'::public.maintenance_status
    when bool_and(status = 'finalizada') then 'finalizada'::public.maintenance_status
    when bool_or(status = 'en_proceso' or status = 'finalizada') then 'en_proceso'::public.maintenance_status
    else 'pendiente'::public.maintenance_status
  end into next_status
  from public.activities where request_id = new.request_id;

  update public.maintenance_requests
  set status = next_status
  where id = new.request_id and status is distinct from next_status;
  return new;
end;
$$;
revoke all on function private.sync_request_status() from public;
create trigger activities_sync_request_status
after insert or update of status on public.activities
for each row execute function private.sync_request_status();

-- El consumo descuenta existencias de forma atómica; las filas de consumo son inmutables.
create or replace function private.consume_activity_supply()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  update public.supplies
  set quantity_on_hand = quantity_on_hand - new.quantity
  where id = new.supply_id and is_active and quantity_on_hand >= new.quantity;
  if not found then raise exception 'Insumo inactivo o existencias insuficientes'; end if;
  return new;
end;
$$;
revoke all on function private.consume_activity_supply() from public;
create trigger activity_supplies_consume
after insert on public.activity_supplies
for each row execute function private.consume_activity_supply();

create or replace function private.consume_activity_spare_part()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  update public.spare_parts
  set quantity_on_hand = quantity_on_hand - new.quantity
  where id = new.spare_part_id and is_active and quantity_on_hand >= new.quantity;
  if not found then raise exception 'Repuesto inactivo o existencias insuficientes'; end if;
  return new;
end;
$$;
revoke all on function private.consume_activity_spare_part() from public;
create trigger activity_spare_parts_consume
after insert on public.activity_spare_parts
for each row execute function private.consume_activity_spare_part();

do $workflow$
declare table_name text;
begin
  foreach table_name in array array[
    'maintenance_requests', 'activities', 'activity_assignments',
    'activity_supplies', 'activity_spare_parts', 'activity_photos', 'activity_status_history'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on table public.%I from anon, authenticated', table_name);
    execute format('grant select, insert on table public.%I to authenticated', table_name);
  end loop;
end;
$workflow$;

revoke insert on public.activity_status_history from authenticated;
grant update (area_id, equipment_id, requester_employee_id, description, requested_on)
  on public.maintenance_requests to authenticated;
grant update (activity_type_id, description, observations, status, planned_end_date)
  on public.activities to authenticated;
grant update (is_active) on public.activity_assignments to authenticated;

create policy "Authorized staff read requests" on public.maintenance_requests
for select to authenticated using (private.can_access_request(id));
create policy "Managers create requests" on public.maintenance_requests
for insert to authenticated
with check ((select private.is_maintenance_manager()) and submitted_by = (select auth.uid()) and status = 'pendiente');
create policy "Managers update requests" on public.maintenance_requests
for update to authenticated
using ((select private.is_maintenance_manager()))
with check ((select private.is_maintenance_manager()));

create policy "Authorized staff read activities" on public.activities
for select to authenticated using (private.can_access_activity(id));
create policy "Managers create activities" on public.activities
for insert to authenticated
with check ((select private.is_maintenance_manager()) and created_by = (select auth.uid()) and status = 'pendiente');
create policy "Assigned staff update activities" on public.activities
for update to authenticated
using (private.can_access_activity(id)) with check (private.can_access_activity(id));

create policy "Staff read own assignments" on public.activity_assignments
for select to authenticated
using (
  (select private.is_maintenance_manager())
  or ((select private.has_role('tecnico')) and technician_id = (select auth.uid()))
);
create policy "Managers assign technicians" on public.activity_assignments
for insert to authenticated
with check ((select private.is_maintenance_manager()) and assigned_by = (select auth.uid()));
create policy "Managers change assignments" on public.activity_assignments
for update to authenticated
using ((select private.is_maintenance_manager()))
with check ((select private.is_maintenance_manager()));

do $children$
declare table_name text;
begin
  foreach table_name in array array[
    'activity_supplies', 'activity_spare_parts', 'activity_photos'
  ] loop
    execute format(
      'create policy %I on public.%I for select to authenticated using (private.can_access_activity(activity_id))',
      'Read assigned ' || table_name, table_name
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (private.can_access_activity(activity_id) and %I = (select auth.uid()))',
      'Record assigned ' || table_name, table_name,
      case when table_name = 'activity_photos' then 'uploaded_by' else 'recorded_by' end
    );
  end loop;
end;
$children$;

create policy "Read assigned activity status history" on public.activity_status_history
for select to authenticated using (private.can_access_activity(activity_id));

create trigger maintenance_requests_set_updated_at
before update on public.maintenance_requests
for each row execute function private.set_updated_at();
create trigger activities_set_updated_at
before update on public.activities
for each row execute function private.set_updated_at();

-- Los binarios van a un bucket privado; la tabla activity_photos guarda solo rutas y metadatos.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('activity-photos', 'activity-photos', false, 10485760,
  array['image/jpeg', 'image/png', 'image/webp']);

create or replace function private.activity_id_from_path(object_path text)
returns uuid language plpgsql immutable set search_path = ''
as $$
declare first_segment text := split_part(object_path, '/', 1);
begin
  if first_segment ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
    return first_segment::uuid;
  end if;
  return null;
end;
$$;
revoke all on function private.activity_id_from_path(text) from public;
grant execute on function private.activity_id_from_path(text) to authenticated;

create policy "Maintenance staff upload activity photos" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'activity-photos'
  and private.can_access_activity(private.activity_id_from_path(name))
);
create policy "Maintenance staff read activity photos" on storage.objects
for select to authenticated
using (
  bucket_id = 'activity-photos'
  and private.can_access_activity(private.activity_id_from_path(name))
);
