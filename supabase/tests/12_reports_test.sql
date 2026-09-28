-- Pruebas de fotos, reporte de cierre, firmas, avisos y resumen del Inicio.
-- Se ejecutan después de 10 y 11, sobre los mismos datos. case1 está en ejecución,
-- asignado a tec1 (Mantenimiento) y creado por sol1 (Administración, jefe: jefe_sol).

\set ON_ERROR_STOP 1
\set QUIET 1

create function test.upload(object_name text, size_bytes integer, bucket text default 'case-media')
returns void language sql
as $$
  insert into storage.objects (bucket_id, name, owner, metadata)
  values (bucket, object_name, auth.uid(), jsonb_build_object('size', size_bytes, 'mimetype', 'image/jpeg'));
$$;
grant execute on function test.upload(text, integer, text) to authenticated;

-- Simula las cabeceras que PostgREST entrega a la base de datos.
select set_config(
  'request.headers',
  '{"x-forwarded-for": "203.0.113.9, 10.0.0.1", "user-agent": "NexoCasos/1.0 (Android 15)"}',
  false
);

select test.set('stroke', 'M 10 10 L 200 120 Q 250 160 300 100 C 320 90 360 140 420 180');

-- ---------------------------------------------------------------------------
-- 1. Fotos: reserva, subida, confirmación, límites y borrado
-- ---------------------------------------------------------------------------

select test.ok(
  (select id is not null and name = 'case-media' and public = false and file_size_limit = 2097152
   from storage.buckets where id = 'case-media'),
  'el bucket de fotos es privado y limita cada archivo a 2 MB'
);

select test.login('sol1');
set role authenticated;
select test.throws(
  format($$select public.reserve_case_photo(%L, 'antes')$$, test.get('case1')),
  'No puedes agregar fotos',
  'un solicitante no agrega fotos al trabajo'
);
reset role;

select test.login('tec2');
set role authenticated;
select test.throws(
  format($$select public.reserve_case_photo(%L, 'despues')$$, test.get('case1')),
  'No puedes agregar fotos',
  'un técnico de otra área no agrega fotos'
);
reset role;

select test.login('tec1');
set role authenticated;
select test.set('p_antes', public.reserve_case_photo(test.get('case1')::uuid, 'antes')::text);
select test.ok(
  (test.get('p_antes')::jsonb ->> 'image_path')
    = format('%s/%s/%s/full.jpg', test.get('org_a'), test.get('case1'), test.get('p_antes')::jsonb ->> 'id'),
  'la reserva devuelve la ruta <empresa>/<solicitud>/<foto>/full.jpg'
);
select test.throws(
  format($$select test.upload(%L, 1000)$$, test.get('org_a') || '/' || test.get('case1') || '/otra/full.jpg'),
  'row-level security',
  'no se sube a una ruta no reservada'
);
select test.upload(test.get('p_antes')::jsonb ->> 'image_path', 200000);
select test.throws(
  format($$select public.confirm_case_photo(%L)$$, test.get('p_antes')::jsonb ->> 'id'),
  'Sube la foto y su miniatura',
  'no se confirma sin la miniatura'
);
select test.upload(test.get('p_antes')::jsonb ->> 'thumb_path', 25000);
select test.ok(
  (select size_bytes = 225000 and confirmed_at is not null
   from public.confirm_case_photo((test.get('p_antes')::jsonb ->> 'id')::uuid)),
  'al confirmar se guarda el tamaño de la foto y su miniatura'
);
reset role;

-- Otra persona no puede subir a una ruta reservada por tec1.
select test.login('tec1');
set role authenticated;
select test.set('p_d1', public.reserve_case_photo(test.get('case1')::uuid, 'despues')::text);
reset role;
select test.login('jefe_tec');
set role authenticated;
select test.throws(
  format($$select test.upload(%L, 1000)$$, test.get('p_d1')::jsonb ->> 'image_path'),
  'row-level security',
  'solo quien reservó la foto puede subirla'
);
reset role;

select test.login('tec1');
set role authenticated;
select test.upload(test.get('p_d1')::jsonb ->> 'image_path', 180000);
select test.upload(test.get('p_d1')::jsonb ->> 'thumb_path', 20000);
select public.confirm_case_photo((test.get('p_d1')::jsonb ->> 'id')::uuid);
select test.set('p_d2', public.reserve_case_photo(test.get('case1')::uuid, 'despues')::text);
select test.set('p_d3', public.reserve_case_photo(test.get('case1')::uuid, 'despues')::text);
select test.throws(
  format($$select public.reserve_case_photo(%L, 'despues')$$, test.get('case1')),
  'Solo se permiten 3 fotos de después',
  'máximo 3 fotos de después, contando las reservas recientes'
);
reset role;

-- Las reservas sin confirmar no son visibles para otros; las confirmadas sí.
select test.login('sol1');
set role authenticated;
select test.ok(
  (select count(*) from public.case_photos where case_id = test.get('case1')::uuid) = 2,
  'quien ve la solicitud ve solo las fotos confirmadas'
);
select test.ok(
  (select count(*) from storage.objects where bucket_id = 'case-media') = 4,
  'quien ve la solicitud puede descargar sus archivos'
);
reset role;

select test.login('admin_b');
set role authenticated;
select test.ok(
  (select count(*) from storage.objects where bucket_id = 'case-media') = 0
    and (select count(*) from public.case_photos) = 0,
  'otra empresa no ve fotos ni archivos'
);
reset role;

-- Borrado: primero los archivos, luego el registro.
select test.login('tec1');
set role authenticated;
select test.throws(
  format($$select public.delete_case_photo(%L)$$, test.get('p_antes')::jsonb ->> 'id'),
  'Elimina primero los archivos',
  'no se borra el registro mientras existan sus archivos'
);
delete from storage.objects
where name in (test.get('p_antes')::jsonb ->> 'image_path', test.get('p_antes')::jsonb ->> 'thumb_path');
select public.delete_case_photo((test.get('p_antes')::jsonb ->> 'id')::uuid);
select test.ok(
  not exists (select 1 from public.case_photos where id = (test.get('p_antes')::jsonb ->> 'id')::uuid),
  'la foto se elimina después de borrar sus archivos'
);
-- Se descartan las dos reservas sin usar.
select public.delete_case_photo((test.get('p_d2')::jsonb ->> 'id')::uuid);
select public.delete_case_photo((test.get('p_d3')::jsonb ->> 'id')::uuid);
reset role;

-- Cuota de almacenamiento por empresa.
update public.organizations set storage_quota_bytes = 1000 where id = test.get('org_a')::uuid;
select test.login('tec1');
set role authenticated;
select test.throws(
  format($$select public.reserve_case_photo(%L, 'antes')$$, test.get('case1')),
  'límite de almacenamiento',
  'al llegar a la cuota no se aceptan fotos nuevas'
);
reset role;
update public.organizations set storage_quota_bytes = 1073741824 where id = test.get('org_a')::uuid;

-- ---------------------------------------------------------------------------
-- 2. Reporte: borrador y requisitos para enviar
-- ---------------------------------------------------------------------------

select test.login('admin');
set role authenticated;
update public.categories set min_after_photos = 2 where id = test.get('cat_elec')::uuid;
reset role;
select test.ok(
  (select min_after_photos = 2 from public.categories where id = test.get('cat_elec')::uuid),
  'el administrador configura el mínimo de fotos de después por tipo de servicio'
);

select test.login('sol1');
set role authenticated;
select test.throws(
  format($$insert into public.case_reports (case_id, diagnosis) values (%L, 'Intento del solicitante')$$,
         test.get('case1')),
  'row-level security',
  'un solicitante no redacta el reporte'
);
reset role;

select test.login('tec1');
set role authenticated;
insert into public.case_reports (case_id, diagnosis, work_done)
values (test.get('case1')::uuid, '  Corto  ', 'Cambio');
select test.throws(
  format($$select public.submit_case_report(%L, %L, true)$$, test.get('case1'), test.get('stroke')),
  'Completa el diagnóstico',
  'no se envía un reporte incompleto'
);
update public.case_reports
set diagnosis = 'Breaker dañado en el tablero principal',
    work_done = 'Se reemplazó el breaker y se probó cada tomacorriente',
    cause = 'Sobrecarga'
where case_id = test.get('case1')::uuid;
select test.throws(
  format($$select public.submit_case_report(%L, %L, true)$$, test.get('case1'), test.get('stroke')),
  'al menos 2 foto(s) de después',
  'se exige el mínimo de fotos de después del tipo de servicio'
);
select test.set('p_d4', public.reserve_case_photo(test.get('case1')::uuid, 'despues')::text);
select test.upload(test.get('p_d4')::jsonb ->> 'image_path', 150000);
select test.upload(test.get('p_d4')::jsonb ->> 'thumb_path', 15000);
select public.confirm_case_photo((test.get('p_d4')::jsonb ->> 'id')::uuid);
select test.throws(
  format($$select public.submit_case_report(%L, %L, false)$$, test.get('case1'), test.get('stroke')),
  'consentimiento',
  'firmar exige aceptar el consentimiento'
);
select test.throws(
  format($$select public.submit_case_report(%L, %L, true)$$, test.get('case1'), 'M1 1<script>'),
  'Dibuja tu firma',
  'el trazo solo admite datos de trazado SVG'
);
reset role;

select test.login('jefe_tec');
set role authenticated;
select test.throws(
  format($$select public.submit_case_report(%L, %L, true)$$, test.get('case1'), test.get('stroke')),
  'Solo el técnico asignado',
  'solo el técnico asignado envía el reporte'
);
reset role;

-- ---------------------------------------------------------------------------
-- 3. Envío: versión congelada y firma con evidencia
-- ---------------------------------------------------------------------------

select test.login('tec1');
set role authenticated;
select test.set('v1', (select id::text from public.submit_case_report(
  test.get('case1')::uuid, test.get('stroke'), true)));
reset role;

select test.ok(
  (select status = 'reporte_enviado' from public.cases where id = test.get('case1')::uuid),
  'al firmar, la solicitud pasa a reporte enviado'
);
select test.ok(
  (select version_number = 1 and status = 'vigente'
     and content_hash = encode(sha256(convert_to(content::text, 'UTF8')), 'hex')
   from public.case_report_versions where id = test.get('v1')::uuid),
  'la versión 1 queda vigente con el hash SHA-256 de su contenido'
);
select test.ok(
  (select content -> 'reporte' ->> 'diagnostico' = 'Breaker dañado en el tablero principal'
     and jsonb_array_length(content -> 'fotos') = 2
     and jsonb_array_length(content -> 'recursos') >= 1
     and content -> 'solicitud' ->> 'tecnico' = 'Tomás Técnico'
   from public.case_report_versions where id = test.get('v1')::uuid),
  'la versión congela reporte, fotos confirmadas, recursos y nombres'
);
select test.ok(
  (select signature_type = 'ejecucion' and signer_id = test.uid('tec1') and signer_role = 'tecnico'
     and ip_address = '203.0.113.9' and user_agent = 'NexoCasos/1.0 (Android 15)'
     and consent_text like 'Confirmo que revisé este reporte%'
     and content_hash = (select content_hash from public.case_report_versions where id = test.get('v1')::uuid)
     and signature_hash ~ '^[0-9a-f]{64}$'
   from public.case_signatures where version_id = test.get('v1')::uuid),
  'la firma guarda trazo, consentimiento, IP y dispositivo de la petición, y hashes'
);
select test.ok(
  (select action = 'enviar_reporte' and actor_id = test.uid('tec1')
   from public.case_events where case_id = test.get('case1')::uuid order by id desc limit 1),
  'el envío queda en el historial'
);

-- El contenido firmado ya no cambia.
select test.login('tec1');
set role authenticated;
update public.case_reports set observations = 'Cambio tardío' where case_id = test.get('case1')::uuid;
select test.throws(
  format($$select public.reserve_case_photo(%L, 'despues')$$, test.get('case1')),
  'No puedes agregar fotos',
  'tras firmar no se agregan fotos'
);
select test.throws(
  format($$insert into public.case_resource_usages (case_id, kind, technician_id, hours)
           values (%L, 'mano_de_obra', %L, 1)$$, test.get('case1'), test.uid('tec1')),
  'row-level security',
  'tras firmar no se registran recursos'
);
reset role;
select test.ok(
  (select observations is null from public.case_reports where case_id = test.get('case1')::uuid),
  'tras firmar el borrador no se edita'
);
select test.throws(
  format($$update public.case_report_versions set content = '{}' where id = %L$$, test.get('v1')),
  'no se puede modificar',
  'ni el servidor modifica el contenido firmado'
);
select test.throws(
  format($$update public.case_signatures set ip_address = 'x' where version_id = %L$$, test.get('v1')),
  'no se pueden modificar',
  'una firma no se modifica'
);
select test.throws(
  format($$delete from public.case_signatures where version_id = %L$$, test.get('v1')),
  'no se pueden modificar ni borrar',
  'una firma no se borra'
);

-- Avisos y Inicio tras el envío.
select test.ok(
  (select count(*) = 1 and bool_and(title = 'Reporte por validar')
   from public.notifications
   where case_id = test.get('case1')::uuid and action = 'enviar_reporte'),
  'el envío avisa solo al jefe del área técnica'
);
select test.login('jefe_tec');
set role authenticated;
select test.ok(
  (public.get_home_summary() -> 'inbox' ->> 'reportes_por_validar')::int = 1,
  'el jefe técnico ve el reporte por validar en su Inicio'
);
reset role;

-- ---------------------------------------------------------------------------
-- 4. Validación, devolución y nueva versión
-- ---------------------------------------------------------------------------

select test.login('tec1');
set role authenticated;
select test.throws(
  format($$select public.validate_case_report(%L, %L, true)$$, test.get('case1'), test.get('stroke')),
  'No puedes validar un trabajo que ejecutaste',
  'el técnico no valida su propio reporte'
);
reset role;

select test.login('admin');
set role authenticated;
select test.throws(
  format($$select public.validate_case_report(%L, %L, true)$$, test.get('case1'), test.get('stroke')),
  'Solo el jefe del área técnica',
  'el administrador no firma la validación técnica'
);
reset role;

select test.login('jefe_tec');
set role authenticated;
select public.validate_case_report(test.get('case1')::uuid, test.get('stroke'), true);
reset role;
select test.ok(
  (select status = 'validado' from public.cases where id = test.get('case1')::uuid)
    and (select count(*) = 2 from public.case_signatures where version_id = test.get('v1')::uuid),
  'la validación técnica deja la solicitud validada con dos firmas'
);
select test.ok(
  (select count(*) = 1 and bool_and(recipient_id = test.uid('jefe_sol'))
   from public.notifications where case_id = test.get('case1')::uuid and action = 'validar_reporte'),
  'la validación avisa al jefe del área solicitante'
);

select test.login('jefe_sol');
set role authenticated;
select test.ok(
  (public.get_home_summary() -> 'inbox' ->> 'reportes_por_aprobar')::int = 1,
  'el jefe del área solicitante ve el reporte por aprobar'
);
select test.throws(
  format($$select public.return_case_report(%L, 'no')$$, test.get('case1')),
  'Indica las observaciones',
  'devolver exige observaciones'
);
select public.return_case_report(test.get('case1')::uuid, 'Falta la foto del tablero cerrado');
reset role;

select test.ok(
  (select status = 'en_ejecucion' from public.cases where id = test.get('case1')::uuid)
    and (select status = 'devuelta' and returned_by = test.uid('jefe_sol')
         from public.case_report_versions where id = test.get('v1')::uuid)
    and (select count(*) = 2 from public.case_signatures where version_id = test.get('v1')::uuid),
  'la devolución reabre el trabajo y conserva la versión devuelta con sus firmas'
);
select test.ok(
  (select count(*) = 1 and bool_and(recipient_id = test.uid('tec1') and body like '%Falta la foto%')
   from public.notifications where case_id = test.get('case1')::uuid and action = 'devolver_reporte'),
  'la devolución avisa al técnico con el motivo'
);

select test.login('tec1');
set role authenticated;
update public.case_reports set observations = 'Se agregó la foto del tablero cerrado'
where case_id = test.get('case1')::uuid;
select test.set('v2', (select id::text from public.submit_case_report(
  test.get('case1')::uuid, test.get('stroke'), true)));
reset role;
select test.ok(
  (select version_number = 2 and status = 'vigente'
     and content -> 'reporte' ->> 'observaciones' = 'Se agregó la foto del tablero cerrado'
   from public.case_report_versions where id = test.get('v2')::uuid)
    and (select count(*) = 1 from public.case_report_versions
         where case_id = test.get('case1')::uuid and status = 'vigente'),
  'el nuevo envío crea la versión 2, única vigente'
);

select test.login('jefe_tec');
set role authenticated;
select public.validate_case_report(test.get('case1')::uuid, test.get('stroke'), true);
reset role;

select test.login('admin');
set role authenticated;
select test.throws(
  format($$select public.approve_case_report(%L, %L, true)$$, test.get('case1'), test.get('stroke')),
  'Solo el jefe del área solicitante',
  'el administrador no aprueba si el área solicitante tiene jefe'
);
reset role;

select test.login('jefe_sol');
set role authenticated;
select public.approve_case_report(test.get('case1')::uuid, test.get('stroke'), true);
reset role;

select test.ok(
  (select status = 'aprobado' and closed_at is not null from public.cases where id = test.get('case1')::uuid)
    and (select array_agg(signature_type::text order by signed_at) = array['ejecucion', 'validacion_tecnica', 'conformidad']
         from public.case_signatures where version_id = test.get('v2')::uuid),
  'la conformidad cierra la solicitud con las tres firmas en orden'
);
select test.ok(
  (select array_agg(recipient_id order by recipient_id) = array(select unnest(array[test.uid('sol1'), test.uid('tec1')]) order by 1)
   from public.notifications where case_id = test.get('case1')::uuid and action = 'aprobar_reporte'),
  'la aprobación avisa al creador y al técnico'
);

-- ---------------------------------------------------------------------------
-- 5. Conformidad del administrador y firma duplicada
-- ---------------------------------------------------------------------------

update public.categories set min_after_photos = 0 where id = test.get('cat_elec')::uuid;

-- RRHH no tiene jefe: el administrador da la conformidad.
select test.login('sol2');
set role authenticated;
insert into public.cases (title, description, location, category_id)
values ('Enchufe quemado', 'El enchufe de la oficina de RRHH está quemado', 'Oficina RRHH', test.get('cat_elec')::uuid);
select test.set('case_rrhh', (select id::text from public.cases where title = 'Enchufe quemado'));
reset role;
select test.login('jefe_tec');
set role authenticated;
select public.transition_case(test.get('case_rrhh')::uuid, 'aceptar');
select public.transition_case(test.get('case_rrhh')::uuid, 'asignar', null, test.uid('tec1'));
reset role;
select test.login('tec1');
set role authenticated;
select public.transition_case(test.get('case_rrhh')::uuid, 'iniciar');
insert into public.case_reports (case_id, diagnosis, work_done)
values (test.get('case_rrhh')::uuid, 'Enchufe fundido por humedad', 'Se reemplazó el enchufe completo');
select public.submit_case_report(test.get('case_rrhh')::uuid, test.get('stroke'), true);
reset role;
select test.login('jefe_tec');
set role authenticated;
select public.validate_case_report(test.get('case_rrhh')::uuid, test.get('stroke'), true);
reset role;
select test.ok(
  (select count(*) >= 1 and bool_and(profiles.role = 'administrador')
   from public.notifications
   join public.profiles on profiles.id = notifications.recipient_id
   where case_id = test.get('case_rrhh')::uuid and action = 'validar_reporte'),
  'sin jefe en el área solicitante, la validación avisa a los administradores'
);
select test.login('admin');
set role authenticated;
select test.ok(
  (public.get_home_summary() -> 'inbox' ->> 'reportes_por_aprobar')::int = 1,
  'el administrador ve la conformidad que le toca suplir'
);
select public.approve_case_report(test.get('case_rrhh')::uuid, test.get('stroke'), true);
reset role;
select test.ok(
  (select signer_role = 'administrador' from public.case_signatures
   where case_id = test.get('case_rrhh')::uuid and signature_type = 'conformidad')
    and (select comment like 'Conformidad del administrador%' from public.case_events
         where case_id = test.get('case_rrhh')::uuid and action = 'aprobar_reporte'),
  'la conformidad del administrador queda registrada'
);

-- Un jefe que ejecutó el trabajo no puede firmar también la validación.
select test.login('sol2');
set role authenticated;
insert into public.cases (title, description, location, category_id)
values ('Toma floja', 'La toma del pasillo está floja', 'Pasillo RRHH', test.get('cat_elec')::uuid);
select test.set('case_jefe', (select id::text from public.cases where title = 'Toma floja'));
reset role;
select test.login('jefe_tec');
set role authenticated;
select public.transition_case(test.get('case_jefe')::uuid, 'aceptar');
select public.transition_case(test.get('case_jefe')::uuid, 'asignar', null, test.uid('jefe_tec'));
select public.transition_case(test.get('case_jefe')::uuid, 'iniciar');
insert into public.case_reports (case_id, diagnosis, work_done)
values (test.get('case_jefe')::uuid, 'Tornillos de la toma flojos', 'Se ajustó la toma y su placa');
select public.submit_case_report(test.get('case_jefe')::uuid, test.get('stroke'), true);
select test.throws(
  format($$select public.validate_case_report(%L, %L, true)$$, test.get('case_jefe'), test.get('stroke')),
  'No puedes validar un trabajo que ejecutaste',
  'quien ejecutó no firma también la validación de la misma versión'
);
reset role;

-- ---------------------------------------------------------------------------
-- 6. Aislamiento, verificación y avisos
-- ---------------------------------------------------------------------------

select test.login('admin_b');
set role authenticated;
select test.ok(
  (select count(*) from public.case_reports) = 0
    and (select count(*) from public.case_report_versions) = 0
    and (select count(*) from public.case_signatures) = 0
    and (select count(*) from public.notifications) = 0,
  'otra empresa no ve reportes, versiones, firmas ni avisos'
);
select test.ok(
  (select count(*) from public.verify_report_code(
    (select left(content_hash, 12) from public.case_report_versions limit 1))) = 0,
  'otra empresa no verifica códigos ajenos'
);
reset role;

select test.set('code_v2', (select left(content_hash, 12) from public.case_report_versions where id = test.get('v2')::uuid));
select test.login('sol1');
set role authenticated;
select test.ok(
  (select case_number is not null and version_number = 2 and signatures = 3
   from public.verify_report_code(upper(test.get('code_v2')))),
  'un miembro verifica el código impreso en el PDF'
);
select test.ok(
  (select count(*) from public.verify_report_code('%') ) = 0,
  'la verificación no acepta comodines'
);
select test.ok(
  (select count(*) from public.notifications where recipient_id <> test.uid('sol1')) = 0,
  'cada persona solo ve sus propios avisos'
);
select test.ok(
  (public.get_home_summary() ->> 'notificaciones_sin_leer')::int
    = (select count(*) from public.notifications where read_at is null),
  'el Inicio cuenta los avisos sin leer'
);
select test.ok(public.mark_notifications_read() >= 1, 'se marcan los avisos como leídos');
select test.ok(
  (public.get_home_summary() ->> 'notificaciones_sin_leer')::int = 0,
  'tras leerlos ya no hay avisos pendientes'
);
reset role;

select test.ok(
  not exists (
    select 1 from public.notifications
    join public.case_events on case_events.id = notifications.event_id
    where notifications.recipient_id = case_events.actor_id
  ),
  'nadie recibe avisos de sus propias acciones'
);

-- Teléfonos para push.
select test.login('tec1');
set role authenticated;
select test.throws(
  $$select public.register_push_token('token-invalido', 'android')$$,
  'check constraint',
  'solo se registran tokens de Expo'
);
select public.register_push_token('ExponentPushToken[abc123XYZ]', 'android');
reset role;
select test.login('tec2');
set role authenticated;
select public.register_push_token('ExponentPushToken[abc123XYZ]', 'ios');
select test.ok(
  (select count(*) = 1 from public.push_tokens),
  'el token pasa al último usuario que inicia sesión en el teléfono'
);
reset role;
select test.login('tec1');
set role authenticated;
select test.ok((select count(*) from public.push_tokens) = 0, 'cada persona solo ve sus tokens');
reset role;

-- Almacenamiento en el Inicio del administrador.
select test.login('admin');
set role authenticated;
select test.ok(
  (public.get_home_summary() -> 'admin' -> 'almacenamiento' ->> 'usado_bytes')::bigint = 365000
    and (public.get_home_summary() -> 'admin' -> 'almacenamiento' ->> 'cuota_bytes')::bigint = 1073741824,
  'el administrador ve el uso de almacenamiento de su empresa'
);
reset role;

set role anon;
select test.throws(
  $$select public.reserve_case_photo(gen_random_uuid(), 'antes')$$,
  'permission denied',
  'anon no reserva fotos'
);
select test.throws(
  $$select public.submit_case_report(gen_random_uuid(), 'M 1 1 L 2 2 L 3 3', true)$$,
  'permission denied',
  'anon no firma reportes'
);
reset role;

\echo 'Todas las pruebas de reportes, firmas y avisos pasaron.'
