-- Suplencias de firma cuando el firmante designado ya firmó la versión
-- (docs/BUSINESS_RULES.md, 5.3, 5.5.4, 8 y 9; decisión del responsable del 06/10/2026).
--
-- Una persona no firma dos veces la misma versión. Hasta ahora el administrador solo
-- suplía la conformidad cuando el área solicitante no tenía jefe, así que estos casos
-- quedaban sin nadie que pudiera aprobarlos:
--   1. un área técnica se pide un trabajo a sí misma y su jefe ya validó;
--   2. lo mismo, pero el único jefe ejecutó el trabajo;
--   3. el administrador validó como suplente, el área solicitante no tiene jefe y es el
--      único administrador.
--
-- Cambios:
-- * La conformidad la da un jefe del área solicitante que no haya firmado la versión
--   vigente. Si no hay ninguno, la da un administrador que no la haya firmado. La
--   devolución en `validado` sigue la misma regla.
-- * Si nadie puede darla, el error lo explica y el Inicio del administrador lo cuenta en
--   `admin.conformidades_sin_firmante` para que asigne un jefe o agregue otro
--   administrador.
-- * El aviso «Reporte por aprobar» va a quienes pueden darla.
-- * El Inicio cuenta «reportes por aprobar» a cualquier jefe del área solicitante, aunque
--   su área sea técnica.
-- * Al reasignar, la persona que deja el trabajo recibe un aviso.
-- * Los datos de la solicitud ya no se editan mientras el reporte está enviado o validado.

-- ---------------------------------------------------------------------------
-- Ayudantes
-- ---------------------------------------------------------------------------

-- Firmó la persona la versión vigente del reporte de esta solicitud. Solo la usan otras
-- funciones del servidor (como su propietario), así que nadie más puede ejecutarla, y
-- siempre se limita a la empresa del usuario autenticado.
create or replace function private.signed_current_report(
  target_case_id uuid,
  target_profile_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.case_signatures
    join public.case_report_versions
      on case_report_versions.id = case_signatures.version_id
    where case_report_versions.case_id = target_case_id
      and case_report_versions.organization_id = (select private.current_organization_id())
      and case_report_versions.status = 'vigente'
      and case_signatures.signer_id = target_profile_id
  );
$$;
revoke all on function private.signed_current_report(uuid, uuid)
  from public, anon, authenticated;

-- Hay un jefe del área solicitante que todavía puede firmar la conformidad.
create or replace function private.conformity_chief_available(target_case public.cases)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select target_case.organization_id = (select private.current_organization_id())
    and exists (
      select 1
      from public.profiles
      where organization_id = target_case.organization_id
        and area_id = target_case.requesting_area_id
        and role = 'jefe_area'
        and not (select private.signed_current_report(target_case.id, profiles.id))
    );
$$;
revoke all on function private.conformity_chief_available(public.cases) from public, anon;
grant execute on function private.conformity_chief_available(public.cases) to authenticated;

-- Hay alguien (jefe o administrador suplente) que puede firmar la conformidad.
create or replace function private.conformity_has_signer(target_case public.cases)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select private.conformity_chief_available(target_case))
    or (
      target_case.organization_id = (select private.current_organization_id())
      and exists (
        select 1
        from public.profiles
        where organization_id = target_case.organization_id
          and role = 'administrador'
          and not (select private.signed_current_report(target_case.id, profiles.id))
      )
    );
$$;
revoke all on function private.conformity_has_signer(public.cases) from public, anon;
grant execute on function private.conformity_has_signer(public.cases) to authenticated;

-- El usuario autenticado puede dar (o devolver) la conformidad de esta solicitud.
create or replace function private.can_give_conformity(target_case public.cases)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select target_case.status = 'validado'
    and exists (
      select 1
      from public.profiles
      where id = (select auth.uid())
        and organization_id = target_case.organization_id
        and not (select private.signed_current_report(target_case.id, profiles.id))
        and (
          (role = 'jefe_area' and area_id = target_case.requesting_area_id)
          or (
            role = 'administrador'
            and not (select private.conformity_chief_available(target_case))
          )
        )
    );
$$;
revoke all on function private.can_give_conformity(public.cases) from public, anon;
grant execute on function private.can_give_conformity(public.cases) to authenticated;

-- ---------------------------------------------------------------------------
-- Conformidad
-- ---------------------------------------------------------------------------

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

  if target_case.status <> 'validado' then
    raise exception 'Solo se puede aprobar un reporte validado';
  end if;

  if (select private.signed_current_report(target_case.id, member.id)) then
    if (select private.conformity_has_signer(target_case)) then
      raise exception 'Ya firmaste esta versión del reporte; la conformidad la da otra persona';
    end if;
    raise exception 'Ya firmaste esta versión del reporte y nadie más puede dar la conformidad: asigna un jefe al área solicitante o agrega otro administrador';
  end if;

  if not (select private.can_give_conformity(target_case)) then
    raise exception 'Solo el jefe del área solicitante puede aprobar el reporte';
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

revoke all on function public.approve_case_report(uuid, text, boolean) from public, anon;
grant execute on function public.approve_case_report(uuid, text, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Devolución: en `validado` la decide quien puede dar la conformidad.
-- El resto es idéntico a `20260923100500_exclude_executor_from_validation.sql`.
-- ---------------------------------------------------------------------------

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
    if member.id = target_case.assigned_to then
      raise exception 'No puedes devolver un trabajo que ejecutaste';
    end if;
    allowed := (member.role = 'jefe_area' and member.area_id = target_case.target_area_id)
      or (
        member.role = 'administrador'
        and (select private.technical_validation_needs_admin(target_case))
      );
  elsif target_case.status = 'validado' then
    allowed := (select private.can_give_conformity(target_case));
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

revoke all on function public.return_case_report(uuid, text) from public, anon;
grant execute on function public.return_case_report(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Edición de datos (5.5.4): hasta que se envía el reporte.
-- ---------------------------------------------------------------------------

drop policy "Authorized members can edit case data" on public.cases;

create policy "Authorized members can edit case data"
on public.cases
for update
to authenticated
using (
  organization_id = (select private.current_organization_id())
  and status not in ('rechazado', 'cancelado', 'aprobado', 'reporte_enviado', 'validado')
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

  if old.status in ('reporte_enviado', 'validado') then
    raise exception 'No se puede editar la solicitud mientras el reporte está en revisión';
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

-- ---------------------------------------------------------------------------
-- Avisos. Cambian `validar_reporte` (quienes pueden dar la conformidad) y
-- `reasignar` (también avisa a quien deja el trabajo). El resto es idéntico a
-- `20260923100400_admin_technical_validation.sql`.
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

-- ---------------------------------------------------------------------------
-- Inicio. Cambian `inbox.reportes_por_aprobar` y el nuevo
-- `admin.conformidades_sin_firmante`. El resto es idéntico a
-- `20260923100400_admin_technical_validation.sql`.
-- ---------------------------------------------------------------------------

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
  result jsonb;
  admin_section jsonb := null;
begin
  if current_user_id is null or member_role is null then
    raise exception 'Tu cuenta no está vinculada a una empresa';
  end if;

  select kind into member_area_kind from public.areas where id = member_area;
  manages_technical_area := member_role = 'jefe_area' and member_area_kind = 'tecnica';

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
          and (select private.can_give_conformity(cases))
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
      ), '[]'::jsonb),
      'conformidades_sin_firmante', (
        select count(*) from public.cases
        where status = 'validado'
          and not (select private.conformity_has_signer(cases))
      )
    )
    into admin_section;
  end if;

  return result || jsonb_build_object('admin', admin_section);
end;
$$;
