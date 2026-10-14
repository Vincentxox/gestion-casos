-- T-502 backend: tiempos por prioridad, casos vencidos e indicadores
-- (docs/BUSINESS_RULES.md, 9 y 9.2).
--
-- - `priority_targets`: por empresa y prioridad, horas máximas para aceptar y para resolver.
--   Cada empresa nueva recibe los valores por defecto aprobados el 14/10/2026 (decisión 11.2).
-- - `overdue_stage(cases)` y `due_at(cases)`: campos calculados que el cliente pide en el
--   `select` de la solicitud (`select=*,overdue_stage,due_at`).
-- - `get_case_indicators`: panel para administrador, jefes de área y auditor. Es SECURITY
--   INVOKER, así que cada rol cuenta solo las solicitudes que puede ver por RLS.

-- ---------------------------------------------------------------------------
-- 1. Tiempos por prioridad
-- ---------------------------------------------------------------------------

create table public.priority_targets (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  priority public.case_priority not null,
  accept_hours integer not null check (accept_hours between 1 and 720),
  resolve_hours integer not null check (resolve_hours between 1 and 2160),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null,
  primary key (organization_id, priority),
  check (resolve_hours >= accept_hours)
);

alter table public.priority_targets enable row level security;

create policy "Members can read their organization's priority targets"
on public.priority_targets
for select
to authenticated
using (organization_id = (select private.current_organization_id()));

revoke all on table public.priority_targets from anon, authenticated;
grant select on table public.priority_targets to authenticated;

create or replace function private.seed_priority_targets(target_organization_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.priority_targets (organization_id, priority, accept_hours, resolve_hours)
  values
    (target_organization_id, 'alta', 4, 24),
    (target_organization_id, 'media', 8, 72),
    (target_organization_id, 'baja', 24, 168)
  on conflict (organization_id, priority) do nothing;
$$;

create or replace function private.seed_priority_targets_for_new_organization()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.seed_priority_targets(new.id);
  return new;
end;
$$;

revoke all on function private.seed_priority_targets(uuid) from public, anon, authenticated;
revoke all on function private.seed_priority_targets_for_new_organization()
  from public, anon, authenticated;

create trigger organizations_seed_priority_targets
after insert on public.organizations
for each row execute procedure private.seed_priority_targets_for_new_organization();

select private.seed_priority_targets(id) from public.organizations;

-- Solo el administrador cambia los tiempos de su empresa.
create or replace function public.set_priority_target(
  target_priority public.case_priority,
  new_accept_hours integer,
  new_resolve_hours integer
)
returns public.priority_targets
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  member public.profiles;
  result public.priority_targets;
begin
  select * into member from public.profiles where id = current_user_id;

  if current_user_id is null or member.organization_id is null then
    raise exception 'Acceso denegado';
  end if;

  if member.role <> 'administrador' then
    raise exception 'Solo el administrador puede cambiar los tiempos por prioridad';
  end if;

  if new_accept_hours is null or new_accept_hours not between 1 and 720 then
    raise exception 'El tiempo para aceptar debe estar entre 1 y 720 horas';
  end if;

  if new_resolve_hours is null or new_resolve_hours not between 1 and 2160 then
    raise exception 'El tiempo para resolver debe estar entre 1 y 2160 horas';
  end if;

  if new_resolve_hours < new_accept_hours then
    raise exception 'El tiempo para resolver no puede ser menor que el tiempo para aceptar';
  end if;

  insert into public.priority_targets (
    organization_id, priority, accept_hours, resolve_hours, updated_by
  )
  values (member.organization_id, target_priority, new_accept_hours, new_resolve_hours, current_user_id)
  on conflict (organization_id, priority) do update
  set accept_hours = excluded.accept_hours,
      resolve_hours = excluded.resolve_hours,
      updated_at = now(),
      updated_by = excluded.updated_by
  returning * into result;

  return result;
end;
$$;

revoke all on function public.set_priority_target(public.case_priority, integer, integer)
  from public, anon;
grant execute on function public.set_priority_target(public.case_priority, integer, integer)
  to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Vencimiento de una solicitud
-- ---------------------------------------------------------------------------
-- Los plazos corren desde que se crea la solicitud, en horas corridas (incluye pausas,
-- noches y fines de semana). Aceptar vence mientras está `solicitado`; resolver vence
-- mientras el trabajo sigue abierto, hasta que se envía el reporte. Si el reporte se
-- devuelve, la solicitud vuelve a contar como abierta.

create or replace function public.due_at(target public.cases)
returns timestamptz
language sql
stable
security invoker
set search_path = ''
as $$
  select case
    when target.status = 'solicitado'
      then target.created_at + make_interval(hours => targets.accept_hours)
    when target.status in ('aceptado', 'asignado', 'en_ejecucion', 'en_espera')
      then target.created_at + make_interval(hours => targets.resolve_hours)
  end
  from public.priority_targets as targets
  where targets.organization_id = target.organization_id
    and targets.priority = target.priority;
$$;

-- `aceptacion`, `resolucion` o null si no está vencida.
create or replace function public.overdue_stage(target public.cases)
returns text
language sql
stable
security invoker
set search_path = ''
as $$
  select case
    when public.due_at(target) is null or public.due_at(target) > now() then null
    when target.status = 'solicitado' then 'aceptacion'
    else 'resolucion'
  end;
$$;

revoke all on function public.due_at(public.cases) from public, anon;
revoke all on function public.overdue_stage(public.cases) from public, anon;
grant execute on function public.due_at(public.cases) to authenticated;
grant execute on function public.overdue_stage(public.cases) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Indicadores
-- ---------------------------------------------------------------------------
-- Cuenta las solicitudes creadas en el periodo [period_start, period_end); sin fechas,
-- todas. Los vencidos son siempre los de hoy, sin importar el periodo.
-- Tiempos en horas con un decimal:
-- - aceptación: creación → aceptación;
-- - resolución: creación → último envío del reporte (solicitudes con reporte enviado);
-- - aprobación: último envío del reporte → aprobación final.
-- Costo de recursos: cantidad × costo unitario registrado, por área solicitante. La mano
-- de obra se informa en horas porque no tiene costo.

create or replace function public.get_case_indicators(
  period_start timestamptz default null,
  period_end timestamptz default null
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  member_role public.app_role := (select private.current_app_role());
  result jsonb;
begin
  if member_role is null or member_role not in ('administrador', 'jefe_area', 'auditor') then
    raise exception 'Solo el administrador, los jefes de área y el auditor ven los indicadores';
  end if;

  if period_start is not null and period_end is not null and period_end <= period_start then
    raise exception 'El periodo no es válido';
  end if;

  with period_cases as (
    select cases.*
    from public.cases
    where (period_start is null or cases.created_at >= period_start)
      and (period_end is null or cases.created_at < period_end)
  ),
  report_sent as (
    select events.case_id, max(events.created_at) as sent_at
    from public.case_events as events
    where events.action = 'enviar_reporte'
      and events.case_id in (select id from period_cases)
    group by events.case_id
  ),
  timings as (
    select
      period_cases.id,
      period_cases.priority,
      period_cases.status,
      extract(epoch from period_cases.accepted_at - period_cases.created_at) / 3600
        as accept_hours,
      case when period_cases.status in ('reporte_enviado', 'validado', 'aprobado')
        then extract(epoch from report_sent.sent_at - period_cases.created_at) / 3600
      end as resolve_hours,
      case when period_cases.status = 'aprobado'
        then extract(epoch from period_cases.closed_at - report_sent.sent_at) / 3600
      end as approval_hours,
      targets.accept_hours as accept_target,
      targets.resolve_hours as resolve_target
    from period_cases
    left join report_sent on report_sent.case_id = period_cases.id
    left join public.priority_targets as targets
      on targets.organization_id = period_cases.organization_id
      and targets.priority = period_cases.priority
  ),
  costs as (
    select
      period_cases.requesting_area_id as area_id,
      coalesce(sum(usages.quantity * usages.unit_cost) filter (where usages.kind = 'recurso'), 0)
        as cost,
      coalesce(sum(usages.hours) filter (where usages.kind = 'mano_de_obra'), 0) as labor_hours
    from period_cases
    join public.case_resource_usages as usages on usages.case_id = period_cases.id
    group by period_cases.requesting_area_id
  )
  select jsonb_build_object(
    'periodo', jsonb_build_object('desde', period_start, 'hasta', period_end),
    'total', (select count(*) from period_cases),
    'por_estado', coalesce(
      (select jsonb_object_agg(status, total)
       from (select status, count(*) as total from period_cases group by status) as rows),
      '{}'::jsonb
    ),
    'por_prioridad', coalesce(
      (select jsonb_object_agg(priority, total)
       from (select priority, count(*) as total from period_cases group by priority) as rows),
      '{}'::jsonb
    ),
    'por_area_destino', coalesce(
      (select jsonb_agg(jsonb_build_object('area_id', areas.id, 'nombre', areas.name, 'total', rows.total)
                        order by rows.total desc, areas.name)
       from (select target_area_id, count(*) as total from period_cases group by target_area_id) as rows
       join public.areas on areas.id = rows.target_area_id),
      '[]'::jsonb
    ),
    'por_area_solicitante', coalesce(
      (select jsonb_agg(jsonb_build_object('area_id', areas.id, 'nombre', areas.name, 'total', rows.total)
                        order by rows.total desc, areas.name)
       from (select requesting_area_id, count(*) as total from period_cases group by requesting_area_id) as rows
       join public.areas on areas.id = rows.requesting_area_id),
      '[]'::jsonb
    ),
    'tiempos_promedio_horas', jsonb_build_object(
      'aceptacion', (select round(avg(accept_hours)::numeric, 1) from timings),
      'resolucion', (select round(avg(resolve_hours)::numeric, 1) from timings),
      'envio_a_aprobacion', (select round(avg(approval_hours)::numeric, 1) from timings)
    ),
    'fuera_de_plazo', jsonb_build_object(
      'aceptacion', (select count(*) from timings where accept_hours > accept_target),
      'resolucion', (select count(*) from timings where resolve_hours > resolve_target)
    ),
    'vencidas_hoy', (
      select jsonb_build_object(
        'aceptacion', count(*) filter (where public.overdue_stage(cases) = 'aceptacion'),
        'resolucion', count(*) filter (where public.overdue_stage(cases) = 'resolucion'),
        'alta', count(*) filter (where cases.priority = 'alta' and public.overdue_stage(cases) is not null),
        'media', count(*) filter (where cases.priority = 'media' and public.overdue_stage(cases) is not null),
        'baja', count(*) filter (where cases.priority = 'baja' and public.overdue_stage(cases) is not null)
      )
      from public.cases
      where cases.status in ('solicitado', 'aceptado', 'asignado', 'en_ejecucion', 'en_espera')
    ),
    'costo_recursos_por_area', coalesce(
      (select jsonb_agg(jsonb_build_object(
                'area_id', areas.id,
                'nombre', areas.name,
                'costo', costs.cost,
                'horas_mano_de_obra', costs.labor_hours
              ) order by costs.cost desc, areas.name)
       from costs
       join public.areas on areas.id = costs.area_id),
      '[]'::jsonb
    )
  )
  into result;

  return result;
end;
$$;

revoke all on function public.get_case_indicators(timestamptz, timestamptz) from public, anon;
grant execute on function public.get_case_indicators(timestamptz, timestamptz) to authenticated;
