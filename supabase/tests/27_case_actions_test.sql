-- Pruebas: acciones del caso decididas por el servidor (hallazgo D-9, contrato C-015).
--
-- Para cada persona de una empresa nueva («Empresa D») y cada caso en cada estado,
-- `get_case_actions` debe decir que una acción está permitida exactamente cuando la RPC,
-- la política o la escritura correspondiente funciona. Cada intento se deshace al
-- terminar. Si alguien cambia una regla en un solo lado, esta prueba falla.

\set ON_ERROR_STOP 1
\set QUIET 1

-- ---------------------------------------------------------------------------
-- Preparación: Empresa D con un solo jefe técnico, dos técnicos, un jefe y una persona
-- del área solicitante, y un auditor.
-- ---------------------------------------------------------------------------

select test.set('org_d', private.create_organization('Empresa D', 'admin@d.test')::text);
select test.register('admin_d', 'admin@d.test', 'Adela Admin D');
select test.register('jefe_t_d', 'jefe.t@d.test', 'Julio Jefe Técnico D');
select test.register('tec_a_d', 'tec.a@d.test', 'Tomás Técnico A');
select test.register('tec_b_d', 'tec.b@d.test', 'Teresa Técnica B');
select test.register('jefe_s_d', 'jefe.s@d.test', 'Sara Jefa Solicitante D');
select test.register('sol_d', 'sol@d.test', 'Simón Solicitante D');
select test.register('aud_d', 'aud@d.test', 'Aurora Auditora D');

insert into public.areas (organization_id, name, kind)
values
  (test.get('org_d')::uuid, 'Mantenimiento D', 'tecnica'),
  (test.get('org_d')::uuid, 'Ventas D', 'solicitante');
select test.set('area_mant_d', (select id::text from public.areas where name = 'Mantenimiento D'));
select test.set('area_ventas_d', (select id::text from public.areas where name = 'Ventas D'));

insert into public.categories (organization_id, area_id, name)
values (test.get('org_d')::uuid, test.get('area_mant_d')::uuid, 'Electricidad D');
select test.set('cat_d', (select id::text from public.categories where name = 'Electricidad D'));

insert into public.resources (organization_id, kind, name)
values (test.get('org_d')::uuid, 'herramienta', 'Escalera D');
select test.set('res_d', (select id::text from public.resources where name = 'Escalera D'));

update public.profiles
set organization_id = test.get('org_d')::uuid, role = 'jefe_area', area_id = test.get('area_mant_d')::uuid
where id = test.uid('jefe_t_d');
update public.profiles
set organization_id = test.get('org_d')::uuid, role = 'tecnico', area_id = test.get('area_mant_d')::uuid
where id in (test.uid('tec_a_d'), test.uid('tec_b_d'));
update public.profiles
set organization_id = test.get('org_d')::uuid, role = 'jefe_area', area_id = test.get('area_ventas_d')::uuid
where id = test.uid('jefe_s_d');
update public.profiles
set organization_id = test.get('org_d')::uuid, role = 'solicitante', area_id = test.get('area_ventas_d')::uuid
where id = test.uid('sol_d');
update public.profiles
set organization_id = test.get('org_d')::uuid, role = 'auditor', area_id = null
where id = test.uid('aud_d');

select test.ok(
  (select count(*) = 7 from public.profiles where organization_id = test.get('org_d')::uuid),
  'la Empresa D tiene sus siete personas'
);

-- ---------------------------------------------------------------------------
-- Casos en cada estado
-- ---------------------------------------------------------------------------

create function test.new_case_d(case_key text, author text)
returns void language plpgsql
as $$
begin
  perform test.login(author);
  set local role authenticated;
  insert into public.cases (title, description, location, category_id)
  values ('Caso ' || case_key, 'Descripción del caso ' || case_key, 'Planta D', test.get('cat_d')::uuid);
  reset role;
  perform test.set(case_key, (select id::text from public.cases where title = 'Caso ' || case_key));
end;
$$;

create function test.as_user_d(user_name text, statement text)
returns void language plpgsql
as $$
begin
  perform test.login(user_name);
  set local role authenticated;
  execute statement;
  reset role;
end;
$$;

-- Cada caso avanza con su flujo normal hasta el estado que se prueba.
select test.new_case_d('d_solicitado', 'sol_d');
select test.new_case_d('d_rechazado', 'sol_d');
select test.new_case_d('d_cancelado', 'sol_d');
select test.new_case_d('d_aceptado', 'sol_d');
select test.new_case_d('d_asignado', 'sol_d');
select test.new_case_d('d_ejecucion', 'sol_d');
select test.new_case_d('d_espera', 'sol_d');
select test.new_case_d('d_enviado', 'sol_d');
select test.new_case_d('d_validado', 'sol_d');
select test.new_case_d('d_aprobado', 'sol_d');
-- Lo ejecuta el único jefe técnico: valida el administrador.
select test.new_case_d('d_enviado_jefe', 'sol_d');
-- El área técnica se lo pide a sí misma: el jefe técnico valida y, como ya firmó, la
-- conformidad la suple el administrador.
select test.new_case_d('d_validado_propio', 'tec_b_d');

select test.as_user_d('jefe_t_d', format($$select public.transition_case(%L, 'rechazar', 'No corresponde al área')$$, test.get('d_rechazado')));
select test.as_user_d('sol_d', format($$select public.transition_case(%L, 'cancelar')$$, test.get('d_cancelado')));

select test.as_user_d('jefe_t_d', format($$select public.transition_case(id, 'aceptar') from unnest(%L::uuid[]) as cases (id)$$,
  array[test.get('d_aceptado'), test.get('d_asignado'), test.get('d_ejecucion'), test.get('d_espera'),
        test.get('d_enviado'), test.get('d_validado'), test.get('d_aprobado'),
        test.get('d_enviado_jefe'), test.get('d_validado_propio')]));
select test.as_user_d('jefe_t_d', format($$select public.transition_case(id, 'asignar', null, %L) from unnest(%L::uuid[]) as cases (id)$$,
  test.uid('tec_a_d'),
  array[test.get('d_asignado'), test.get('d_ejecucion'), test.get('d_espera'), test.get('d_enviado'),
        test.get('d_validado'), test.get('d_aprobado'), test.get('d_validado_propio')]));
select test.as_user_d('jefe_t_d', format($$select public.transition_case(%L, 'asignar', null, %L)$$,
  test.get('d_enviado_jefe'), test.uid('jefe_t_d')));

select test.as_user_d('tec_a_d', format($$
  select public.transition_case(id, 'iniciar') from unnest(%1$L::uuid[]) as cases (id);
  insert into public.case_reports (case_id, diagnosis, work_done)
  select id, 'Interruptor dañado en el tablero', 'Se cambió el interruptor del tablero'
  from unnest(%1$L::uuid[]) as cases (id)$$,
  array[test.get('d_ejecucion'), test.get('d_espera'), test.get('d_enviado'), test.get('d_validado'),
        test.get('d_aprobado'), test.get('d_validado_propio')]));
select test.as_user_d('tec_a_d', format($$select public.transition_case(%L, 'pausar', 'Falta un repuesto')$$, test.get('d_espera')));
select test.as_user_d('tec_a_d', format($$select public.submit_case_report(id, %L, true) from unnest(%L::uuid[]) as cases (id)$$,
  test.get('stroke'),
  array[test.get('d_enviado'), test.get('d_validado'), test.get('d_aprobado'), test.get('d_validado_propio')]));

select test.as_user_d('jefe_t_d', format($$
  select public.transition_case(%1$L, 'iniciar');
  insert into public.case_reports (case_id, diagnosis, work_done)
  values (%1$L, 'Lámpara quemada en el pasillo', 'Se cambió la lámpara del pasillo');
  select public.submit_case_report(%1$L, %2$L, true)$$,
  test.get('d_enviado_jefe'), test.get('stroke')));

select test.as_user_d('jefe_t_d', format($$select public.validate_case_report(id, %L, true) from unnest(%L::uuid[]) as cases (id)$$,
  test.get('stroke'),
  array[test.get('d_validado'), test.get('d_aprobado'), test.get('d_validado_propio')]));
select test.as_user_d('jefe_s_d', format($$select public.approve_case_report(%L, %L, true)$$,
  test.get('d_aprobado'), test.get('stroke')));

select test.ok(
  (select bool_and(cases.status::text = expected.status)
   from (values
     ('d_solicitado', 'solicitado'), ('d_rechazado', 'rechazado'), ('d_cancelado', 'cancelado'),
     ('d_aceptado', 'aceptado'), ('d_asignado', 'asignado'), ('d_ejecucion', 'en_ejecucion'),
     ('d_espera', 'en_espera'), ('d_enviado', 'reporte_enviado'), ('d_validado', 'validado'),
     ('d_aprobado', 'aprobado'), ('d_enviado_jefe', 'reporte_enviado'),
     ('d_validado_propio', 'validado')
   ) as expected (case_key, status)
   join public.cases on cases.id = test.get(expected.case_key)::uuid),
  'la Empresa D tiene un caso en cada estado'
);

-- ---------------------------------------------------------------------------
-- Intento real de cada acción, deshecho al terminar
-- ---------------------------------------------------------------------------

-- Devuelve null si la acción funcionó y el mensaje de error si no.
create function test.try_case_action(target_case_id uuid, requested_action text)
returns text language plpgsql
as $$
declare
  target_case public.cases;
  affected integer;
  other_technician uuid;
begin
  begin
    -- Lectura sin RLS para elegir otro técnico al reasignar; la acción sí corre con RLS.
    select assigned_to into other_technician from test.case_snapshot where id = target_case_id;
    other_technician := case
      when other_technician = test.uid('tec_a_d') then test.uid('tec_b_d')
      else test.uid('tec_a_d')
    end;

    case requested_action
      when 'aceptar' then
        perform public.transition_case(target_case_id, 'aceptar');
      when 'rechazar' then
        perform public.transition_case(target_case_id, 'rechazar', 'Motivo de prueba');
      when 'cancelar' then
        perform public.transition_case(target_case_id, 'cancelar', 'Motivo de prueba');
      when 'asignar' then
        perform public.transition_case(target_case_id, 'asignar', 'Motivo de prueba', other_technician);
      when 'iniciar' then
        perform public.transition_case(target_case_id, 'iniciar');
      when 'pausar' then
        perform public.transition_case(target_case_id, 'pausar', 'Motivo de prueba');
      when 'reanudar' then
        perform public.transition_case(target_case_id, 'reanudar');
      when 'editar_datos' then
        update public.cases set location = location || ' (editado)' where id = target_case_id;
        get diagnostics affected = row_count;
        if affected = 0 then
          raise exception 'sin filas editadas';
        end if;
      when 'fotos_antes' then
        perform public.reserve_case_photo(target_case_id, 'antes');
      when 'fotos_despues' then
        perform public.reserve_case_photo(target_case_id, 'despues');
      when 'recursos' then
        insert into public.case_resource_usages (case_id, kind, resource_id, hours)
        values (target_case_id, 'recurso', test.get('res_d')::uuid, 1);
      when 'editar_reporte' then
        update public.case_reports set work_done = work_done || '.' where case_id = target_case_id;
        get diagnostics affected = row_count;
        if affected = 0 then
          insert into public.case_reports (case_id, diagnosis) values (target_case_id, 'Diagnóstico de prueba');
        end if;
      when 'enviar_reporte' then
        perform public.submit_case_report(target_case_id, test.get('stroke'), true);
      when 'validar_reporte' then
        perform public.validate_case_report(target_case_id, test.get('stroke'), true);
      when 'aprobar_reporte' then
        perform public.approve_case_report(target_case_id, test.get('stroke'), true);
      when 'devolver_reporte' then
        perform public.return_case_report(target_case_id, 'Motivo de prueba');
    end case;

    raise exception 'test: deshacer';
  exception when others then
    if sqlerrm = 'test: deshacer' then
      return null;
    end if;
    return sqlerrm;
  end;
end;
$$;

-- Copia de los casos para elegir al otro técnico sin depender de lo que ve cada persona.
create table test.case_snapshot as
select id, assigned_to from public.cases where organization_id = test.get('org_d')::uuid;
grant select on test.case_snapshot to authenticated;

-- Acciones posibles de cada caso según su estado: las que ve el administrador, que ve
-- todos los casos de su empresa.
create table test.case_candidates (case_key text, action text);
grant select on test.case_candidates to authenticated;

select test.login('admin_d');
set role authenticated;
create temporary table candidates_tmp as
select keys.case_key, actions.action
from unnest(array[
  'd_solicitado', 'd_rechazado', 'd_cancelado', 'd_aceptado', 'd_asignado', 'd_ejecucion',
  'd_espera', 'd_enviado', 'd_validado', 'd_aprobado', 'd_enviado_jefe', 'd_validado_propio'
]) as keys (case_key)
cross join lateral public.get_case_actions(test.get(keys.case_key)::uuid) as actions;
reset role;
insert into test.case_candidates select * from candidates_tmp;

select test.ok(
  (select count(*) from test.case_candidates where case_key in ('d_rechazado', 'd_cancelado', 'd_aprobado')) = 0,
  'una solicitud cerrada no tiene acciones'
);
select test.ok(
  (select string_agg(action, ',' order by action) from test.case_candidates where case_key = 'd_ejecucion')
    = 'asignar,editar_datos,editar_reporte,enviar_reporte,fotos_antes,fotos_despues,pausar,recursos',
  'un trabajo en ejecución ofrece las acciones de ejecución'
);

-- Resultado de cada persona, caso y acción.
create table test.case_action_results (
  user_name text,
  case_key text,
  action text,
  listed boolean,
  allowed boolean,
  reason text,
  failure text
);
grant select, insert on test.case_action_results to authenticated;

create function test.check_case_actions(user_name text)
returns void language plpgsql
as $$
declare
  candidate record;
  listed_row record;
begin
  perform test.login(user_name);
  set local role authenticated;
  for candidate in select * from test.case_candidates order by case_key, action loop
    select * into listed_row
    from public.get_case_actions(test.get(candidate.case_key)::uuid) as listed
    where listed.action = candidate.action;

    insert into test.case_action_results
    values (
      user_name,
      candidate.case_key,
      candidate.action,
      listed_row.action is not null,
      coalesce(listed_row.allowed, false),
      listed_row.reason,
      test.try_case_action(test.get(candidate.case_key)::uuid, candidate.action)
    );
  end loop;
  reset role;
end;
$$;

select test.check_case_actions(user_name)
from unnest(array['admin_d', 'jefe_t_d', 'tec_a_d', 'tec_b_d', 'jefe_s_d', 'sol_d', 'aud_d']) as users (user_name);

-- Ningún intento quedó aplicado.
select test.ok(
  (select bool_and(cases.status::text = expected.status)
   from (values
     ('d_solicitado', 'solicitado'), ('d_aceptado', 'aceptado'), ('d_asignado', 'asignado'),
     ('d_ejecucion', 'en_ejecucion'), ('d_espera', 'en_espera'), ('d_enviado', 'reporte_enviado'),
     ('d_validado', 'validado'), ('d_enviado_jefe', 'reporte_enviado'),
     ('d_validado_propio', 'validado')
   ) as expected (case_key, status)
   join public.cases on cases.id = test.get(expected.case_key)::uuid)
  and not exists (select 1 from public.case_photos where organization_id = test.get('org_d')::uuid)
  and not exists (select 1 from public.case_resource_usages where organization_id = test.get('org_d')::uuid),
  'cada intento se deshizo'
);

-- ---------------------------------------------------------------------------
-- Equivalencia
-- ---------------------------------------------------------------------------

select test.ok(
  (select count(*) from test.case_action_results) >= 200,
  format('se probaron %s combinaciones de persona, caso y acción',
         (select count(*) from test.case_action_results))
);

select test.ok(
  not exists (
    select 1 from test.case_action_results where allowed is distinct from (failure is null)
  ),
  'get_case_actions permite una acción exactamente cuando la acción funciona'
    || coalesce('; difieren: ' || (
      select string_agg(format('%s %s %s (dice %s, intento: %s)', user_name, case_key, action,
                               allowed, coalesce(failure, 'funcionó')), '; ')
      from test.case_action_results where allowed is distinct from (failure is null)
    ), '')
);

-- En las transiciones y el reporte, el motivo es el mismo mensaje que da la RPC.
select test.ok(
  not exists (
    select 1 from test.case_action_results
    where listed and not allowed
      and action not in ('editar_datos', 'editar_reporte', 'recursos')
      and reason is distinct from failure
  ),
  'el motivo de una acción no permitida es el mensaje de la RPC'
    || coalesce('; difieren: ' || (
      select string_agg(format('%s %s %s (motivo: %s; RPC: %s)', user_name, case_key, action,
                               reason, failure), '; ')
      from test.case_action_results
      where listed and not allowed
        and action not in ('editar_datos', 'editar_reporte', 'recursos')
        and reason is distinct from failure
    ), '')
);

select test.ok(
  not exists (
    select 1 from test.case_action_results where (listed and not allowed) is distinct from (reason is not null)
  ),
  'toda acción no permitida trae su motivo y ninguna permitida lo trae'
);

-- ---------------------------------------------------------------------------
-- Casos concretos, para que la equivalencia no pase por no permitir nada
-- ---------------------------------------------------------------------------

create function test.allowed_case_actions(user_name text, case_key text)
returns text language sql stable
as $$
  select coalesce(string_agg(action, ',' order by action), '')
  from test.case_action_results results
  where results.user_name = allowed_case_actions.user_name
    and results.case_key = allowed_case_actions.case_key
    and results.allowed;
$$;

select test.ok(test.allowed_case_actions('jefe_t_d', 'd_solicitado') = 'aceptar,editar_datos,rechazar',
  'el jefe técnico acepta, rechaza o edita una solicitud pendiente');
select test.ok(test.allowed_case_actions('sol_d', 'd_solicitado') = 'cancelar,editar_datos',
  'quien la creó la cancela o la edita');
select test.ok(test.allowed_case_actions('jefe_s_d', 'd_solicitado') = 'cancelar',
  'el jefe del área solicitante la cancela');
select test.ok(test.allowed_case_actions('admin_d', 'd_solicitado') = 'aceptar,editar_datos,rechazar',
  'el administrador acepta, rechaza o edita, pero no cancela');
select test.ok(test.allowed_case_actions('tec_a_d', 'd_asignado') = 'fotos_antes,iniciar',
  'el técnico asignado inicia y sube fotos de antes');
select test.ok(test.allowed_case_actions('tec_b_d', 'd_asignado') = '',
  'otro técnico no hace nada en un trabajo ajeno');
select test.ok(
  test.allowed_case_actions('tec_a_d', 'd_ejecucion')
    = 'editar_reporte,enviar_reporte,fotos_antes,fotos_despues,pausar,recursos',
  'el técnico en ejecución trabaja, pausa y envía el reporte'
);
select test.ok(
  test.allowed_case_actions('jefe_t_d', 'd_espera')
    = 'asignar,editar_datos,editar_reporte,fotos_antes,fotos_despues,reanudar,recursos',
  'el jefe técnico reasigna, reanuda y completa un trabajo en espera'
);
select test.ok(test.allowed_case_actions('jefe_t_d', 'd_enviado') = 'devolver_reporte,validar_reporte',
  'el jefe técnico valida o devuelve el reporte');
select test.ok(test.allowed_case_actions('admin_d', 'd_enviado') = '',
  'el administrador no valida si hay un jefe técnico que no ejecutó');
select test.ok(test.allowed_case_actions('admin_d', 'd_enviado_jefe') = 'devolver_reporte,validar_reporte',
  'el administrador valida lo que ejecutó el único jefe técnico');
select test.ok(test.allowed_case_actions('jefe_t_d', 'd_enviado_jefe') = '',
  'el jefe técnico no valida su propio trabajo');
select test.ok(test.allowed_case_actions('jefe_s_d', 'd_validado') = 'aprobar_reporte,devolver_reporte',
  'el jefe solicitante aprueba o devuelve');
select test.ok(test.allowed_case_actions('admin_d', 'd_validado') = '',
  'el administrador no aprueba si el jefe solicitante puede');
select test.ok(test.allowed_case_actions('admin_d', 'd_validado_propio') = 'aprobar_reporte,devolver_reporte',
  'el administrador da la conformidad cuando el jefe ya firmó como validador');
select test.ok(
  (select reason = 'Ya firmaste esta versión del reporte; la conformidad la da otra persona'
   from test.case_action_results
   where user_name = 'jefe_t_d' and case_key = 'd_validado_propio' and action = 'aprobar_reporte'),
  'al jefe que ya firmó se le explica por qué no aprueba'
);
select test.ok(
  (select count(*) = 0 from test.case_action_results where user_name = 'aud_d' and allowed)
  and (select count(*) > 0 from test.case_action_results where user_name = 'aud_d' and listed),
  'el auditor ve las acciones de los casos, pero no puede hacer ninguna'
);
select test.ok(
  (select count(*) = 0 from test.case_action_results
   where user_name = 'sol_d' and case_key = 'd_validado_propio' and listed),
  'quien no ve el caso no recibe sus acciones'
);

-- Con la empresa inactiva, no hay acciones.
update public.organizations set is_active = false where id = test.get('org_d')::uuid;
select test.login('admin_d');
set role authenticated;
select test.ok(
  (select count(*) from public.get_case_actions(test.get('d_solicitado')::uuid)) = 0,
  'con la empresa inactiva, get_case_actions no devuelve acciones'
);
reset role;
update public.organizations set is_active = true where id = test.get('org_d')::uuid;

select test.ok(
  (select prosecdef = false from pg_proc where oid = 'public.get_case_actions(uuid)'::regprocedure)
  and not has_function_privilege('anon', 'public.get_case_actions(uuid)', 'execute')
  and not has_function_privilege('anon', 'private.case_action_denial(public.cases, text)', 'execute'),
  'get_case_actions es SECURITY INVOKER y anon no la ejecuta'
);

\echo 'Todas las pruebas de acciones del caso pasaron.'
