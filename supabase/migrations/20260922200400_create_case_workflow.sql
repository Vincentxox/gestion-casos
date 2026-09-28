-- Flujo de solicitudes de mantenimiento (docs/BUSINESS_RULES.md, sección 5).
--
-- * Una solicitud nace en `solicitado`, con el área del creador como área solicitante y
--   el área técnica de su tipo de servicio como área destino.
-- * El estado solo cambia mediante `public.transition_case`, que valida rol, estado y
--   transición. El cliente no tiene permiso de UPDATE sobre estado ni asignación.
-- * Cada acción queda en `public.case_events`, que no se edita ni se borra.
-- * Las transiciones del reporte y sus firmas (reporte_enviado, validado, aprobado) se
--   implementarán con el módulo de reportes; hoy ninguna acción puede alcanzarlas.

create type public.case_status as enum (
  'solicitado',
  'aceptado',
  'rechazado',
  'cancelado',
  'asignado',
  'en_ejecucion',
  'en_espera',
  'reporte_enviado',
  'validado',
  'aprobado'
);

create type public.case_action as enum (
  'crear',
  'aceptar',
  'rechazar',
  'cancelar',
  'asignar',
  'reasignar',
  'iniciar',
  'pausar',
  'reanudar',
  'enviar_reporte',
  'validar_reporte',
  'devolver_reporte',
  'aprobar_reporte'
);

-- ---------------------------------------------------------------------------
-- Numeración por empresa y año
-- ---------------------------------------------------------------------------

create table private.case_number_counters (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  year integer not null,
  last_value integer not null,
  primary key (organization_id, year)
);

revoke all on table private.case_number_counters from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Solicitudes
-- ---------------------------------------------------------------------------

create table public.cases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  case_number text not null,
  title text not null check (char_length(btrim(title)) between 5 and 120),
  description text not null check (char_length(btrim(description)) between 10 and 2000),
  location text not null check (char_length(btrim(location)) between 3 and 180),
  priority public.case_priority not null default 'media',
  status public.case_status not null default 'solicitado',
  category_id uuid not null references public.categories (id) on delete restrict,
  requesting_area_id uuid not null references public.areas (id) on delete restrict,
  target_area_id uuid not null references public.areas (id) on delete restrict,
  created_by uuid not null references public.profiles (id) on delete restrict,
  assigned_to uuid references public.profiles (id) on delete restrict,
  accepted_at timestamptz,
  assigned_at timestamptz,
  started_at timestamptz,
  closed_at timestamptz,
  status_changed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, case_number)
);

create index cases_organization_status_created_idx
  on public.cases (organization_id, status, created_at desc);
create index cases_organization_created_idx on public.cases (organization_id, created_at desc);
create index cases_requesting_area_idx on public.cases (requesting_area_id, created_at desc);
create index cases_target_area_idx on public.cases (target_area_id, created_at desc);
create index cases_created_by_idx on public.cases (created_by);
create index cases_assigned_to_idx on public.cases (assigned_to) where assigned_to is not null;
create index cases_category_idx on public.cases (category_id);

alter table public.cases enable row level security;

create trigger cases_set_updated_at
before update on public.cases
for each row execute procedure private.set_updated_at();

-- Completa los datos que el cliente no puede enviar. SECURITY DEFINER para usar el
-- contador privado; solo actúa sobre el usuario autenticado.
create or replace function private.prepare_new_case()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  member public.profiles;
  service_area_id uuid;
  case_year integer := extract(year from now())::integer;
  sequence_value integer;
begin
  select * into member from public.profiles where id = current_user_id;

  if current_user_id is null or member.organization_id is null then
    raise exception 'Tu cuenta no está vinculada a una empresa';
  end if;

  if member.role = 'auditor' then
    raise exception 'El rol auditor no puede crear solicitudes';
  end if;

  if member.area_id is null then
    raise exception 'Necesitas un área asignada para crear solicitudes';
  end if;

  select categories.area_id into service_area_id
  from public.categories
  join public.areas on areas.id = categories.area_id
  where categories.id = new.category_id
    and categories.organization_id = member.organization_id
    and categories.is_active
    and areas.is_active
    and areas.kind = 'tecnica';

  if service_area_id is null then
    raise exception 'Selecciona un tipo de servicio disponible';
  end if;

  insert into private.case_number_counters (organization_id, year, last_value)
  values (member.organization_id, case_year, 1)
  on conflict (organization_id, year)
  do update set last_value = case_number_counters.last_value + 1
  returning last_value into sequence_value;

  new.organization_id := member.organization_id;
  new.case_number := format('CAS-%s-%s', case_year, lpad(sequence_value::text, 5, '0'));
  new.title := btrim(new.title);
  new.description := btrim(new.description);
  new.location := btrim(new.location);
  new.status := 'solicitado';
  new.requesting_area_id := member.area_id;
  new.target_area_id := service_area_id;
  new.created_by := current_user_id;
  new.assigned_to := null;
  new.accepted_at := null;
  new.assigned_at := null;
  new.started_at := null;
  new.closed_at := null;
  new.status_changed_at := now();
  new.created_at := now();
  new.updated_at := now();

  return new;
end;
$$;

revoke all on function private.prepare_new_case() from public, anon, authenticated;

create trigger cases_prepare_new
before insert on public.cases
for each row execute procedure private.prepare_new_case();

-- Edición de datos por el cliente (título, descripción, ubicación, prioridad y tipo).
create or replace function private.guard_case_changes()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  service_area_id uuid;
begin
  -- Las transiciones se hacen desde funciones del servidor.
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

  if old.status in ('rechazado', 'cancelado', 'aprobado') then
    raise exception 'La solicitud está cerrada';
  end if;

  new.title := btrim(new.title);
  new.description := btrim(new.description);
  new.location := btrim(new.location);

  if new.category_id is distinct from old.category_id then
    if old.status <> 'solicitado' then
      raise exception 'Solo puedes cambiar el tipo de servicio mientras la solicitud está pendiente';
    end if;

    select categories.area_id into service_area_id
    from public.categories
    join public.areas on areas.id = categories.area_id
    where categories.id = new.category_id
      and categories.organization_id = old.organization_id
      and categories.is_active
      and areas.is_active
      and areas.kind = 'tecnica';

    if service_area_id is null then
      raise exception 'Selecciona un tipo de servicio disponible';
    end if;

    new.target_area_id := service_area_id;
  end if;

  return new;
end;
$$;

revoke all on function private.guard_case_changes() from public, anon, authenticated;

create trigger cases_guard_changes
before update on public.cases
for each row execute procedure private.guard_case_changes();

-- Visibilidad (sección 5.4).
create policy "Members can read visible cases"
on public.cases
for select
to authenticated
using (
  organization_id = (select private.current_organization_id())
  and (
    (select private.current_app_role()) in ('administrador', 'auditor')
    or created_by = (select auth.uid())
    or requesting_area_id = (select private.current_area_id())
    or (
      target_area_id = (select private.current_area_id())
      and (select private.current_app_role()) in ('tecnico', 'jefe_area')
    )
  )
);

create policy "Members can create cases"
on public.cases
for insert
to authenticated
with check (
  organization_id = (select private.current_organization_id())
  and created_by = (select auth.uid())
);

-- Edición de datos: el creador mientras la solicitud está pendiente; el jefe del área
-- destino y el administrador mientras no esté cerrada.
create policy "Authorized members can edit case data"
on public.cases
for update
to authenticated
using (
  organization_id = (select private.current_organization_id())
  and status not in ('rechazado', 'cancelado', 'aprobado')
  and (
    (created_by = (select auth.uid()) and status = 'solicitado')
    or (select private.is_admin())
    or (
      (select private.current_app_role()) = 'jefe_area'
      and target_area_id = (select private.current_area_id())
    )
  )
)
with check (organization_id = (select private.current_organization_id()));

revoke all on table public.cases from anon, authenticated;
grant select on table public.cases to authenticated;
grant insert (title, description, location, priority, category_id)
  on table public.cases to authenticated;
grant update (title, description, location, priority, category_id)
  on table public.cases to authenticated;

-- ---------------------------------------------------------------------------
-- Historial de acciones
-- ---------------------------------------------------------------------------

create table public.case_events (
  id bigint generated always as identity primary key,
  case_id uuid not null references public.cases (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  action public.case_action not null,
  from_status public.case_status,
  to_status public.case_status not null,
  actor_id uuid references public.profiles (id) on delete set null,
  actor_role public.app_role,
  assignee_id uuid references public.profiles (id) on delete set null,
  comment text check (comment is null or char_length(btrim(comment)) between 3 and 500),
  created_at timestamptz not null default now()
);

create index case_events_case_created_idx on public.case_events (case_id, created_at desc);
create index case_events_actor_idx on public.case_events (actor_id);
create index case_events_assignee_idx on public.case_events (assignee_id)
  where assignee_id is not null;

alter table public.case_events enable row level security;

create policy "Members can read events of visible cases"
on public.case_events
for select
to authenticated
using (
  exists (
    select 1
    from public.cases
    where cases.id = case_events.case_id
  )
);

revoke all on table public.case_events from anon, authenticated;
grant select on table public.case_events to authenticated;

create or replace function private.record_case_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.case_events (
    case_id,
    organization_id,
    action,
    from_status,
    to_status,
    actor_id,
    actor_role
  )
  select
    new.id,
    new.organization_id,
    'crear',
    null,
    new.status,
    new.created_by,
    profiles.role
  from public.profiles
  where profiles.id = new.created_by;

  return null;
end;
$$;

revoke all on function private.record_case_created() from public, anon, authenticated;

create trigger cases_record_created
after insert on public.cases
for each row execute procedure private.record_case_created();

-- ---------------------------------------------------------------------------
-- Transiciones (sección 5.3)
--
-- SECURITY DEFINER es necesario para que el estado y la asignación solo cambien aquí:
-- el cliente no tiene permiso de UPDATE sobre esas columnas. La función valida
-- empresa, rol, estado y reglas de cada acción con el usuario autenticado.
-- ---------------------------------------------------------------------------

create or replace function public.transition_case(
  target_case_id uuid,
  requested_action public.case_action,
  action_comment text default null,
  new_assignee_id uuid default null
)
returns public.cases
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  member public.profiles;
  target_case public.cases;
  assignee public.profiles;
  clean_comment text := nullif(btrim(action_comment), '');
  previous_status public.case_status;
  next_status public.case_status;
  recorded_action public.case_action := requested_action;
  is_admin boolean;
  manages_target_area boolean;
  manages_requesting_area boolean;
begin
  select * into member from public.profiles where id = current_user_id;

  if current_user_id is null or member.organization_id is null then
    raise exception 'Acceso denegado';
  end if;

  select * into target_case
  from public.cases
  where id = target_case_id
    and organization_id = member.organization_id
  for update;

  if not found then
    raise exception 'Solicitud no encontrada';
  end if;

  if clean_comment is not null and char_length(clean_comment) not between 3 and 500 then
    raise exception 'El comentario debe tener entre 3 y 500 caracteres';
  end if;

  previous_status := target_case.status;
  is_admin := member.role = 'administrador';
  manages_target_area := member.role = 'jefe_area'
    and member.area_id = target_case.target_area_id;
  manages_requesting_area := member.role = 'jefe_area'
    and member.area_id = target_case.requesting_area_id;

  case requested_action
    when 'aceptar' then
      if target_case.status <> 'solicitado' then
        raise exception 'Solo se puede aceptar una solicitud pendiente';
      end if;
      if not (manages_target_area or is_admin) then
        raise exception 'Solo el jefe del área técnica puede aceptar la solicitud';
      end if;
      next_status := 'aceptado';
      target_case.accepted_at := now();

    when 'rechazar' then
      if target_case.status <> 'solicitado' then
        raise exception 'Solo se puede rechazar una solicitud pendiente';
      end if;
      if not (manages_target_area or is_admin) then
        raise exception 'Solo el jefe del área técnica puede rechazar la solicitud';
      end if;
      if clean_comment is null then
        raise exception 'Indica el motivo del rechazo';
      end if;
      next_status := 'rechazado';
      target_case.closed_at := now();

    when 'cancelar' then
      if target_case.status <> 'solicitado' then
        raise exception 'Solo se puede cancelar una solicitud pendiente';
      end if;
      if not (
        target_case.created_by = current_user_id
        or manages_requesting_area
        or is_admin
      ) then
        raise exception 'Solo quien creó la solicitud o el jefe de su área puede cancelarla';
      end if;
      next_status := 'cancelado';
      target_case.closed_at := now();

    when 'asignar' then
      if target_case.status not in ('aceptado', 'asignado') then
        raise exception 'Solo se puede asignar una solicitud aceptada';
      end if;
      if not (manages_target_area or is_admin) then
        raise exception 'Solo el jefe del área técnica puede asignar la solicitud';
      end if;
      if new_assignee_id is null then
        raise exception 'Selecciona un técnico';
      end if;

      select * into assignee
      from public.profiles
      where id = new_assignee_id
        and organization_id = member.organization_id
        and area_id = target_case.target_area_id
        and role in ('tecnico', 'jefe_area');

      if not found then
        raise exception 'El técnico debe pertenecer al área técnica de la solicitud';
      end if;
      if new_assignee_id is not distinct from target_case.assigned_to then
        raise exception 'La solicitud ya está asignada a esa persona';
      end if;

      if target_case.status = 'asignado' then
        recorded_action := 'reasignar';
      end if;
      next_status := 'asignado';
      target_case.assigned_to := new_assignee_id;
      target_case.assigned_at := now();

    when 'iniciar' then
      if target_case.status <> 'asignado' then
        raise exception 'Solo se puede iniciar una solicitud asignada';
      end if;
      if target_case.assigned_to is distinct from current_user_id then
        raise exception 'Solo el técnico asignado puede iniciar el trabajo';
      end if;
      next_status := 'en_ejecucion';
      target_case.started_at := coalesce(target_case.started_at, now());

    when 'pausar' then
      if target_case.status <> 'en_ejecucion' then
        raise exception 'Solo se puede pausar un trabajo en ejecución';
      end if;
      if not (target_case.assigned_to = current_user_id or manages_target_area) then
        raise exception 'Solo el técnico asignado o el jefe del área técnica puede pausar';
      end if;
      if clean_comment is null then
        raise exception 'Indica el motivo de la pausa';
      end if;
      next_status := 'en_espera';

    when 'reanudar' then
      if target_case.status <> 'en_espera' then
        raise exception 'Solo se puede reanudar un trabajo en espera';
      end if;
      if not (target_case.assigned_to = current_user_id or manages_target_area) then
        raise exception 'Solo el técnico asignado o el jefe del área técnica puede reanudar';
      end if;
      next_status := 'en_ejecucion';

    else
      raise exception 'Acción no disponible';
  end case;

  update public.cases
  set status = next_status,
      assigned_to = target_case.assigned_to,
      accepted_at = target_case.accepted_at,
      assigned_at = target_case.assigned_at,
      started_at = target_case.started_at,
      closed_at = target_case.closed_at,
      status_changed_at = now()
  where id = target_case.id
  returning * into target_case;

  insert into public.case_events (
    case_id,
    organization_id,
    action,
    from_status,
    to_status,
    actor_id,
    actor_role,
    assignee_id,
    comment
  ) values (
    target_case.id,
    target_case.organization_id,
    recorded_action,
    previous_status,
    next_status,
    current_user_id,
    member.role,
    case when requested_action = 'asignar' then new_assignee_id end,
    clean_comment
  );

  return target_case;
end;
$$;

revoke all on function public.transition_case(uuid, public.case_action, text, uuid)
  from public, anon;
grant execute on function public.transition_case(uuid, public.case_action, text, uuid)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Áreas en uso: no se cambia el tipo de un área con solicitudes.
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

    if exists (
      select 1
      from public.cases
      where requesting_area_id = old.id
        or target_area_id = old.id
    ) then
      raise exception 'No puedes cambiar el tipo de un área que tiene solicitudes';
    end if;
  end if;

  return new;
end;
$$;
