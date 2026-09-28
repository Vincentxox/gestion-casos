-- Validación técnica cuando el único jefe del área técnica ejecutó el trabajo
-- (docs/BUSINESS_RULES.md, 5.3 y 8; decisión del responsable del 23/09/2026).
--
-- * Si ningún jefe del área técnica distinto del técnico asignado puede validar, la
--   validación técnica (o la devolución) la hace un administrador y queda registrada.
-- * El aviso «Reporte por validar» va a los jefes del área distintos del ejecutor; si no
--   hay ninguno, a los administradores. El Inicio del administrador cuenta esos reportes.

create or replace function private.technical_validation_needs_admin(target_case public.cases)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1
    from public.profiles
    where organization_id = target_case.organization_id
      and organization_id = (select private.current_organization_id())
      and area_id = target_case.target_area_id
      and role = 'jefe_area'
      and id is distinct from target_case.assigned_to
  )
  and target_case.organization_id = (select private.current_organization_id());
$$;

revoke all on function private.technical_validation_needs_admin(public.cases) from public, anon;
grant execute on function private.technical_validation_needs_admin(public.cases) to authenticated;

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

  if target_case.status <> 'reporte_enviado' then
    raise exception 'Solo se puede validar un reporte enviado';
  end if;

  admin_substitutes := member.role = 'administrador'
    and (select private.technical_validation_needs_admin(target_case));

  if not (
    (member.role = 'jefe_area' and member.area_id = target_case.target_area_id)
    or admin_substitutes
  ) then
    raise exception 'Solo el jefe del área técnica puede validar el reporte';
  end if;

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
  allowed boolean;
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

  if target_case.status = 'reporte_enviado' then
    allowed := (member.role = 'jefe_area' and member.area_id = target_case.target_area_id)
      or (
        member.role = 'administrador'
        and (select private.technical_validation_needs_admin(target_case))
      );
  elsif target_case.status = 'validado' then
    allowed := (member.role = 'jefe_area' and member.area_id = target_case.requesting_area_id)
      or (
        member.role = 'administrador'
        and not (select private.requesting_area_has_manager(target_case))
      );
  else
    raise exception 'Solo se puede devolver un reporte enviado o validado';
  end if;

  if not allowed then
    raise exception 'No puedes devolver este reporte';
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

revoke all on function public.validate_case_report(uuid, text, boolean) from public, anon;
revoke all on function public.return_case_report(uuid, text) from public, anon;
grant execute on function public.validate_case_report(uuid, text, boolean) to authenticated;
grant execute on function public.return_case_report(uuid, text) to authenticated;

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
      );
      if cardinality(recipients) = 0 then
        recipients := array(
          select id from public.profiles
          where organization_id = target_case.organization_id
            and role = 'administrador'
        );
      end if;
    when 'devolver_reporte' then
      notice_title := 'Te devolvieron el reporte';
      recipients := array[target_case.assigned_to];
    when 'aprobar_reporte' then
      notice_title := 'Solicitud aprobada y cerrada';
      recipients := array[target_case.created_by, target_case.assigned_to];
    else
      return null;
  end case;

  if new.comment is not null and new.action in ('rechazar', 'pausar', 'devolver_reporte') then
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

  return null;
end;
$$;

revoke all on function private.enqueue_case_notifications() from public, anon, authenticated;

create or replace function public.get_home_summary()
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  member_role public.app_role := (select private.current_app_role());
  member_area uuid := (select private.current_area_id());
  member_area_kind public.area_kind;
  is_admin boolean := member_role = 'administrador';
  manages_technical_area boolean;
  manages_requesting_area boolean;
  admin_substitutes_conformity boolean;
  result jsonb;
  admin_section jsonb := null;
begin
  if current_user_id is null or member_role is null then
    raise exception 'Tu cuenta no está vinculada a una empresa';
  end if;

  select kind into member_area_kind from public.areas where id = member_area;
  manages_technical_area := member_role = 'jefe_area' and member_area_kind = 'tecnica';
  manages_requesting_area := member_role = 'jefe_area' and member_area_kind = 'solicitante';

  select jsonb_build_object(
    'role', member_role,
    'has_area', member_area is not null,
    'area_kind', member_area_kind,
    'cases', jsonb_build_object(
      'activas', count(*) filter (
        where status not in ('rechazado', 'cancelado', 'aprobado')
      ),
      'solicitado', count(*) filter (where status = 'solicitado'),
      'aceptado', count(*) filter (where status = 'aceptado'),
      'asignado', count(*) filter (where status = 'asignado'),
      'en_ejecucion', count(*) filter (where status = 'en_ejecucion'),
      'en_espera', count(*) filter (where status = 'en_espera'),
      'en_revision', count(*) filter (where status in ('reporte_enviado', 'validado')),
      'cerradas_30_dias', count(*) filter (
        where status in ('rechazado', 'cancelado', 'aprobado')
          and closed_at > now() - interval '30 days'
      ),
      'alta_prioridad_activas', count(*) filter (
        where priority = 'alta' and status not in ('rechazado', 'cancelado', 'aprobado')
      )
    ),
    'mine', jsonb_build_object(
      'solicitudes_activas', count(*) filter (
        where created_by = current_user_id
          and status not in ('rechazado', 'cancelado', 'aprobado')
      ),
      'trabajos_por_iniciar', count(*) filter (
        where assigned_to = current_user_id and status = 'asignado'
      ),
      'trabajos_en_ejecucion', count(*) filter (
        where assigned_to = current_user_id and status = 'en_ejecucion'
      ),
      'trabajos_en_espera', count(*) filter (
        where assigned_to = current_user_id and status = 'en_espera'
      )
    ),
    'inbox', jsonb_build_object(
      'por_aceptar', count(*) filter (
        where status = 'solicitado'
          and (is_admin or (manages_technical_area and target_area_id = member_area))
      ),
      'sin_asignar', count(*) filter (
        where status = 'aceptado'
          and (is_admin or (manages_technical_area and target_area_id = member_area))
      ),
      'reportes_por_validar', count(*) filter (
        where status = 'reporte_enviado'
          and (
            (
              manages_technical_area
              and target_area_id = member_area
              and assigned_to is distinct from current_user_id
            )
            or (is_admin and (select private.technical_validation_needs_admin(cases)))
          )
      ),
      'reportes_por_aprobar', count(*) filter (
        where status = 'validado'
          and (
            (manages_requesting_area and requesting_area_id = member_area)
            or (is_admin and not (select private.requesting_area_has_manager(cases)))
          )
      )
    ),
    'notificaciones_sin_leer', (
      select count(*)
      from public.notifications
      where recipient_id = current_user_id
        and read_at is null
    )
  )
  into result
  from public.cases;

  if is_admin then
    select jsonb_build_object(
      'usuarios_sin_area', (
        select count(*) from public.profiles
        where organization_id = (select private.current_organization_id())
          and area_id is null
      ),
      'usuarios_sin_nombre', (
        select count(*) from public.profiles
        where organization_id = (select private.current_organization_id())
          and btrim(full_name) = ''
      ),
      'solicitudes_acceso_pendientes', (
        select count(*) from public.organization_access_requests
        where status = 'pendiente'
      ),
      'invitaciones_pendientes', (
        select count(*) from public.organization_invitations
        where accepted_at is null and revoked_at is null
      ),
      'tipos_servicio_activos', (
        select count(*) from public.categories where is_active
      ),
      'recursos_activos', (
        select count(*) from public.resources where is_active
      ),
      'areas_tecnicas_sin_jefe', coalesce((
        select jsonb_agg(areas.name order by areas.name)
        from public.areas
        where areas.kind = 'tecnica'
          and areas.is_active
          and not exists (
            select 1 from public.profiles
            where profiles.area_id = areas.id and profiles.role = 'jefe_area'
          )
      ), '[]'::jsonb),
      'almacenamiento', (select private.current_organization_storage()),
      'areas_tecnicas_sin_tecnico', coalesce((
        select jsonb_agg(areas.name order by areas.name)
        from public.areas
        where areas.kind = 'tecnica'
          and areas.is_active
          and not exists (
            select 1 from public.profiles
            where profiles.area_id = areas.id and profiles.role = 'tecnico'
          )
      ), '[]'::jsonb)
    )
    into admin_section;
  end if;

  return result || jsonb_build_object('admin', admin_section);
end;
$$;

revoke all on function public.get_home_summary() from public, anon;
grant execute on function public.get_home_summary() to authenticated;
