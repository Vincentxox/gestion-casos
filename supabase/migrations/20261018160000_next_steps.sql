-- «Tu siguiente paso» de Inicio (rediseño B-006, contrato C-018).
--
-- Inicio muestra, una a una, las solicitudes que esperan una decisión de la persona
-- autenticada. No hay regla nueva: la decisión pendiente es la acción principal del estado
-- de la solicitud, y la persona la tiene si `private.case_action_denial` se la permite,
-- la misma comprobación que usan las RPC y `get_case_actions` (20261017120100).
--
-- Acción principal por estado (la primera que lista `get_case_actions`):
--   solicitado → aceptar          reporte_enviado → validar_reporte
--   aceptado   → asignar          validado        → aprobar_reporte
--   asignado   → iniciar          en_ejecucion    → enviar_reporte
-- Un trabajo en espera no entra: la pausa ya es una decisión tomada y espera algo externo.
-- Las solicitudes cerradas no tienen siguiente paso.
--
-- 1. `public.next_step(cases)`: campo calculado con la acción que espera a la persona, o
--    `null`. El cliente lo pide en el `select` (`select=*,next_step,due_at,overdue_stage`).
-- 2. `public.list_next_steps()`: las solicitudes visibles con un siguiente paso. Devuelve
--    filas de `public.cases`, así que el cliente conserva su `select` con relaciones, ordena
--    por `due_at` y pagina con `range()`. Es SECURITY INVOKER: solo reduce lo que la política
--    de `cases` ya deja ver.

-- ---------------------------------------------------------------------------
-- 1. Acción que espera a la persona
-- ---------------------------------------------------------------------------

-- Vuelve a leer la solicitud por su id, con RLS, en lugar de confiar en la fila recibida:
-- quien llama puede construir una fila con otra empresa o en otro estado.
create or replace function public.next_step(target_case public.cases)
returns text
language sql
stable
security invoker
set search_path = ''
as $$
  select step.action
  from public.cases as visible
  cross join lateral (
    select case visible.status
      when 'solicitado' then 'aceptar'
      when 'aceptado' then 'asignar'
      when 'asignado' then 'iniciar'
      when 'en_ejecucion' then 'enviar_reporte'
      when 'reporte_enviado' then 'validar_reporte'
      when 'validado' then 'aprobar_reporte'
    end as action
  ) as step
  where visible.id = target_case.id
    and step.action is not null
    and (select private.case_action_denial(visible, step.action)) is null;
$$;

revoke all on function public.next_step(public.cases) from public, anon;
grant execute on function public.next_step(public.cases) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Solicitudes que esperan a la persona
-- ---------------------------------------------------------------------------

-- No llama a `next_step` por cada solicitud: la fila ya viene de `public.cases` con RLS, así
-- que no hace falta volver a leerla (esa lectura costaba cerca de un segundo por cada mil
-- solicitudes abiertas). El costo crece con las solicitudes abiertas en las que la persona
-- podría decidir, no con el total de la empresa.
--
-- Sin `set search_path`, como `search_cases` (20261015200000): así PostgreSQL la incorpora a
-- la consulta de PostgREST. Todos los nombres van calificados con su esquema.
create or replace function public.list_next_steps()
returns setof public.cases
language sql
stable
security invoker
as $$
  select cases.*
  from public.cases
  where cases.status in (
      'solicitado', 'aceptado', 'asignado', 'en_ejecucion', 'reporte_enviado', 'validado'
    )
    -- Condición necesaria y barata de cada acción, para no evaluar `case_action_denial` en
    -- solicitudes en las que la persona no puede decidir nada. Esa función sigue siendo la
    -- que decide.
    and case
      when cases.status in ('solicitado', 'aceptado', 'reporte_enviado') then
        (select private.is_admin())
        or (
          (select private.has_role('jefe_area'))
          and cases.target_area_id = (select private.current_area_id())
        )
      when cases.status in ('asignado', 'en_ejecucion') then
        cases.assigned_to = (select auth.uid())
      when cases.status = 'validado' then
        (select private.is_admin())
        or (
          (select private.has_role('jefe_area'))
          and cases.requesting_area_id = (select private.current_area_id())
        )
    end
    and (select private.case_action_denial(
      cases,
      case cases.status
        when 'solicitado' then 'aceptar'
        when 'aceptado' then 'asignar'
        when 'asignado' then 'iniciar'
        when 'en_ejecucion' then 'enviar_reporte'
        when 'reporte_enviado' then 'validar_reporte'
        when 'validado' then 'aprobar_reporte'
      end
    )) is null;
$$;

revoke all on function public.list_next_steps() from public, anon;
grant execute on function public.list_next_steps() to authenticated;
