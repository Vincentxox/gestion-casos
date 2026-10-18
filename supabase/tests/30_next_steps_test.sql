-- Pruebas: «Tu siguiente paso» de Inicio (rediseño B-006, contrato C-018).
--
-- Usa la Empresa D de la prueba 27 (un caso en cada estado) y la Empresa E como empresa
-- ajena. Desde la prueba 27, la 28 dio de baja a la jefa de Ventas D y la 29 a Teresa y a
-- Aurora. Lo esperado se compara también con el intento real de cada acción, no con
-- `case_action_denial`.

\set ON_ERROR_STOP 1
\set QUIET 1

create table test.case_keys as
select keys.case_key, test.get(keys.case_key)::uuid as case_id
from (select distinct case_key from test.case_candidates) as keys;
grant select on test.case_keys to authenticated;

-- Casos que la persona recibe de list_next_steps, con su siguiente paso.
create function test.next_steps_of(user_name text)
returns text language plpgsql
as $$
declare
  listed text;
begin
  perform test.login(user_name);
  set local role authenticated;
  select coalesce(string_agg(keys.case_key || ':' || public.next_step(steps), ',' order by keys.case_key), '')
  into listed
  from public.list_next_steps() as steps
  join test.case_keys as keys on keys.case_id = steps.id;
  reset role;
  return listed;
end;
$$;

-- Lo mismo, intentando de verdad (y deshaciendo) la acción principal del estado de cada
-- solicitud que la persona ve, con `test.try_case_action` de la prueba 27.
create function test.expected_next_steps(user_name text)
returns text language plpgsql
as $$
declare
  listed text;
begin
  perform test.login(user_name);
  set local role authenticated;
  select coalesce(string_agg(keys.case_key || ':' || primary_action.action, ',' order by keys.case_key), '')
  into listed
  from test.case_keys as keys
  join public.cases on cases.id = keys.case_id
  cross join lateral (
    select case cases.status
      when 'solicitado' then 'aceptar'
      when 'aceptado' then 'asignar'
      when 'asignado' then 'iniciar'
      when 'en_ejecucion' then 'enviar_reporte'
      when 'reporte_enviado' then 'validar_reporte'
      when 'validado' then 'aprobar_reporte'
    end as action
  ) as primary_action
  where primary_action.action is not null
    and test.try_case_action(keys.case_id, primary_action.action) is null;
  reset role;
  return listed;
end;
$$;

-- ---------------------------------------------------------------------------
-- 1. Qué espera a cada persona
-- ---------------------------------------------------------------------------

select test.ok(
  test.next_steps_of('jefe_t_d') = 'd_aceptado:asignar,d_enviado:validar_reporte,d_solicitado:aceptar',
  'al jefe técnico le esperan aceptar, asignar y validar el reporte de otro técnico'
);
select test.ok(
  test.next_steps_of('tec_a_d') = 'd_asignado:iniciar,d_ejecucion:enviar_reporte',
  'al técnico le esperan iniciar su trabajo y enviar su reporte, no el trabajo en espera'
);
select test.ok(
  test.next_steps_of('admin_d')
    = 'd_aceptado:asignar,d_enviado_jefe:validar_reporte,d_sin_jefe:aprobar_reporte,'
      || 'd_solicitado:aceptar,d_validado:aprobar_reporte,d_validado_propio:aprobar_reporte',
  'al administrador le esperan lo que el área técnica no puede hacer y las conformidades que suple'
);
select test.ok(
  test.next_steps_of('jefe_s_d') = '',
  'a la jefa de Ventas D, ya dada de baja, no le espera la conformidad que el administrador suple'
);
select test.ok(
  test.next_steps_of('sol_d') = '' and test.next_steps_of('sol_c_d') = '',
  'a quien solicita no le espera ninguna decisión'
);

select test.ok(
  (select bool_and(test.next_steps_of(people.user_name) = test.expected_next_steps(people.user_name))
   from unnest(array['admin_d', 'jefe_t_d', 'tec_a_d', 'tec_b_d', 'jefe_s_d', 'sol_d', 'sol_c_d', 'aud_d'])
     as people (user_name)),
  'el siguiente paso coincide con la acción principal que cada persona puede hacer de verdad'
);

-- ---------------------------------------------------------------------------
-- 2. Lo que no entra
-- ---------------------------------------------------------------------------

-- El jefe técnico sí puede reanudar el trabajo en espera.
select test.login('jefe_t_d');
set role authenticated;
select test.ok(
  (select count(*) = 0
   from public.cases
   join test.case_keys as keys on keys.case_id = cases.id
   where public.next_step(cases) is not null
     and cases.status in ('en_espera', 'rechazado', 'cancelado', 'aprobado')),
  'un trabajo en espera y las solicitudes cerradas no tienen siguiente paso'
);
reset role;

-- Una persona de otra empresa no recibe nada de la Empresa D, ni aunque tenga la fila.
create function test.foreign_next_step(user_name text, case_key text)
returns text language plpgsql
as $$
declare
  target_case public.cases;
  step text;
begin
  select * into target_case from public.cases where id = test.get(case_key)::uuid;
  perform test.login(user_name);
  set local role authenticated;
  step := public.next_step(target_case);
  reset role;
  return step;
end;
$$;

select test.ok(test.next_steps_of('admin_e') not like '%d\_%',
  'alguien de otra empresa no recibe solicitudes de la Empresa D');
select test.ok(test.foreign_next_step('admin_e', 'd_solicitado') is null,
  'next_step no responde por una solicitud de otra empresa');

-- La misma fila, con la empresa de quien llama y otro estado: next_step lee la real.
create function test.forged_next_step(user_name text, case_key text, org_key text, forged_status public.case_status)
returns text language plpgsql
as $$
declare
  target_case public.cases;
  step text;
begin
  select * into target_case from public.cases where id = test.get(case_key)::uuid;
  target_case.organization_id := test.get(org_key)::uuid;
  target_case.status := forged_status;
  perform test.login(user_name);
  set local role authenticated;
  step := public.next_step(target_case);
  reset role;
  return step;
end;
$$;

select test.ok(test.forged_next_step('admin_e', 'd_solicitado', 'org_e', 'solicitado') is null,
  'next_step no responde por una fila de otra empresa con la empresa cambiada');
select test.ok(test.forged_next_step('jefe_t_d', 'd_aprobado', 'org_d', 'solicitado') is null,
  'next_step usa el estado real de la solicitud, no el de la fila recibida');

select test.ok(test.next_steps_of('aud_d') = '',
  'quien ya no es miembro de la empresa no recibe nada');

update public.organizations set is_active = false where id = test.get('org_d')::uuid;
select test.ok(test.next_steps_of('admin_d') = '',
  'con la empresa inactiva no hay siguiente paso');
update public.organizations set is_active = true where id = test.get('org_d')::uuid;

-- ---------------------------------------------------------------------------
-- 3. Permisos de las funciones
-- ---------------------------------------------------------------------------

select test.ok(
  not has_function_privilege('anon', 'public.list_next_steps()', 'execute')
  and not has_function_privilege('anon', 'public.next_step(public.cases)', 'execute')
  and has_function_privilege('authenticated', 'public.list_next_steps()', 'execute'),
  'anon no ejecuta las funciones de siguiente paso'
);

\echo 'Todas las pruebas de siguiente paso pasaron.'
