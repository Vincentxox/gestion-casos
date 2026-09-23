-- Avisos y notificaciones push (docs/BUSINESS_RULES.md, sección 9), adelantados al MVP
-- por el responsable el 23/09/2026.
--
-- * Cada acción del historial (`case_events`) crea avisos en `notifications` para los
--   responsables del siguiente paso, nunca para quien hizo la acción.
-- * La app muestra los avisos (campana del Inicio) y los marca como leídos.
-- * Los teléfonos se registran en `push_tokens`. Una Edge Function (`send-push`) envía
--   los avisos pendientes con el servicio de push de Expo y marca `push_sent_at`.
-- * El resumen del Inicio agrega avisos sin leer, reportes por validar y por aprobar, y
--   el uso de almacenamiento para el administrador.

-- ---------------------------------------------------------------------------
-- Teléfonos registrados
-- ---------------------------------------------------------------------------

create table public.push_tokens (
  token text primary key check (
    char_length(token) between 10 and 300
    and token ~ '^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_\-]+\]$'
  ),
  user_id uuid not null references public.profiles (id) on delete cascade,
  platform text not null check (platform in ('android', 'ios')),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index push_tokens_user_idx on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;

create policy "Users can read their own push tokens"
on public.push_tokens
for select
to authenticated
using (user_id = (select auth.uid()));

revoke all on table public.push_tokens from anon, authenticated;
grant select on table public.push_tokens to authenticated;

-- Un token pertenece al último usuario que inició sesión en ese teléfono.
create or replace function public.register_push_token(push_token text, device_platform text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then
    raise exception 'Acceso denegado';
  end if;

  insert into public.push_tokens (token, user_id, platform)
  values (btrim(push_token), current_user_id, device_platform)
  on conflict (token) do update
  set user_id = excluded.user_id,
      platform = excluded.platform,
      last_seen_at = now();
end;
$$;

create or replace function public.unregister_push_token(push_token text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.push_tokens
  where token = btrim(push_token)
    and user_id = (select auth.uid());
$$;

revoke all on function public.register_push_token(text, text) from public, anon;
revoke all on function public.unregister_push_token(text) from public, anon;
grant execute on function public.register_push_token(text, text) to authenticated;
grant execute on function public.unregister_push_token(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Avisos
-- ---------------------------------------------------------------------------

create table public.notifications (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  case_id uuid not null references public.cases (id) on delete cascade,
  event_id bigint not null references public.case_events (id) on delete cascade,
  action public.case_action not null,
  title text not null,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  push_sent_at timestamptz,
  push_error text,
  unique (event_id, recipient_id)
);

create index notifications_recipient_idx
  on public.notifications (recipient_id, created_at desc);
create index notifications_unread_idx
  on public.notifications (recipient_id)
  where read_at is null;
create index notifications_push_pending_idx
  on public.notifications (created_at)
  where push_sent_at is null;
create index notifications_organization_idx on public.notifications (organization_id);
create index notifications_case_idx on public.notifications (case_id);

alter table public.notifications enable row level security;

create policy "Recipients can read their notifications"
on public.notifications
for select
to authenticated
using (recipient_id = (select auth.uid()));

revoke all on table public.notifications from anon, authenticated;
grant select on table public.notifications to authenticated;

create or replace function public.mark_notifications_read(notification_ids bigint[] default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed integer;
begin
  update public.notifications
  set read_at = now()
  where recipient_id = (select auth.uid())
    and read_at is null
    and (notification_ids is null or id = any (notification_ids));
  get diagnostics changed = row_count;
  return changed;
end;
$$;

revoke all on function public.mark_notifications_read(bigint[]) from public, anon;
grant execute on function public.mark_notifications_read(bigint[]) to authenticated;

-- Crea los avisos de cada acción según la sección 9.
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
      );
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

create trigger case_events_enqueue_notifications
after insert on public.case_events
for each row execute procedure private.enqueue_case_notifications();

-- Uso de almacenamiento de la empresa del usuario autenticado: bytes usados, cuota y
-- porcentaje. Solo lo pide el resumen del Inicio para administradores.
create or replace function private.current_organization_storage()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'usado_bytes', used.bytes,
    'cuota_bytes', organizations.storage_quota_bytes,
    'porcentaje', round(used.bytes * 100.0 / organizations.storage_quota_bytes, 1)
  )
  from public.organizations
  cross join lateral (
    select private.organization_storage_bytes(organizations.id) as bytes
  ) used
  where organizations.id = (select private.current_organization_id());
$$;

revoke all on function private.current_organization_storage() from public, anon;
grant execute on function private.current_organization_storage() to authenticated;

-- ---------------------------------------------------------------------------
-- Resumen del Inicio (reemplaza la versión de 20260923020100)
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
          and manages_technical_area
          and target_area_id = member_area
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
