-- Mensajes dentro del caso (docs/BUSINESS_RULES.md, sección 5.7), parte 2 de 2.
--
-- Un mensaje es un evento del caso con la acción `mensaje` (agregada en
-- `20261017120000_add_message_case_action.sql`): `from_status` y `to_status` son el estado
-- del caso en ese momento y `comment` es el texto. Así hereda las reglas del historial: no
-- se edita ni se borra, lo ve quien ve el caso (RLS de `case_events`), queda bloqueado si
-- la empresa está inactiva y crea avisos con el mismo trigger.
--
-- 1. `private.case_action_denial` agrega la acción `mensaje`: caso abierto y persona que
--    participa (creador, técnico asignado, jefes del área solicitante o técnica, o
--    administrador). El resto de la función es idéntico a 20261016230000.
-- 2. `public.get_case_actions` ofrece `mensaje` en todos los estados abiertos, al final.
--    El resto es idéntico a 20261016230000.
-- 3. `public.send_case_message` escribe el mensaje.
-- 4. `private.enqueue_case_notifications` avisa de cada mensaje a los demás participantes:
--    creador, técnico asignado, jefes de las dos áreas y quienes ya escribieron en el caso.
--    El resto es idéntico a 20261006120000.
--
-- `transition_case` recibe un `case_action`, pero rechaza `mensaje`: solo acepta las siete
-- acciones de transición antes de consultar `case_action_denial`.

-- ---------------------------------------------------------------------------
-- 1. Permiso para escribir mensajes
-- ---------------------------------------------------------------------------

create or replace function private.case_action_denial(
  target_case public.cases,
  requested_action text
)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  member public.profiles;
  is_admin boolean;
  is_assignee boolean;
  manages_target_area boolean;
  manages_requesting_area boolean;
  allowed boolean;
begin
  select * into member from public.profiles where id = (select auth.uid());

  if member.id is null
    or target_case.id is null
    or member.organization_id is distinct from target_case.organization_id then
    return 'Solicitud no encontrada';
  end if;

  is_admin := member.role = 'administrador';
  is_assignee := coalesce(target_case.assigned_to = member.id, false);
  manages_target_area := member.role = 'jefe_area'
    and coalesce(member.area_id = target_case.target_area_id, false);
  manages_requesting_area := member.role = 'jefe_area'
    and coalesce(member.area_id = target_case.requesting_area_id, false);

  case requested_action
    when 'aceptar' then
      if target_case.status <> 'solicitado' then
        return 'Solo se puede aceptar una solicitud pendiente';
      end if;
      if not (manages_target_area or is_admin) then
        return 'Solo el jefe del área técnica puede aceptar la solicitud';
      end if;

    when 'rechazar' then
      if target_case.status <> 'solicitado' then
        return 'Solo se puede rechazar una solicitud pendiente';
      end if;
      if not (manages_target_area or is_admin) then
        return 'Solo el jefe del área técnica puede rechazar la solicitud';
      end if;

    when 'cancelar' then
      if target_case.status <> 'solicitado' then
        return 'Solo se puede cancelar una solicitud pendiente';
      end if;
      if not (target_case.created_by = member.id or manages_requesting_area) then
        return 'Solo quien creó la solicitud o el jefe de su área puede cancelarla';
      end if;

    when 'asignar' then
      if target_case.status not in ('aceptado', 'asignado', 'en_ejecucion', 'en_espera') then
        return 'Solo se puede asignar una solicitud aceptada';
      end if;
      if not (manages_target_area or is_admin) then
        return 'Solo el jefe del área técnica puede asignar la solicitud';
      end if;

    when 'iniciar' then
      if target_case.status <> 'asignado' then
        return 'Solo se puede iniciar una solicitud asignada';
      end if;
      if not is_assignee then
        return 'Solo el técnico asignado puede iniciar el trabajo';
      end if;

    when 'pausar' then
      if target_case.status <> 'en_ejecucion' then
        return 'Solo se puede pausar un trabajo en ejecución';
      end if;
      if not (is_assignee or manages_target_area) then
        return 'Solo el técnico asignado o el jefe del área técnica puede pausar';
      end if;

    when 'reanudar' then
      if target_case.status <> 'en_espera' then
        return 'Solo se puede reanudar un trabajo en espera';
      end if;
      if not (is_assignee or manages_target_area) then
        return 'Solo el técnico asignado o el jefe del área técnica puede reanudar';
      end if;

    -- Misma regla que la política «Authorized members can edit case data» y el trigger
    -- `guard_case_changes`.
    when 'editar_datos' then
      if target_case.status in ('rechazado', 'cancelado', 'aprobado') then
        return 'La solicitud está cerrada';
      end if;
      if target_case.status in ('reporte_enviado', 'validado') then
        return 'No se puede editar la solicitud mientras el reporte está en revisión';
      end if;
      if not (
        (target_case.created_by = member.id and target_case.status = 'solicitado')
        or is_admin
        or manages_target_area
      ) then
        return 'No puedes editar esta solicitud';
      end if;

    when 'fotos_antes' then
      if not (select private.can_manage_case_photos(target_case.id, 'antes')) then
        return 'No puedes agregar fotos de antes a esta solicitud';
      end if;

    when 'fotos_despues' then
      if not (select private.can_manage_case_photos(target_case.id, 'despues')) then
        return 'No puedes agregar fotos de después a esta solicitud';
      end if;

    when 'editar_reporte' then
      if not (select private.can_register_case_usage(target_case.id)) then
        return 'Solo el técnico asignado o el jefe del área técnica edita el reporte mientras el trabajo está en curso';
      end if;

    when 'recursos' then
      if not (select private.can_register_case_usage(target_case.id)) then
        return 'Solo el técnico asignado o el jefe del área técnica registra recursos mientras el trabajo está en curso';
      end if;

    when 'enviar_reporte' then
      if target_case.status <> 'en_ejecucion' then
        return 'Solo se puede enviar el reporte de un trabajo en ejecución';
      end if;
      if not is_assignee then
        return 'Solo el técnico asignado puede firmar y enviar el reporte';
      end if;

    when 'validar_reporte' then
      if target_case.status <> 'reporte_enviado' then
        return 'Solo se puede validar un reporte enviado';
      end if;
      if is_assignee then
        return 'No puedes validar un trabajo que ejecutaste';
      end if;
      if not (
        manages_target_area
        or (is_admin and (select private.technical_validation_needs_admin(target_case)))
      ) then
        return 'Solo el jefe del área técnica puede validar el reporte';
      end if;

    when 'aprobar_reporte' then
      if target_case.status <> 'validado' then
        return 'Solo se puede aprobar un reporte validado';
      end if;
      if (select private.signed_current_report(target_case.id, member.id)) then
        if (select private.conformity_has_signer(target_case)) then
          return 'Ya firmaste esta versión del reporte; la conformidad la da otra persona';
        end if;
        return 'Ya firmaste esta versión del reporte y nadie más puede dar la conformidad: asigna un jefe al área solicitante o agrega otro administrador';
      end if;
      if not (select private.can_give_conformity(target_case)) then
        return 'Solo el jefe del área solicitante puede aprobar el reporte';
      end if;

    when 'devolver_reporte' then
      if target_case.status = 'reporte_enviado' then
        if is_assignee then
          return 'No puedes devolver un trabajo que ejecutaste';
        end if;
        allowed := manages_target_area
          or (is_admin and (select private.technical_validation_needs_admin(target_case)));
      elsif target_case.status = 'validado' then
        allowed := (select private.can_give_conformity(target_case));
      else
        return 'Solo se puede devolver un reporte enviado o validado';
      end if;
      if not allowed then
        return 'No puedes devolver este reporte';
      end if;

    when 'mensaje' then
      if target_case.status in ('rechazado', 'cancelado', 'aprobado') then
        return 'La solicitud está cerrada';
      end if;
      if not (
        target_case.created_by = member.id
        or is_assignee
        or manages_target_area
        or manages_requesting_area
        or is_admin
      ) then
        return 'Solo quienes participan en la solicitud pueden escribir mensajes';
      end if;

    else
      return 'Acción no disponible';
  end case;

  return null;
end;
$$;

revoke all on function private.case_action_denial(public.cases, text) from public, anon;
grant execute on function private.case_action_denial(public.cases, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Acciones del caso
-- ---------------------------------------------------------------------------

create or replace function public.get_case_actions(target_case_id uuid)
returns table (action text, allowed boolean, reason text)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  target_case public.cases;
begin
  if (select private.current_organization_id()) is null then
    return;
  end if;

  select * into target_case from public.cases where id = target_case_id;

  if not found then
    return;
  end if;

  return query
  select
    candidates.action,
    checks.denial is null,
    checks.denial
  from unnest(
    case target_case.status
      when 'solicitado' then
        array['aceptar', 'rechazar', 'cancelar', 'editar_datos', 'mensaje']
      when 'aceptado' then
        array['asignar', 'editar_datos', 'mensaje']
      when 'asignado' then
        array['iniciar', 'asignar', 'editar_datos', 'fotos_antes', 'mensaje']
      when 'en_ejecucion' then
        array[
          'enviar_reporte', 'pausar', 'asignar', 'editar_datos', 'editar_reporte',
          'recursos', 'fotos_antes', 'fotos_despues', 'mensaje'
        ]
      when 'en_espera' then
        array[
          'reanudar', 'asignar', 'editar_datos', 'editar_reporte', 'recursos',
          'fotos_antes', 'fotos_despues', 'mensaje'
        ]
      when 'reporte_enviado' then
        array['validar_reporte', 'devolver_reporte', 'mensaje']
      when 'validado' then
        array['aprobar_reporte', 'devolver_reporte', 'mensaje']
      else
        array[]::text[]
    end
  ) with ordinality as candidates (action, position)
  cross join lateral (
    select private.case_action_denial(target_case, candidates.action) as denial
  ) as checks
  order by candidates.position;
end;
$$;

revoke all on function public.get_case_actions(uuid) from public, anon;
grant execute on function public.get_case_actions(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Escribir un mensaje
-- ---------------------------------------------------------------------------

-- Devuelve el id del evento creado. El texto se guarda sin espacios al inicio ni al
-- final y debe tener entre 3 y 500 caracteres, como `case_events.comment`.
create or replace function public.send_case_message(target_case_id uuid, message text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  member public.profiles;
  target_case public.cases;
  denial text;
  body text := btrim(coalesce(message, ''));
  event_id bigint;
begin
  select * into member from public.profiles where id = (select auth.uid());

  if member.id is null or member.organization_id is null then
    raise exception 'Tu cuenta no está vinculada a una empresa';
  end if;

  -- Bloquea el caso para que no cambie de estado mientras se escribe el mensaje.
  select * into target_case
  from public.cases
  where id = target_case_id
    and organization_id = member.organization_id
  for share;

  if not found then
    raise exception 'Solicitud no encontrada';
  end if;

  denial := (select private.case_action_denial(target_case, 'mensaje'));
  if denial is not null then
    raise exception '%', denial;
  end if;

  if char_length(body) not between 3 and 500 then
    raise exception 'El mensaje debe tener entre 3 y 500 caracteres';
  end if;

  insert into public.case_events (
    case_id,
    organization_id,
    action,
    from_status,
    to_status,
    actor_id,
    actor_role,
    comment
  ) values (
    target_case.id,
    target_case.organization_id,
    'mensaje',
    target_case.status,
    target_case.status,
    member.id,
    member.role,
    body
  )
  returning id into event_id;

  return event_id;
end;
$$;

revoke all on function public.send_case_message(uuid, text) from public, anon;
grant execute on function public.send_case_message(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Avisos de mensajes
-- ---------------------------------------------------------------------------

create or replace function private.enqueue_case_notifications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_case public.cases;
  actor_name text;
  notice_title text;
  detail text;
  recipients uuid[];
  previous_assignee uuid;
begin
  select * into target_case from public.cases where id = new.case_id;
  select full_name into actor_name from public.profiles where id = new.actor_id;
  detail := format('%s · %s', target_case.case_number, target_case.title);

  case new.action
    when 'crear' then
      notice_title := 'Nueva solicitud';
      recipients := array(
        select id from public.profiles
        where organization_id = target_case.organization_id
          and area_id = target_case.target_area_id
          and role = 'jefe_area'
      );
    when 'cancelar' then
      notice_title := 'Solicitud cancelada';
      recipients := array(
        select id from public.profiles
        where organization_id = target_case.organization_id
          and area_id = target_case.target_area_id
          and role = 'jefe_area'
      );
    when 'aceptar' then
      notice_title := 'Tu solicitud fue aceptada';
      recipients := array[target_case.created_by];
    when 'rechazar' then
      notice_title := 'Tu solicitud fue rechazada';
      recipients := array[target_case.created_by];
    when 'asignar', 'reasignar' then
      notice_title := 'Te asignaron un trabajo';
      recipients := array[new.assignee_id];
    when 'iniciar' then
      notice_title := 'Empezó el trabajo de tu solicitud';
      recipients := array[target_case.created_by];
    when 'pausar' then
      notice_title := 'Trabajo en pausa';
      recipients := array(
        select id from public.profiles
        where organization_id = target_case.organization_id
          and area_id = target_case.target_area_id
          and role = 'jefe_area'
      );
    when 'enviar_reporte' then
      notice_title := 'Reporte por validar';
      recipients := array(
        select id from public.profiles
        where organization_id = target_case.organization_id
          and area_id = target_case.target_area_id
          and role = 'jefe_area'
          and id is distinct from target_case.assigned_to
      );
      if cardinality(recipients) = 0 then
        recipients := array(
          select id from public.profiles
          where organization_id = target_case.organization_id
            and role = 'administrador'
        );
      end if;
    when 'validar_reporte' then
      notice_title := 'Reporte por aprobar';
      recipients := array(
        select id from public.profiles
        where organization_id = target_case.organization_id
          and area_id = target_case.requesting_area_id
          and role = 'jefe_area'
          and not (select private.signed_current_report(target_case.id, profiles.id))
      );
      if cardinality(recipients) = 0 then
        recipients := array(
          select id from public.profiles
          where organization_id = target_case.organization_id
            and role = 'administrador'
            and not (select private.signed_current_report(target_case.id, profiles.id))
        );
      end if;
    when 'devolver_reporte' then
      notice_title := 'Te devolvieron el reporte';
      recipients := array[target_case.assigned_to];
    when 'aprobar_reporte' then
      notice_title := 'Solicitud aprobada y cerrada';
      recipients := array[target_case.created_by, target_case.assigned_to];
    when 'mensaje' then
      notice_title := 'Nuevo mensaje';
      recipients := array(
        select target_case.created_by
        union
        select target_case.assigned_to
        union
        select id from public.profiles
        where organization_id = target_case.organization_id
          and role = 'jefe_area'
          and area_id in (target_case.requesting_area_id, target_case.target_area_id)
        union
        select actor_id from public.case_events
        where case_id = new.case_id
          and action = 'mensaje'
          and id < new.id
      );
    else
      return null;
  end case;

  if new.comment is not null and new.action in ('rechazar', 'pausar', 'devolver_reporte', 'mensaje') then
    detail := detail || ' · ' || left(new.comment, 120);
  end if;

  insert into public.notifications (
    organization_id,
    recipient_id,
    case_id,
    event_id,
    action,
    title,
    body
  )
  select distinct
    target_case.organization_id,
    recipient,
    target_case.id,
    new.id,
    new.action,
    notice_title,
    format('%s · por %s', detail, coalesce(nullif(btrim(actor_name), ''), 'un usuario'))
  from unnest(recipients) as recipient
  where recipient is not null
    and recipient is distinct from new.actor_id
  on conflict (event_id, recipient_id) do nothing;

  -- Quien deja el trabajo al reasignar.
  if new.action = 'reasignar' then
    select assignee_id into previous_assignee
    from public.case_events
    where case_id = new.case_id
      and id < new.id
      and action in ('asignar', 'reasignar')
    order by id desc
    limit 1;

    if previous_assignee is not null
      and previous_assignee is distinct from new.assignee_id
      and previous_assignee is distinct from new.actor_id then
      insert into public.notifications (
        organization_id,
        recipient_id,
        case_id,
        event_id,
        action,
        title,
        body
      ) values (
        target_case.organization_id,
        previous_assignee,
        target_case.id,
        new.id,
        new.action,
        'Se reasignó un trabajo tuyo',
        format('%s · por %s', detail, coalesce(nullif(btrim(actor_name), ''), 'un usuario'))
      )
      on conflict (event_id, recipient_id) do nothing;
    end if;
  end if;

  return null;
end;
$$;
revoke all on function private.enqueue_case_notifications() from public, anon, authenticated;
