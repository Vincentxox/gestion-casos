-- Acciones del caso decididas por el servidor (hallazgo D-9, contrato C-015).
--
-- La app decidía qué botones mostrar reescribiendo en TypeScript las condiciones de las
-- RPC (`casePermissions.ts`, `reportPermissions.ts`, `resourcePermissions.ts`). Desde esta
-- migración:
--
-- 1. `private.case_action_denial` concentra, para cada acción, las comprobaciones de
--    estado y de permiso: devuelve `null` si la persona autenticada puede hacerla, o el
--    mismo mensaje que lanza la RPC. Las validaciones de los datos que envía la persona
--    (motivo, técnico, diagnóstico, fotos mínimas, firma) siguen en cada RPC.
-- 2. `transition_case`, `submit_case_report`, `validate_case_report`,
--    `approve_case_report` y `return_case_report` usan esa función en lugar de sus
--    comprobaciones propias. Solo cambia ese bloque; el resto de cada función es idéntico
--    a su versión anterior (20261015180000 para `transition_case`, 20260923100100,
--    20260923100500 y 20261006120000 para las de reporte).
-- 3. `public.get_case_actions` devuelve, para un caso, las acciones que tienen sentido en
--    su estado, si están permitidas y, si no, por qué.
--
-- Fotos, recursos y borrador del reporte siguen decididos por `can_manage_case_photos` y
-- `can_register_case_usage`, que `case_action_denial` reutiliza. La edición de los datos
-- del caso sigue en su política RLS; la prueba 27 comprueba que coinciden.

-- ---------------------------------------------------------------------------
-- 1. Comprobaciones de estado y permiso por acción
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

    else
      return 'Acción no disponible';
  end case;

  return null;
end;
$$;

revoke all on function private.case_action_denial(public.cases, text) from public, anon;
grant execute on function private.case_action_denial(public.cases, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Las RPC usan la misma comprobación
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
  denial text;
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

  if requested_action not in (
    'aceptar', 'rechazar', 'cancelar', 'asignar', 'iniciar', 'pausar', 'reanudar'
  ) then
    raise exception 'Acción no disponible';
  end if;

  denial := private.case_action_denial(target_case, requested_action::text);
  if denial is not null then
    raise exception '%', denial;
  end if;

  previous_status := target_case.status;

  case requested_action
    when 'aceptar' then
      next_status := 'aceptado';
      target_case.accepted_at := now();

    when 'rechazar' then
      if clean_comment is null then
        raise exception 'Indica el motivo del rechazo';
      end if;
      next_status := 'rechazado';
      target_case.closed_at := now();

    when 'cancelar' then
      next_status := 'cancelado';
      target_case.closed_at := now();

    when 'asignar' then
      if new_assignee_id is null then
        raise exception 'Selecciona un técnico';
      end if;
      if target_case.status in ('en_ejecucion', 'en_espera') and clean_comment is null then
        raise exception 'Indica el motivo de la reasignación';
      end if;

      -- `for share` espera a una baja simultánea de esa persona (deactivate_member la
      -- bloquea con `for update`) y vuelve a comprobar la fila ya dada de baja.
      select * into assignee
      from public.profiles
      where id = new_assignee_id
        and organization_id = member.organization_id
        and area_id = target_case.target_area_id
        and role in ('tecnico', 'jefe_area')
      for share;

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
      next_status := 'en_ejecucion';
      target_case.started_at := coalesce(target_case.started_at, now());

    when 'pausar' then
      if clean_comment is null then
        raise exception 'Indica el motivo de la pausa';
      end if;
      next_status := 'en_espera';

    when 'reanudar' then
      next_status := 'en_ejecucion';
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

create or replace function public.submit_case_report(
  target_case_id uuid,
  signature_stroke text,
  accepts_terms boolean
)
returns public.case_report_versions
language plpgsql
security definer
set search_path = ''
as $$
declare
  member public.profiles;
  target_case public.cases;
  draft public.case_reports;
  required_photos smallint;
  after_photos integer;
  next_version integer;
  frozen jsonb;
  version public.case_report_versions;
  denial text;
begin
  select * into member from public.profiles where id = (select auth.uid());

  if member.id is null or member.organization_id is null then
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

  denial := private.case_action_denial(target_case, 'enviar_reporte');
  if denial is not null then
    raise exception '%', denial;
  end if;

  select * into draft from public.case_reports where case_id = target_case.id;

  if coalesce(char_length(draft.diagnosis), 0) < 10
    or coalesce(char_length(draft.work_done), 0) < 10 then
    raise exception 'Completa el diagnóstico y el trabajo realizado (mínimo 10 caracteres cada uno)';
  end if;

  select min_after_photos into required_photos
  from public.categories
  where id = target_case.category_id;

  select count(*) into after_photos
  from public.case_photos
  where case_id = target_case.id
    and kind = 'despues'
    and confirmed_at is not null;

  if after_photos < required_photos then
    raise exception 'Este tipo de servicio requiere al menos % foto(s) de después', required_photos;
  end if;

  select coalesce(max(version_number), 0) + 1 into next_version
  from public.case_report_versions
  where case_id = target_case.id;

  frozen := (select private.build_report_content(target_case.id, next_version));

  insert into public.case_report_versions (
    organization_id,
    case_id,
    version_number,
    content,
    content_hash,
    created_by
  ) values (
    target_case.organization_id,
    target_case.id,
    next_version,
    frozen,
    (select private.sha256_hex(frozen::text)),
    member.id
  )
  returning * into version;

  perform private.sign_report_version(version, 'ejecucion', member, signature_stroke, accepts_terms);
  perform private.move_case_for_report(target_case, 'reporte_enviado', 'enviar_reporte', member, null);

  return version;
end;
$$;

create or replace function public.validate_case_report(
  target_case_id uuid,
  signature_stroke text,
  accepts_terms boolean
)
returns public.case_signatures
language plpgsql
security definer
set search_path = ''
as $$
declare
  member public.profiles;
  target_case public.cases;
  version public.case_report_versions;
  signature public.case_signatures;
  admin_substitutes boolean;
  denial text;
begin
  select * into member from public.profiles where id = (select auth.uid());

  select * into target_case
  from public.cases
  where id = target_case_id
    and organization_id = member.organization_id
  for update;

  if member.id is null or not found then
    raise exception 'Solicitud no encontrada';
  end if;

  denial := private.case_action_denial(target_case, 'validar_reporte');
  if denial is not null then
    raise exception '%', denial;
  end if;

  admin_substitutes := member.role = 'administrador'
    and (select private.technical_validation_needs_admin(target_case));

  select * into version
  from public.case_report_versions
  where case_id = target_case.id
    and status = 'vigente';

  signature := private.sign_report_version(
    version, 'validacion_tecnica', member, signature_stroke, accepts_terms
  );
  perform private.move_case_for_report(
    target_case,
    'validado',
    'validar_reporte',
    member,
    case when admin_substitutes
      then 'Validación del administrador: el jefe del área técnica ejecutó el trabajo'
    end
  );

  return signature;
end;
$$;

create or replace function public.approve_case_report(
  target_case_id uuid,
  signature_stroke text,
  accepts_terms boolean
)
returns public.case_signatures
language plpgsql
security definer
set search_path = ''
as $$
declare
  member public.profiles;
  target_case public.cases;
  version public.case_report_versions;
  signature public.case_signatures;
  admin_substitutes boolean;
  denial text;
begin
  select * into member from public.profiles where id = (select auth.uid());

  select * into target_case
  from public.cases
  where id = target_case_id
    and organization_id = member.organization_id
  for update;

  if member.id is null or not found then
    raise exception 'Solicitud no encontrada';
  end if;

  denial := private.case_action_denial(target_case, 'aprobar_reporte');
  if denial is not null then
    raise exception '%', denial;
  end if;

  admin_substitutes := member.role = 'administrador';

  select * into version
  from public.case_report_versions
  where case_id = target_case.id
    and status = 'vigente';

  signature := private.sign_report_version(
    version, 'conformidad', member, signature_stroke, accepts_terms
  );
  perform private.move_case_for_report(
    target_case,
    'aprobado',
    'aprobar_reporte',
    member,
    case
      when admin_substitutes and (select private.requesting_area_has_manager(target_case))
        then 'Conformidad del administrador: el jefe del área solicitante ya firmó esta versión'
      when admin_substitutes
        then 'Conformidad del administrador: el área solicitante no tiene jefe'
    end
  );

  return signature;
end;
$$;

create or replace function public.return_case_report(
  target_case_id uuid,
  return_reason text
)
returns public.cases
language plpgsql
security definer
set search_path = ''
as $$
declare
  member public.profiles;
  target_case public.cases;
  clean_reason text := nullif(btrim(return_reason), '');
  denial text;
begin
  select * into member from public.profiles where id = (select auth.uid());

  select * into target_case
  from public.cases
  where id = target_case_id
    and organization_id = member.organization_id
  for update;

  if member.id is null or not found then
    raise exception 'Solicitud no encontrada';
  end if;

  if clean_reason is null or char_length(clean_reason) not between 3 and 500 then
    raise exception 'Indica las observaciones para devolver el reporte (entre 3 y 500 caracteres)';
  end if;

  denial := private.case_action_denial(target_case, 'devolver_reporte');
  if denial is not null then
    raise exception '%', denial;
  end if;

  update public.case_report_versions
  set status = 'devuelta',
      returned_by = member.id,
      returned_at = now(),
      return_reason = clean_reason
  where case_id = target_case.id
    and status = 'vigente';

  return private.move_case_for_report(
    target_case, 'en_ejecucion', 'devolver_reporte', member, clean_reason
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Acciones disponibles para la app
-- ---------------------------------------------------------------------------

-- Una fila por acción que tiene sentido en el estado del caso, en el orden en que la app
-- las muestra. `reason` es el mensaje que daría la RPC; es `null` cuando `allowed`.
-- SECURITY INVOKER: si la persona no ve el caso (RLS, otra empresa o empresa inactiva),
-- no devuelve filas.
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
        array['aceptar', 'rechazar', 'cancelar', 'editar_datos']
      when 'aceptado' then
        array['asignar', 'editar_datos']
      when 'asignado' then
        array['iniciar', 'asignar', 'editar_datos', 'fotos_antes']
      when 'en_ejecucion' then
        array[
          'enviar_reporte', 'pausar', 'asignar', 'editar_datos', 'editar_reporte',
          'recursos', 'fotos_antes', 'fotos_despues'
        ]
      when 'en_espera' then
        array[
          'reanudar', 'asignar', 'editar_datos', 'editar_reporte', 'recursos',
          'fotos_antes', 'fotos_despues'
        ]
      when 'reporte_enviado' then
        array['validar_reporte', 'devolver_reporte']
      when 'validado' then
        array['aprobar_reporte', 'devolver_reporte']
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
