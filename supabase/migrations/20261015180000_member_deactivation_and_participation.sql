-- Reglas aprobadas por el responsable el 15/10/2026 (docs/BUSINESS_RULES.md 2.2, 5.4 y
-- 5.5.3), a partir de los hallazgos D-1, D-2 y D-3 del análisis del 14/10/2026.
--
-- 1. Baja de miembros (D-1). Una persona dada de baja queda igual que alguien sin empresa:
--    `organization_id`, `area_id` y el rol vuelven a su estado inicial, de modo que todas
--    las políticas y funciones que ya exigen empresa la dejan sin acceso. Su historial,
--    sus firmas y sus recursos no se tocan. `former_organization_id` permite que la
--    empresa siga viendo su nombre en los casos.
-- 2. Reasignación en ejecución y en espera (D-2), con motivo obligatorio.
-- 3. Visibilidad por participación (D-3): quien fue técnico asignado o firmó un caso lo
--    sigue viendo dentro de su empresa aunque cambie de área o de rol.

-- ---------------------------------------------------------------------------
-- 1. Baja de miembros
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column former_organization_id uuid references public.organizations (id) on delete set null,
  add column deactivated_at timestamptz,
  add column deactivated_by uuid references public.profiles (id) on delete set null;

create index profiles_former_organization_id_idx on public.profiles (former_organization_id);
create index profiles_deactivated_by_idx on public.profiles (deactivated_by);

grant select (former_organization_id, deactivated_at, deactivated_by)
  on public.profiles to authenticated;

-- Los compañeros de la empresa siguen viendo el nombre de quien se dio de baja.
drop policy "Members can read profiles of their organization" on public.profiles;
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
  or (
    former_organization_id is not null
    and former_organization_id = (select private.current_organization_id())
  )
);

create or replace function public.deactivate_member(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  organization uuid := (select private.current_organization_id());
  open_cases text;
begin
  if current_user_id is null or not (select private.is_admin()) then
    raise exception 'Acceso denegado';
  end if;

  if target_user_id = current_user_id then
    raise exception 'No puedes darte de baja a ti mismo';
  end if;

  perform 1
  from public.profiles
  where id = target_user_id
    and organization_id = organization
  for update;

  if not found then
    raise exception 'Usuario no encontrado';
  end if;

  select string_agg(case_number, ', ' order by case_number) into open_cases
  from public.cases
  where organization_id = organization
    and assigned_to = target_user_id
    and status in ('asignado', 'en_ejecucion', 'en_espera');

  if open_cases is not null then
    raise exception 'Reasigna primero sus trabajos abiertos: %', open_cases;
  end if;

  update public.profiles
  set former_organization_id = organization_id,
      organization_id = null,
      area_id = null,
      role = 'solicitante',
      deactivated_at = now(),
      deactivated_by = current_user_id
  where id = target_user_id;

  delete from public.push_tokens where user_id = target_user_id;
end;
$$;

revoke all on function public.deactivate_member(uuid) from public, anon;
grant execute on function public.deactivate_member(uuid) to authenticated;

-- Quien ya no pertenece a la empresa de un aviso no lo recibe ni lo ve.
create or replace function private.skip_notifications_for_non_members()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.profiles
    where id = new.recipient_id
      and organization_id = new.organization_id
  ) then
    return null;
  end if;
  return new;
end;
$$;

revoke all on function private.skip_notifications_for_non_members() from public, anon, authenticated;

create trigger notifications_skip_non_members
before insert on public.notifications
for each row execute function private.skip_notifications_for_non_members();

drop policy "Recipients can read their notifications" on public.notifications;
create policy "Recipients can read their notifications"
on public.notifications
for select
to authenticated
using (
  recipient_id = (select auth.uid())
  and organization_id = (select private.current_organization_id())
);

-- ---------------------------------------------------------------------------
-- 2. Reasignación en ejecución y en espera
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
      if not (target_case.created_by = current_user_id or manages_requesting_area) then
        raise exception 'Solo quien creó la solicitud o el jefe de su área puede cancelarla';
      end if;
      next_status := 'cancelado';
      target_case.closed_at := now();

    when 'asignar' then
      if target_case.status not in ('aceptado', 'asignado', 'en_ejecucion', 'en_espera') then
        raise exception 'Solo se puede asignar una solicitud aceptada';
      end if;
      if not (manages_target_area or is_admin) then
        raise exception 'Solo el jefe del área técnica puede asignar la solicitud';
      end if;
      if new_assignee_id is null then
        raise exception 'Selecciona un técnico';
      end if;
      if target_case.status in ('en_ejecucion', 'en_espera') and clean_comment is null then
        raise exception 'Indica el motivo de la reasignación';
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

      -- Reasignar un trabajo en ejecución o en espera no cambia su estado: el nuevo técnico
      -- continúa con los recursos y el borrador del reporte (BUSINESS_RULES 5.5.3).
      if target_case.status <> 'aceptado' then
        recorded_action := 'reasignar';
      end if;
      next_status := case
        when target_case.status = 'aceptado' then 'asignado'::public.case_status
        else target_case.status
      end;
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
      status_changed_at = case
        when next_status is distinct from previous_status then now()
        else target_case.status_changed_at
      end
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
-- 3. Visibilidad por participación
-- ---------------------------------------------------------------------------

-- SECURITY DEFINER para leer firmas e historial sin pasar por la política de cases, que
-- la llama (evita la recursión entre políticas).
create or replace function private.participated_in_case(target_case_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.cases
    where id = target_case_id and assigned_to = (select auth.uid())
  )
  or exists (
    select 1 from public.case_events
    where case_id = target_case_id and assignee_id = (select auth.uid())
  )
  or exists (
    select 1 from public.case_signatures
    where case_id = target_case_id and signer_id = (select auth.uid())
  );
$$;

revoke all on function private.participated_in_case(uuid) from public, anon;
grant execute on function private.participated_in_case(uuid) to authenticated;

drop policy "Members can read visible cases" on public.cases;
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
    or (select private.participated_in_case(id))
  )
);
