-- Resumen del Inicio por rol (docs/BUSINESS_RULES.md, sección 9.1) e índices sugeridos
-- por los avisos de rendimiento de Supabase.
--
-- `get_home_summary` es SECURITY INVOKER: todos los conteos respetan RLS, así que cada
-- persona solo cuenta lo que puede ver. Devuelve un JSON con:
-- * role, has_area, area_kind
-- * cases: conteos por estado de las solicitudes visibles (activas y cerradas en 30 días)
-- * mine: solicitudes propias activas y trabajos asignados por estado
-- * inbox: por aceptar y sin asignar (jefe del área destino o administrador)
-- * admin: alertas de configuración (solo administradores)

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
      )
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

-- ---------------------------------------------------------------------------
-- Índices para llaves foráneas señaladas por Supabase
-- ---------------------------------------------------------------------------

create index if not exists case_events_organization_idx
  on public.case_events (organization_id);
create index if not exists case_resource_usages_registered_by_idx
  on public.case_resource_usages (registered_by);
create index if not exists organization_invitations_accepted_by_idx
  on public.organization_invitations (accepted_by);
create index if not exists organization_invitations_area_idx
  on public.organization_invitations (area_id);
create index if not exists organization_invitations_invited_by_idx
  on public.organization_invitations (invited_by);
