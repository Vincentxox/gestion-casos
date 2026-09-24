-- Resumen agregado: el visualizador no recibe filas de solicitudes ni actividades.
create or replace function private.maintenance_dashboard_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare request_counts jsonb;
declare leading_technician jsonb;
begin
  if auth.uid() is null or not exists (
    select 1 from public.profiles where id = auth.uid()
  ) then
    raise exception 'Se requiere iniciar sesión';
  end if;

  select jsonb_build_object(
    'solicitudes_total', count(*),
    'solicitudes_pendientes', count(*) filter (where status = 'pendiente'),
    'solicitudes_en_proceso', count(*) filter (where status = 'en_proceso'),
    'solicitudes_finalizadas', count(*) filter (where status = 'finalizada')
  ) into request_counts
  from public.maintenance_requests;

  select jsonb_build_object(
    'perfil_id', p.id,
    'nombre', coalesce(nullif(btrim(p.full_name), ''), 'Técnico sin nombre'),
    'solicitudes_resueltas', count(distinct a.request_id)
  ) into leading_technician
  from public.activity_assignments aa
  join public.activities a on a.id = aa.activity_id
  join public.maintenance_requests r on r.id = a.request_id
  join public.profiles p on p.id = aa.technician_id
  where aa.is_active and p.role = 'tecnico'
    and a.status = 'finalizada' and r.status = 'finalizada'
  group by p.id, p.full_name
  order by count(distinct a.request_id) desc, p.full_name, p.id
  limit 1;

  return request_counts || jsonb_build_object(
    'tecnico_con_mas_solicitudes_resueltas', leading_technician
  );
end;
$$;
revoke all on function private.maintenance_dashboard_stats() from public;
grant execute on function private.maintenance_dashboard_stats() to authenticated;

create or replace function public.get_maintenance_dashboard_stats()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$ select private.maintenance_dashboard_stats(); $$;
revoke all on function public.get_maintenance_dashboard_stats() from public;
grant execute on function public.get_maintenance_dashboard_stats() to authenticated;
