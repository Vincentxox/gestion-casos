-- El administrador puede aceptar, rechazar y asignar solicitudes en lugar del jefe del área
-- técnica, pero ya no puede cancelarlas: cancelar es retirar la solicitud y le corresponde
-- a quien la creó o al jefe del área solicitante (docs/BUSINESS_RULES.md, 5.3). Si el
-- administrador creó la solicitud, puede cancelarla como creador.
--
-- Solo cambia la condición de `cancelar` en `public.transition_case`; el resto de la función
-- es idéntico a `20260922200400_create_case_workflow.sql`.

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
