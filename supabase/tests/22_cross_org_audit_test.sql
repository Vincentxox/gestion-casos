-- Auditoría de aislamiento entre empresas (T-601, AGENTS.md §6 «Seguridad»).
-- Se ejecuta al final, sobre todos los datos que dejaron las pruebas anteriores
-- (empresas A, B y C, usuarios de cada rol y usuarios sin empresa).
--
-- 1. Reglas del catálogo: RLS en todas las tablas, `organization_id` en las tablas de
--    negocio, nada abierto a `anon`, funciones SECURITY DEFINER con `search_path` vacío.
-- 2. Lectura: ningún usuario ve filas de otra empresa en ninguna tabla.
-- 3. Escritura directa: ningún usuario cambia ni borra filas de otra empresa.
-- 4. Referencias cruzadas y RPC: nadie usa identificadores de otra empresa.
--
-- Si se agrega una tabla o una RPC nueva, esta prueba la incluye sola en 1, 2 y 3.

\set ON_ERROR_STOP 1
\set QUIET 1

-- ---------------------------------------------------------------------------
-- 1. Reglas del catálogo
-- ---------------------------------------------------------------------------

select test.ok(
  not exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity
  ),
  'todas las tablas de public tienen RLS activado'
);

-- Excepciones revisadas: `organizations` es la empresa misma y `push_tokens` es de cada
-- usuario (RLS por `user_id`). Una tabla nueva sin `organization_id` debe justificarse aquí.
select test.ok(
  (select coalesce(array_agg(c.relname::text order by c.relname), '{}')
   from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind in ('r', 'p')
     and not exists (
       select 1 from pg_attribute a
       where a.attrelid = c.oid and a.attname = 'organization_id' and not a.attisdropped
     )) = array['organizations', 'push_tokens'],
  'toda tabla de negocio tiene organization_id'
);

select test.ok(
  not exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('v', 'm')
  ),
  'no hay vistas en public que puedan saltarse RLS'
);

select test.ok(
  not exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p', 'S')
      and (has_table_privilege('anon', c.oid, 'select, insert, update, delete, truncate')
        or has_any_column_privilege('anon', c.oid, 'select, insert, update'))
  ),
  'anon no tiene ningún permiso sobre tablas ni secuencias de public'
);

-- has_table_privilege no revisa USAGE, que basta para llamar a nextval().
select test.ok(
  not exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and case when c.relkind = 'S'
        then has_sequence_privilege('anon', c.oid, 'usage, select, update')
        else false
      end
  ),
  'anon no puede usar, leer ni reiniciar las secuencias de public'
);

select test.ok(
  not exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and case when c.relkind = 'S'
        then has_sequence_privilege('authenticated', c.oid, 'usage, select, update')
        else false
      end
  ),
  'los usuarios no pueden leer ni reiniciar las secuencias de public'
);

select test.ok(
  not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'private') and has_function_privilege('anon', p.oid, 'execute')
  ),
  'anon no ejecuta ninguna función de public ni de private'
);

select test.ok(
  not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'private') and p.prosecdef
      and not coalesce('search_path=""' = any (p.proconfig), false)
  ),
  'toda función SECURITY DEFINER fija search_path vacío'
);

select test.ok(
  not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('claim_pending_push', 'claim_stale_photo_reservations', 'complete_push',
                        'release_push', 'handle_new_user')
      and has_function_privilege('authenticated', p.oid, 'execute')
  ),
  'las funciones de servicio no son ejecutables por usuarios'
);

select test.ok(
  not exists (
    select 1 from pg_policies
    where schemaname in ('public', 'storage')
      and (coalesce(qual, '') || coalesce(with_check, '')) ~* '(user_metadata|raw_user_meta_data|auth\.jwt)'
  ),
  'ninguna política autoriza con metadatos del usuario ni con el JWT'
);

select test.ok(
  not exists (select 1 from storage.buckets where public),
  'ningún bucket de Storage es público'
);

-- ---------------------------------------------------------------------------
-- 2. Lectura: nadie ve filas de otra empresa
-- ---------------------------------------------------------------------------
-- Excepción revisada: quien pidió acceso a una empresa ve su propia solicitud de acceso,
-- aunque todavía no pertenezca a ella o ya esté en otra.

create table test.leaks (user_name text, object_name text, rows bigint);
grant insert on test.leaks to authenticated;

do $$
declare
  member record;
  target record;
  found_rows bigint;
begin
  for member in
    select users.name, users.id, profiles.organization_id
    from test.users users left join public.profiles on profiles.id = users.id
    order by users.name
  loop
    perform test.login(member.name);
    set local role authenticated;

    for target in
      select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind in ('r', 'p')
        and exists (select 1 from pg_attribute a where a.attrelid = c.oid
                    and a.attname = 'organization_id' and not a.attisdropped)
    loop
      execute format(
        'select count(*) from public.%I as row where row.organization_id is distinct from $1 %s',
        target.relname,
        case when target.relname = 'organization_access_requests' then 'and row.user_id <> $2' else '' end
      ) into found_rows using member.organization_id, member.id;
      if found_rows > 0 then
        insert into test.leaks values (member.name, target.relname, found_rows);
      end if;
    end loop;

    select count(*) into found_rows from public.organizations
    where id is distinct from member.organization_id;
    if found_rows > 0 then insert into test.leaks values (member.name, 'organizations', found_rows); end if;

    select count(*) into found_rows from public.push_tokens where user_id <> member.id;
    if found_rows > 0 then insert into test.leaks values (member.name, 'push_tokens', found_rows); end if;

    -- Las rutas de Storage empiezan por la empresa: <empresa>/<solicitud>/…
    select count(*) into found_rows from storage.objects
    where (string_to_array(name, '/'))[1] is distinct from member.organization_id::text;
    if found_rows > 0 then insert into test.leaks values (member.name, 'storage.objects', found_rows); end if;

    reset role;
  end loop;
end $$;

select test.ok(
  (select count(*) from test.users) >= 20
  and (select count(distinct organization_id) from public.profiles where organization_id is not null) >= 3,
  'la auditoría recorre al menos 20 usuarios de 3 empresas y usuarios sin empresa'
);

select test.ok(
  not exists (select 1 from test.leaks),
  'ningún usuario de ningún rol ve filas de otra empresa: '
    || coalesce((select string_agg(format('%s en %s (%s)', user_name, object_name, rows), '; ')
                 from test.leaks), 'sin filtraciones')
);

-- ---------------------------------------------------------------------------
-- 3. Escritura directa: nadie cambia ni borra filas de otra empresa
-- ---------------------------------------------------------------------------
-- Para cada tabla, se intenta actualizar (con una columna que el rol sí puede cambiar)
-- y borrar todas las filas de otras empresas. Un error de permisos también es correcto.
-- Cada intento se deshace al final para no alterar los datos de las demás pruebas.

truncate test.leaks;

do $$
declare
  member record;
  target record;
  editable_column text;
  touched bigint;
  operation text;
begin
  for member in
    select users.name, users.id, profiles.organization_id
    from test.users users left join public.profiles on profiles.id = users.id
    order by users.name
  loop
    for target in
      select c.oid, c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind in ('r', 'p')
    loop
      select a.attname into editable_column
      from pg_attribute a
      where a.attrelid = target.oid and a.attnum > 0 and not a.attisdropped
        and has_column_privilege('authenticated', target.oid, a.attnum, 'update')
      order by a.attnum limit 1;

      foreach operation in array array['update', 'delete'] loop
        continue when operation = 'update' and editable_column is null;
        continue when operation = 'delete' and not has_table_privilege('authenticated', target.oid, 'delete');
        touched := 0;
        begin
          perform test.login(member.name);
          set local role authenticated;
          execute format(
            case operation
              when 'update' then 'update public.%1$I as row set %2$I = row.%2$I where %3$s'
              else 'delete from public.%1$I as row where %3$s'
            end,
            target.relname,
            editable_column,
            case
              when target.relname = 'organizations' then 'row.id is distinct from $1'
              when target.relname = 'push_tokens' then 'row.user_id <> $2'
              else 'row.organization_id is distinct from $1'
            end
          ) using member.organization_id, member.id;
          get diagnostics touched = row_count;
          reset role;
          raise exception using errcode = 'P0001', message = 'deshacer', detail = touched::text;
        exception
          when insufficient_privilege then reset role;
          when raise_exception then
            reset role;
            if sqlerrm = 'deshacer' then
              get stacked diagnostics operation = pg_exception_detail;
              touched := operation::bigint;
              operation := 'escritura';
              if touched > 0 then
                insert into test.leaks values (member.name, target.relname, touched);
              end if;
            end if;
        end;
      end loop;
    end loop;
  end loop;
end $$;

select test.ok(
  not exists (select 1 from test.leaks),
  'ningún usuario cambia ni borra filas de otra empresa: '
    || coalesce((select string_agg(format('%s en %s (%s)', user_name, object_name, rows), '; ')
                 from test.leaks), 'sin filtraciones')
);

-- ---------------------------------------------------------------------------
-- 4. Referencias cruzadas y RPC con identificadores de otra empresa
-- ---------------------------------------------------------------------------
-- Los usuarios de la empresa C intentan usar solicitudes, áreas, recursos, fotos, avisos y
-- solicitudes de acceso de la empresa A. Cada intento debe fallar con el error de «no
-- encontrado» o de permiso, no con otro error que oculte si la empresa se comprobó.

-- Si aparece una función nueva ejecutable por los usuarios, esta prueba falla hasta que
-- se agregue a una de las listas: probada abajo con datos de otra empresa, o revisada
-- porque no recibe identificadores de otra empresa (usa la del usuario o filtra por RLS).
-- Se compara la firma completa: una sobrecarga nueva con el mismo nombre también falla.
select test.set('unreviewed_functions', (
  select coalesce(string_agg(signature, ', ' order by signature), '')
  from (
    select p.proname || '(' || oidvectortypes(p.proargtypes) || ')' as signature
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and has_function_privilege('authenticated', p.oid, 'execute')
  ) functions
  where signature not in (
    -- Probadas en esta sección con identificadores de A.
    'approve_access_request(uuid, app_role, uuid)',
    'approve_case_report(uuid, text, boolean)',
    'confirm_case_photo(uuid)',
    'delete_case_photo(uuid)',
    'get_case_indicators(timestamp with time zone, timestamp with time zone)',
    'mark_notifications_read(bigint[])',
    'reject_access_request(uuid, text)',
    'reserve_case_photo(uuid, photo_kind)',
    'return_case_report(uuid, text)',
    'set_member_access(uuid, app_role, uuid)',
    'submit_case_report(uuid, text, boolean)',
    'transition_case(uuid, case_action, text, uuid)',
    'validate_case_report(uuid, text, boolean)',
    'verify_report_code(text)',
    -- Sin identificadores de otra empresa: actúan sobre el propio usuario o su empresa.
    'accept_pending_invitation()',
    'cancel_my_access_request()',
    'get_home_summary()',
    'get_my_access_request()',
    'get_organization_join_code()',
    'regenerate_organization_join_code()',
    'register_push_token(text, text)',
    'request_organization_access(text)',
    'set_priority_target(case_priority, integer, integer)',
    'unregister_push_token(text)',
    -- SECURITY INVOKER: calculan sobre una fila de cases que RLS ya filtró.
    'due_at(cases)',
    'overdue_stage(cases)'
  )));
select test.ok(
  test.get('unreviewed_functions') = '',
  'toda función ejecutable por los usuarios está revisada en la auditoría'
    || coalesce(nullif('; faltan: ' || test.get('unreviewed_functions'), '; faltan: '), '')
);

select test.ok(
  not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in ('due_at', 'overdue_stage', 'verify_report_code')
      and p.prosecdef
  ),
  'due_at, overdue_stage y verify_report_code siguen filtradas por RLS (SECURITY INVOKER)'
);

-- Las funciones de reportes revisan la empresa antes que el estado. Igual se prueban con
-- una solicitud en el estado que cada una espera, para que un cambio de orden no deje la
-- prueba pasando por el motivo equivocado.
-- Se usa el trabajo en ejecución sin técnico asignado; el que tiene técnico queda para
-- las pruebas de fotos.
update public.cases set status = 'reporte_enviado'
where id = (select id from public.cases
            where organization_id = test.get('org_a')::uuid and status = 'en_ejecucion'
              and assigned_to is null
            order by id limit 1);

select test.set('a_case_open', (select id::text from public.cases
  where organization_id = test.get('org_a')::uuid and status = 'en_ejecucion'
    and assigned_to is not null
  order by id limit 1));
select test.set('a_open_technician', (select users.name from public.cases
  join test.users users on users.id = cases.assigned_to
  where cases.id = test.get('a_case_open')::uuid));
select test.set('a_case_sent', (select id::text from public.cases
  where organization_id = test.get('org_a')::uuid and status = 'reporte_enviado' limit 1));
select test.set('a_report_code', (select left(versions.content_hash, 16)
  from public.case_report_versions versions join public.cases on cases.id = versions.case_id
  where cases.organization_id = test.get('org_a')::uuid limit 1));
select test.set('c_case_assigned', (select id::text from public.cases
  where organization_id = test.get('org_c')::uuid and status = 'asignado' limit 1));
select test.set('a_case_validated', (select id::text from public.cases
  where organization_id = test.get('org_a')::uuid and status = 'validado' limit 1));
select test.set('a_case_new', (select id::text from public.cases
  where organization_id = test.get('org_a')::uuid and status = 'solicitado' limit 1));
select test.set('a_photo', (select id::text from public.case_photos
  where organization_id = test.get('org_a')::uuid limit 1));
select test.set('a_request', (select id::text from public.organization_access_requests
  where organization_id = test.get('org_a')::uuid and status = 'pendiente' limit 1));
select test.set('a_resource', (select id::text from public.resources
  where organization_id = test.get('org_a')::uuid limit 1));
select test.set('a_notifications', (select array_agg(id)::text from public.notifications
  where organization_id = test.get('org_a')::uuid and read_at is null));
select test.ok(
  test.get('a_case_open') is not null and test.get('a_case_validated') is not null
  and test.get('a_case_sent') is not null and test.get('a_report_code') is not null
  and test.get('c_case_assigned') is not null and test.get('a_open_technician') is not null
  and test.get('a_case_new') is not null and test.get('a_photo') is not null
  and test.get('a_request') is not null and test.get('a_resource') is not null
  and test.get('a_notifications') is not null,
  'la empresa A tiene datos de cada tipo para intentar usarlos desde C'
);

-- Escrituras con referencias a otra empresa.
select test.login('sol_c');
set role authenticated;
select test.throws(
  format($$insert into public.cases (title, description, location, category_id)
           values ('Cruce', 'Tipo de servicio de otra empresa', 'Planta', %L)$$, test.get('cat_elec')),
  'Selecciona un tipo de servicio disponible', 'C no crea solicitudes con un tipo de servicio de A'
);
reset role;

select test.login('tec_c');
set role authenticated;
select test.throws(
  format($$insert into public.case_reports (case_id, diagnosis) values (%L, 'Cruce')$$, test.get('a_case_open')),
  'row-level security', 'C no crea el reporte de una solicitud de A'
);
select test.throws(
  format($$insert into public.case_resource_usages (case_id, kind, resource_id, quantity)
           values (%L, 'recurso', %L, 1)$$, test.get('a_case_open'), test.get('a_resource')),
  'Solicitud no encontrada', 'C no registra recursos en una solicitud de A'
);
select test.throws(
  format($$select public.confirm_case_photo(%L)$$, test.get('a_photo')),
  'Foto no encontrada', 'C no confirma fotos de A'
);
select test.throws(
  format($$select public.delete_case_photo(%L)$$, test.get('a_photo')),
  'Foto no encontrada', 'C no borra fotos de A'
);
select test.throws(
  format($$select public.submit_case_report(%L, 'M0,0 L1,1', true)$$, test.get('a_case_open')),
  'Solicitud no encontrada', 'C no envía el reporte de una solicitud de A'
);
select test.throws(
  format($$select public.transition_case(%L, 'pausar')$$, test.get('a_case_open')),
  'Solicitud no encontrada', 'un técnico de C no cambia el estado de una solicitud de A'
);
reset role;

select test.login('jefe_c');
set role authenticated;
-- Un jefe del área técnica puede agregar fotos de antes a un trabajo en ejecución de su
-- empresa; aquí solo lo impide que la solicitud sea de A.
select test.throws(
  format($$select public.reserve_case_photo(%L, 'antes')$$, test.get('a_case_open')),
  'No puedes agregar fotos de antes a esta solicitud', 'un jefe de C no sube fotos a una solicitud de A'
);
select test.throws(
  format($$select public.transition_case(%L, 'aceptar')$$, test.get('a_case_new')),
  'Solicitud no encontrada', 'un jefe de C no acepta solicitudes de A'
);
select test.throws(
  format($$select public.validate_case_report(%L, 'M0,0 L1,1', true)$$, test.get('a_case_sent')),
  'Solicitud no encontrada', 'un jefe de C no valida reportes de A'
);
select test.throws(
  format($$select public.return_case_report(%L, 'Devolución cruzada')$$, test.get('a_case_sent')),
  'Solicitud no encontrada', 'un jefe de C no devuelve reportes de A'
);
select test.throws(
  format($$select public.transition_case(%L, 'asignar', 'Asignación cruzada', %L)$$,
         test.get('c_case_assigned'), test.uid('tec1')),
  'El técnico debe pertenecer al área técnica de la solicitud',
  'un jefe de C no asigna su solicitud a un técnico de A'
);
select test.ok(
  (select count(*) from public.verify_report_code(test.get('a_report_code'))) = 0,
  'C no verifica códigos de reportes de A'
);
reset role;

select test.login('admin_c');
set role authenticated;
select test.throws(
  format($$select public.approve_case_report(%L, 'M0,0 L1,1', true)$$, test.get('a_case_validated')),
  'Solicitud no encontrada', 'un administrador de C no aprueba reportes de A'
);
select test.throws(
  format($$select public.transition_case(%L, 'cancelar', 'Cancelación cruzada')$$, test.get('a_case_new')),
  'Solicitud no encontrada', 'un administrador de C no cancela solicitudes de A'
);
select test.throws(
  format($$select public.approve_access_request(%L, 'tecnico', %L)$$, test.get('a_request'), test.get('area_mant_c')),
  'Solicitud de acceso no encontrada', 'un administrador de C no aprueba solicitudes de acceso a A'
);
select test.throws(
  format($$select public.reject_access_request(%L, 'Rechazo cruzado')$$, test.get('a_request')),
  'Solicitud de acceso no encontrada o ya resuelta', 'un administrador de C no rechaza solicitudes de acceso a A'
);
select test.throws(
  format($$select public.set_member_access(%L, 'administrador', null)$$, test.uid('tec1')),
  'Usuario no encontrado', 'un administrador de C no cambia el rol de un miembro de A'
);
select test.throws(
  format($$select public.set_member_access(%L, 'tecnico', %L)$$, test.uid('tec_c'), test.get('area_mant')),
  'Área no disponible', 'un administrador de C no asigna a su técnico un área de A'
);
select test.throws(
  format($$insert into public.categories (area_id, name) values (%L, 'Cruce')$$, test.get('area_mant')),
  'Área no disponible', 'un administrador de C no crea tipos de servicio en un área de A'
);
select test.throws(
  format($$insert into public.organization_invitations (email, role, area_id)
           values ('cruce@c.test', 'tecnico', %L)$$, test.get('area_mant')),
  'Área no disponible', 'un administrador de C no invita personas a un área de A'
);
select test.ok(
  public.mark_notifications_read(test.get('a_notifications')::bigint[]) = 0,
  'un administrador de C no marca como leídos los avisos de A'
);
select test.ok(
  (public.get_case_indicators() ->> 'total')::integer
    = (select count(*) from public.cases where organization_id = test.get('org_c')::uuid),
  'los indicadores de C cuentan solo las solicitudes de C'
);
reset role;

select test.ok(
  (select count(*) from public.notifications
   where id = any (test.get('a_notifications')::bigint[]) and read_at is null)
    = cardinality(test.get('a_notifications')::bigint[])
  and (select status from public.cases where id = test.get('a_case_new')::uuid) = 'solicitado'
  and (select status from public.cases where id = test.get('a_case_open')::uuid) = 'en_ejecucion'
  and (select status from public.cases where id = test.get('a_case_validated')::uuid) = 'validado'
  and (select status from public.cases where id = test.get('a_case_sent')::uuid) = 'reporte_enviado'
  and (select assigned_to from public.cases where id = test.get('c_case_assigned')::uuid)
    is distinct from test.uid('tec1')
  and (select status from public.organization_access_requests where id = test.get('a_request')::uuid) = 'pendiente',
  'los datos de A siguen intactos después de los intentos desde C'
);

-- ---------------------------------------------------------------------------
-- 5. Storage: nadie sube, cambia ni borra archivos de otra empresa
-- ---------------------------------------------------------------------------
-- El técnico asignado a un trabajo de A reserva una foto. Él puede subir el archivo
-- (control positivo) y nadie más puede subirlo, ni de su empresa ni de otra. Además, cada usuario
-- intenta cambiar y borrar los archivos de las demás empresas. Todo se deshace al final.

truncate test.leaks;
select test.set('a_open_pending', (select count(*)::text from public.case_photos
  where case_id = test.get('a_case_open')::uuid and confirmed_at is null));
select test.set('objects_before', (select count(*)::text from storage.objects));

do $$
declare
  member record;
  reservation jsonb;
  uploaded boolean;
  touched bigint;
  attempt text;
  found_leaks text[] := '{}';
begin
  begin
    perform test.login(test.get('a_open_technician'));
    set local role authenticated;
    reservation := public.reserve_case_photo(test.get('a_case_open')::uuid, 'antes');
    reset role;

    for member in
      select users.name, users.id, profiles.organization_id
      from test.users users left join public.profiles on profiles.id = users.id
      order by users.name
    loop
      perform test.login(member.name);
      set local role authenticated;

      -- Cada subida se deshace enseguida para que la siguiente no choque con el archivo.
      uploaded := false;
      begin
        insert into storage.objects (bucket_id, name, owner)
        values (reservation ->> 'bucket', reservation ->> 'image_path', member.id);
        uploaded := true;
        raise exception using errcode = 'P0001', message = 'deshacer subida';
      exception
        when insufficient_privilege then null;
        when raise_exception then
          if sqlerrm <> 'deshacer subida' then
            raise;
          end if;
      end;
      if uploaded and member.name <> test.get('a_open_technician') then
        found_leaks := found_leaks || format('%s subió a una reserva ajena', member.name);
      elsif not uploaded and member.name = test.get('a_open_technician') then
        found_leaks := found_leaks || format('%s no pudo subir su propia reserva', member.name);
      end if;

      foreach attempt in array array['update', 'delete'] loop
        touched := 0;
        begin
          execute format(
            case attempt
              when 'update' then 'update storage.objects set metadata = metadata where %s'
              else 'delete from storage.objects where %s'
            end,
            '(string_to_array(name, ''/''))[1] is distinct from $1::text'
          ) using member.organization_id;
          get diagnostics touched = row_count;
        exception when insufficient_privilege then
          null;
        end;
        if touched > 0 then
          found_leaks := found_leaks || format('%s: %s de %s archivos de otra empresa',
                                               member.name, attempt, touched);
        end if;
      end loop;

      reset role;
    end loop;

    raise exception using errcode = 'P0001', message = 'deshacer',
      detail = array_to_string(found_leaks, '; ');
  exception when raise_exception then
    reset role;
    if sqlerrm <> 'deshacer' then
      raise;
    end if;
    get stacked diagnostics attempt = pg_exception_detail;
    if attempt <> '' then
      insert into test.leaks values ('storage', attempt, 0);
    end if;
  end;
end $$;

select test.ok(
  not exists (select 1 from test.leaks),
  'en Storage solo quien reservó sube su foto y nadie cambia ni borra archivos de otra empresa: '
    || coalesce((select string_agg(object_name, '; ') from test.leaks), 'sin filtraciones')
);

select test.ok(
  (select count(*) from public.case_photos
   where case_id = test.get('a_case_open')::uuid and confirmed_at is null)
    = test.get('a_open_pending')::bigint
  and (select count(*) from storage.objects) = test.get('objects_before')::bigint,
  'la reserva y los archivos de prueba se deshicieron'
);

drop table test.leaks;

\echo 'Todas las pruebas de aislamiento entre empresas pasaron.'
