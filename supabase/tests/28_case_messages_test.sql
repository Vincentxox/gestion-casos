-- Pruebas: mensajes dentro del caso (docs/BUSINESS_RULES.md, sección 5.7).
--
-- Usa la Empresa D de la prueba 27 (un caso en cada estado y ocho personas) y la Empresa E
-- como empresa ajena.

\set ON_ERROR_STOP 1
\set QUIET 1

-- Devuelve null si el mensaje se escribió y el error si no. Siempre se deshace.
create function test.try_message(target_case_id uuid, message text default 'Mensaje de prueba')
returns text language plpgsql
as $$
begin
  begin
    perform public.send_case_message(target_case_id, message);
    raise exception 'test: deshacer';
  exception when others then
    if sqlerrm = 'test: deshacer' then
      return null;
    end if;
    return sqlerrm;
  end;
end;
$$;

-- ---------------------------------------------------------------------------
-- 1. get_case_actions ofrece «mensaje» exactamente cuando se puede escribir
-- ---------------------------------------------------------------------------

create table test.message_results (
  user_name text,
  case_key text,
  listed boolean,
  allowed boolean,
  failure text
);
grant select, insert on test.message_results to authenticated;

create function test.check_messages(user_name text)
returns void language plpgsql
as $$
declare
  case_key text;
  listed_row record;
begin
  perform test.login(user_name);
  set local role authenticated;
  for case_key in select distinct candidates.case_key from test.case_candidates as candidates loop
    select * into listed_row
    from public.get_case_actions(test.get(case_key)::uuid) as listed
    where listed.action = 'mensaje';

    insert into test.message_results
    values (
      user_name,
      case_key,
      listed_row.action is not null,
      coalesce(listed_row.allowed, false),
      test.try_message(test.get(case_key)::uuid)
    );
  end loop;
  reset role;
end;
$$;

select test.check_messages(user_name)
from unnest(array['admin_d', 'jefe_t_d', 'tec_a_d', 'tec_b_d', 'jefe_s_d', 'sol_d', 'sol_c_d', 'aud_d']) as users (user_name);

select test.ok(
  (select count(*) = 8 * 14 from test.message_results)
  and not exists (
    select 1 from test.message_results where allowed is distinct from (failure is null)
  ),
  'get_case_actions permite «mensaje» exactamente cuando send_case_message funciona'
);

select test.ok(
  not exists (
    select 1 from test.message_results
    where case_key in ('d_rechazado', 'd_cancelado', 'd_aprobado') and (listed or allowed)
  )
  and (select bool_and(failure in ('La solicitud está cerrada', 'Solicitud no encontrada'))
       from test.message_results
       where case_key in ('d_rechazado', 'd_cancelado', 'd_aprobado')),
  'en un caso cerrado nadie escribe ni se ofrece «mensaje»'
);

-- Participantes de una solicitud nueva de Ventas D: su creador, la jefa de Ventas D, el
-- jefe técnico y la administradora. Los técnicos, Compras D y la auditora no escriben.
select test.ok(
  (select string_agg(user_name, ',' order by user_name) from test.message_results
   where case_key = 'd_solicitado' and allowed) = 'admin_d,jefe_s_d,jefe_t_d,sol_d',
  'en una solicitud pendiente escriben el creador, los dos jefes y el administrador'
);
select test.ok(
  (select string_agg(user_name, ',' order by user_name) from test.message_results
   where case_key = 'd_ejecucion' and allowed) = 'admin_d,jefe_s_d,jefe_t_d,sol_d,tec_a_d',
  'en un trabajo en curso también escribe el técnico asignado, pero no el otro técnico'
);
select test.ok(
  (select bool_and(not allowed and failure = 'Solo quienes participan en la solicitud pueden escribir mensajes')
   from test.message_results
   where user_name = 'aud_d' and case_key = 'd_ejecucion'),
  'la auditora ve el caso, pero no escribe, y se le explica por qué'
);

-- ---------------------------------------------------------------------------
-- 2. El mensaje queda en el historial, sin cambiar el caso
-- ---------------------------------------------------------------------------

select test.set('d_ejecucion_updated', (select updated_at::text from public.cases
  where id = test.get('d_ejecucion')::uuid));

select test.login('sol_d');
set role authenticated;
select test.set('msg_1', public.send_case_message(test.get('d_ejecucion')::uuid,
  '   ¿Pueden revisar también el enchufe?   ')::text);
reset role;

select test.ok(
  (select action = 'mensaje'
     and from_status = 'en_ejecucion' and to_status = 'en_ejecucion'
     and actor_id = test.uid('sol_d') and actor_role = 'solicitante'
     and comment = '¿Pueden revisar también el enchufe?'
   from public.case_events where id = test.get('msg_1')::bigint)
  and (select status = 'en_ejecucion' and updated_at::text = test.get('d_ejecucion_updated')
       from public.cases where id = test.get('d_ejecucion')::uuid),
  'el mensaje se guarda como evento sin espacios sobrantes y el caso no cambia'
);

select test.login('aud_d');
set role authenticated;
select test.ok(
  (select count(*) = 1 from public.case_events where id = test.get('msg_1')::bigint),
  'quien puede leer el caso lee sus mensajes'
);
reset role;

select test.login('sol_c_d');
set role authenticated;
select test.ok(
  (select count(*) = 0 from public.case_events where id = test.get('msg_1')::bigint),
  'quien no ve el caso no ve sus mensajes'
);
reset role;

-- ---------------------------------------------------------------------------
-- 3. Avisos
-- ---------------------------------------------------------------------------

select test.ok(
  (select string_agg(profiles.full_name, ',' order by profiles.full_name)
   from public.notifications
   join public.profiles on profiles.id = notifications.recipient_id
   where event_id = test.get('msg_1')::bigint)
    = 'Julio Jefe Técnico D,Sara Jefa Solicitante D,Tomás Técnico A'
  and (select bool_and(action = 'mensaje' and title = 'Nuevo mensaje'
                       and body like '%¿Pueden revisar también el enchufe?%Simón Solicitante D')
       from public.notifications where event_id = test.get('msg_1')::bigint),
  'el mensaje avisa al técnico y a los dos jefes, con el texto, y no a quien lo escribió'
);

select test.login('admin_d');
set role authenticated;
select test.set('msg_2', public.send_case_message(test.get('d_ejecucion')::uuid,
  'Autorizado, cambien el enchufe.')::text);
reset role;
select test.login('tec_a_d');
set role authenticated;
select test.set('msg_3', public.send_case_message(test.get('d_ejecucion')::uuid,
  'Listo, queda incluido en el reporte.')::text);
reset role;

select test.ok(
  (select count(*) = 0 from public.notifications
   where event_id = test.get('msg_1')::bigint and recipient_id = test.uid('admin_d'))
  and (select count(*) = 1 from public.notifications
       where event_id = test.get('msg_3')::bigint and recipient_id = test.uid('admin_d'))
  and (select count(*) = 1 from public.notifications
       where event_id = test.get('msg_3')::bigint and recipient_id = test.uid('sol_d'))
  and (select count(*) = 0 from public.notifications
       where event_id = test.get('msg_3')::bigint
         and recipient_id in (test.uid('tec_a_d'), test.uid('aud_d'), test.uid('tec_b_d'))),
  'un administrador recibe avisos del caso después de escribir en él; la auditora y el otro técnico no'
);

-- ---------------------------------------------------------------------------
-- 4. Validaciones y escritura directa
-- ---------------------------------------------------------------------------

select test.login('sol_d');
set role authenticated;
select test.ok(
  test.try_message(test.get('d_ejecucion')::uuid, '  ab  ') = 'El mensaje debe tener entre 3 y 500 caracteres'
  and test.try_message(test.get('d_ejecucion')::uuid, repeat('a', 501)) = 'El mensaje debe tener entre 3 y 500 caracteres'
  and test.try_message(test.get('d_ejecucion')::uuid, null) = 'El mensaje debe tener entre 3 y 500 caracteres'
  and test.try_message(test.get('d_ejecucion')::uuid, repeat('a', 500)) is null,
  'el mensaje debe tener entre 3 y 500 caracteres'
);
select test.ok(
  test.try_message(gen_random_uuid()) = 'Solicitud no encontrada',
  'un caso que no existe no se encuentra'
);
select test.throws(
  format($$select public.transition_case(%L, 'mensaje', 'Por la RPC de estados')$$, test.get('d_ejecucion')),
  'Acción no disponible',
  'transition_case no acepta «mensaje»'
);
select test.throws(
  format($$insert into public.case_events (case_id, organization_id, action, to_status, actor_id, comment)
           values (%L, %L, 'mensaje', 'en_ejecucion', %L, 'Directo')$$,
         test.get('d_ejecucion'), test.get('org_d'), test.uid('sol_d')),
  'permission denied for table case_events',
  'nadie escribe mensajes directo en el historial'
);
select test.throws(
  format($$update public.case_events set comment = 'Editado' where id = %s$$, test.get('msg_1')),
  'permission denied',
  'nadie edita un mensaje'
);
select test.throws(
  format($$delete from public.case_events where id = %s$$, test.get('msg_1')),
  'permission denied',
  'nadie borra un mensaje'
);
reset role;

-- ---------------------------------------------------------------------------
-- 5. Otra empresa, empresa inactiva y miembros dados de baja
-- ---------------------------------------------------------------------------

select test.login('admin_e');
set role authenticated;
select test.ok(
  test.try_message(test.get('d_ejecucion')::uuid) = 'Solicitud no encontrada',
  'el administrador de otra empresa no escribe en un caso ajeno'
);
reset role;

update public.organizations set is_active = false where id = test.get('org_d')::uuid;
select test.login('jefe_t_d');
set role authenticated;
select test.ok(
  test.try_message(test.get('d_ejecucion')::uuid) like 'Tu empresa está inactiva%',
  'con la empresa inactiva no se escriben mensajes'
);
reset role;
update public.organizations set is_active = true where id = test.get('org_d')::uuid;

select test.ok(
  (select prosecdef and 'search_path=""' = any(proconfig)
   from pg_proc where oid = 'public.send_case_message(uuid, text)'::regprocedure)
  and not has_function_privilege('anon', 'public.send_case_message(uuid, text)', 'execute')
  and has_function_privilege('authenticated', 'public.send_case_message(uuid, text)', 'execute'),
  'send_case_message es SECURITY DEFINER con search_path vacío y anon no la ejecuta'
);

-- ---------------------------------------------------------------------------
-- 6. Solo escribe y recibe avisos quien hoy ve el caso
-- ---------------------------------------------------------------------------

-- member_can_read_case repite la política de lectura de cases para cualquier persona.
create table test.visibility_results (user_name text, case_key text, by_policy boolean, by_helper boolean);
grant select, insert on test.visibility_results to authenticated;

create function test.check_visibility(user_name text)
returns void language plpgsql
as $$
declare
  case_key text;
  helper_result boolean;
begin
  for case_key in select distinct candidates.case_key from test.case_candidates as candidates loop
    select private.member_can_read_case(cases, test.uid(user_name)) into helper_result
    from public.cases where id = test.get(case_key)::uuid;

    perform test.login(user_name);
    set local role authenticated;
    insert into test.visibility_results
    values (
      user_name,
      case_key,
      exists (select 1 from public.cases where id = test.get(case_key)::uuid),
      helper_result
    );
    reset role;
  end loop;
end;
$$;

select test.check_visibility(user_name)
from unnest(array['admin_d', 'jefe_t_d', 'tec_a_d', 'tec_b_d', 'jefe_s_d', 'sol_d', 'sol_c_d', 'aud_d', 'admin_e']) as users (user_name);

select test.ok(
  (select count(*) = 9 * 14 from test.visibility_results)
  and (select count(*) filter (where by_policy) > 0 and count(*) filter (where not by_policy) > 0
       from test.visibility_results)
  and not exists (select 1 from test.visibility_results where by_policy is distinct from by_helper),
  'member_can_read_case coincide con la política de lectura de cases para 9 personas y 14 casos'
);

-- Quien no ve un caso de su empresa recibe la misma respuesta que si no existiera.
select test.login('sol_c_d');
set role authenticated;
select test.ok(
  (select count(*) = 0 from public.cases where id = test.get('d_ejecucion')::uuid)
  and test.try_message(test.get('d_ejecucion')::uuid) = 'Solicitud no encontrada'
  and test.try_message(test.get('d_aprobado')::uuid) = 'Solicitud no encontrada'
  and test.try_message(gen_random_uuid()) = 'Solicitud no encontrada',
  'para quien no ve el caso, un caso oculto de su empresa responde igual que uno inexistente'
);
reset role;

-- Una jefa que escribió y luego cambió de área deja de recibir los mensajes nuevos.
select test.login('jefe_s_d');
set role authenticated;
select test.set('msg_4', public.send_case_message(test.get('d_ejecucion')::uuid,
  'Quedo atenta al cierre.')::text);
reset role;

update public.profiles set area_id = test.get('area_compras_d')::uuid
where id = test.uid('jefe_s_d');

select test.login('sol_d');
set role authenticated;
select test.set('msg_5', public.send_case_message(test.get('d_ejecucion')::uuid,
  'Gracias, lo reviso mañana.')::text);
reset role;

select test.ok(
  (select count(*) = 0 from public.notifications
   where event_id = test.get('msg_5')::bigint and recipient_id = test.uid('jefe_s_d'))
  and (select count(*) = 1 from public.notifications
       where event_id = test.get('msg_5')::bigint and recipient_id = test.uid('admin_d')),
  'quien escribió y cambió de área ya no recibe los mensajes nuevos; el administrador sí'
);

update public.profiles set area_id = test.get('area_ventas_d')::uuid
where id = test.uid('jefe_s_d');

-- Un autor dado de baja tampoco recibe avisos.
select test.login('admin_d');
set role authenticated;
select public.deactivate_member(test.uid('jefe_s_d'));
reset role;

select test.login('tec_a_d');
set role authenticated;
select test.set('msg_6', public.send_case_message(test.get('d_ejecucion')::uuid,
  'Enchufe cambiado.')::text);
reset role;

select test.ok(
  (select count(*) = 0 from public.notifications
   where event_id = test.get('msg_6')::bigint and recipient_id = test.uid('jefe_s_d'))
  and (select count(*) = 1 from public.notifications
       where event_id = test.get('msg_6')::bigint and recipient_id = test.uid('sol_d')),
  'quien escribió y fue dado de baja no recibe avisos de mensajes nuevos'
);

select test.ok(
  not has_function_privilege('authenticated', 'private.member_can_read_case(public.cases, uuid)', 'execute')
  and not has_function_privilege('anon', 'private.member_can_read_case(public.cases, uuid)', 'execute'),
  'member_can_read_case no se ejecuta desde la app'
);

\echo 'Todas las pruebas de mensajes del caso pasaron.'
