-- Las migraciones anteriores ya están aplicadas. Renombrar conserva datos, claves,
-- índices, disparadores, políticas RLS y permisos asociados a cada objeto.
-- auth.users, storage.objects y las claves de metadatos de Auth pertenecen a Supabase.

do $renombrar_tablas$
declare cambio record;
begin
  for cambio in
    select * from (values
      ('profiles', 'perfiles'),
      ('services', 'servicios'),
      ('job_titles', 'cargos'),
      ('employees', 'empleados'),
      ('equipment_types', 'tipos_equipo'),
      ('brands', 'marcas'),
      ('models', 'modelos'),
      ('equipment', 'equipos'),
      ('activity_types', 'tipos_actividad'),
      ('supplies', 'insumos'),
      ('spare_parts', 'repuestos'),
      ('maintenance_requests', 'solicitudes_mantenimiento'),
      ('activities', 'actividades'),
      ('activity_assignments', 'asignaciones_actividad'),
      ('activity_supplies', 'insumos_actividad'),
      ('activity_spare_parts', 'repuestos_actividad'),
      ('activity_photos', 'fotos_actividad'),
      ('activity_status_history', 'historial_estados_actividad'),
      ('maintenance_audit_log', 'bitacora_mantenimiento')
    ) as nombres(anterior, nuevo)
  loop
    execute format('alter table public.%I rename to %I', cambio.anterior, cambio.nuevo);
  end loop;
end;
$renombrar_tablas$;

-- Una sola lista hace explícita la correspondencia de cada campo.
do $renombrar_columnas$
declare cambio record;
begin
  for cambio in
    select * from (values
      ('perfiles', 'full_name', 'nombre_completo'),
      ('perfiles', 'avatar_url', 'url_avatar'),
      ('perfiles', 'role', 'rol'),
      ('perfiles', 'created_at', 'creado_en'),
      ('perfiles', 'updated_at', 'actualizado_en'),
      ('perfiles', 'area_id', 'id_area'),
      ('perfiles', 'employee_id', 'id_empleado'),

      ('servicios', 'name', 'nombre'),
      ('servicios', 'is_active', 'activo'),
      ('servicios', 'created_at', 'creado_en'),
      ('servicios', 'updated_at', 'actualizado_en'),

      ('areas', 'service_id', 'id_servicio'),
      ('areas', 'name', 'nombre'),
      ('areas', 'description', 'descripcion'),
      ('areas', 'is_active', 'activo'),
      ('areas', 'created_at', 'creado_en'),
      ('areas', 'updated_at', 'actualizado_en'),

      ('cargos', 'name', 'nombre'),
      ('cargos', 'is_active', 'activo'),
      ('cargos', 'created_at', 'creado_en'),
      ('cargos', 'updated_at', 'actualizado_en'),

      ('empleados', 'area_id', 'id_area'),
      ('empleados', 'job_title_id', 'id_cargo'),
      ('empleados', 'first_name', 'nombres'),
      ('empleados', 'last_name', 'apellidos'),
      ('empleados', 'email', 'correo_electronico'),
      ('empleados', 'birth_date', 'fecha_nacimiento'),
      ('empleados', 'address', 'direccion'),
      ('empleados', 'is_active', 'activo'),
      ('empleados', 'created_at', 'creado_en'),
      ('empleados', 'updated_at', 'actualizado_en'),

      ('tipos_equipo', 'name', 'nombre'),
      ('tipos_equipo', 'is_active', 'activo'),
      ('tipos_equipo', 'created_at', 'creado_en'),
      ('tipos_equipo', 'updated_at', 'actualizado_en'),

      ('marcas', 'name', 'nombre'),
      ('marcas', 'is_active', 'activo'),
      ('marcas', 'created_at', 'creado_en'),
      ('marcas', 'updated_at', 'actualizado_en'),

      ('modelos', 'brand_id', 'id_marca'),
      ('modelos', 'name', 'nombre'),
      ('modelos', 'is_active', 'activo'),
      ('modelos', 'created_at', 'creado_en'),
      ('modelos', 'updated_at', 'actualizado_en'),

      ('equipos', 'area_id', 'id_area'),
      ('equipos', 'model_id', 'id_modelo'),
      ('equipos', 'equipment_type_id', 'id_tipo_equipo'),
      ('equipos', 'serial_number', 'numero_serie'),
      ('equipos', 'is_active', 'activo'),
      ('equipos', 'created_at', 'creado_en'),
      ('equipos', 'updated_at', 'actualizado_en'),

      ('tipos_actividad', 'name', 'nombre'),
      ('tipos_actividad', 'is_active', 'activo'),
      ('tipos_actividad', 'created_at', 'creado_en'),
      ('tipos_actividad', 'updated_at', 'actualizado_en'),

      ('insumos', 'name', 'nombre'),
      ('insumos', 'description', 'descripcion'),
      ('insumos', 'quantity_on_hand', 'cantidad_disponible'),
      ('insumos', 'is_active', 'activo'),
      ('insumos', 'created_at', 'creado_en'),
      ('insumos', 'updated_at', 'actualizado_en'),

      ('repuestos', 'name', 'nombre'),
      ('repuestos', 'description', 'descripcion'),
      ('repuestos', 'quantity_on_hand', 'cantidad_disponible'),
      ('repuestos', 'is_active', 'activo'),
      ('repuestos', 'created_at', 'creado_en'),
      ('repuestos', 'updated_at', 'actualizado_en'),

      ('solicitudes_mantenimiento', 'request_number', 'numero_solicitud'),
      ('solicitudes_mantenimiento', 'area_id', 'id_area'),
      ('solicitudes_mantenimiento', 'equipment_id', 'id_equipo'),
      ('solicitudes_mantenimiento', 'requester_employee_id', 'id_empleado_solicitante'),
      ('solicitudes_mantenimiento', 'description', 'descripcion'),
      ('solicitudes_mantenimiento', 'requested_on', 'fecha_solicitud'),
      ('solicitudes_mantenimiento', 'status', 'estado'),
      ('solicitudes_mantenimiento', 'submitted_by', 'id_usuario_registro'),
      ('solicitudes_mantenimiento', 'created_at', 'creado_en'),
      ('solicitudes_mantenimiento', 'updated_at', 'actualizado_en'),

      ('actividades', 'request_id', 'id_solicitud'),
      ('actividades', 'activity_type_id', 'id_tipo_actividad'),
      ('actividades', 'description', 'descripcion'),
      ('actividades', 'observations', 'observaciones'),
      ('actividades', 'status', 'estado'),
      ('actividades', 'planned_end_date', 'fecha_fin_prevista'),
      ('actividades', 'started_at', 'iniciada_en'),
      ('actividades', 'completed_at', 'finalizada_en'),
      ('actividades', 'created_by', 'id_usuario_creador'),
      ('actividades', 'created_at', 'creado_en'),
      ('actividades', 'updated_at', 'actualizado_en'),

      ('asignaciones_actividad', 'activity_id', 'id_actividad'),
      ('asignaciones_actividad', 'technician_id', 'id_tecnico'),
      ('asignaciones_actividad', 'assigned_by', 'id_usuario_asignador'),
      ('asignaciones_actividad', 'is_active', 'activa'),
      ('asignaciones_actividad', 'assigned_at', 'asignada_en'),

      ('insumos_actividad', 'activity_id', 'id_actividad'),
      ('insumos_actividad', 'supply_id', 'id_insumo'),
      ('insumos_actividad', 'quantity', 'cantidad'),
      ('insumos_actividad', 'recorded_by', 'id_usuario_registro'),
      ('insumos_actividad', 'recorded_at', 'registrado_en'),

      ('repuestos_actividad', 'activity_id', 'id_actividad'),
      ('repuestos_actividad', 'spare_part_id', 'id_repuesto'),
      ('repuestos_actividad', 'quantity', 'cantidad'),
      ('repuestos_actividad', 'recorded_by', 'id_usuario_registro'),
      ('repuestos_actividad', 'recorded_at', 'registrado_en'),

      ('fotos_actividad', 'activity_id', 'id_actividad'),
      ('fotos_actividad', 'storage_path', 'ruta_almacenamiento'),
      ('fotos_actividad', 'caption', 'descripcion'),
      ('fotos_actividad', 'uploaded_by', 'id_usuario_carga'),
      ('fotos_actividad', 'created_at', 'creado_en'),

      ('historial_estados_actividad', 'activity_id', 'id_actividad'),
      ('historial_estados_actividad', 'previous_status', 'estado_anterior'),
      ('historial_estados_actividad', 'new_status', 'estado_nuevo'),
      ('historial_estados_actividad', 'changed_by', 'id_usuario_cambio'),
      ('historial_estados_actividad', 'changed_at', 'cambiado_en'),

      ('bitacora_mantenimiento', 'table_name', 'nombre_tabla'),
      ('bitacora_mantenimiento', 'record_id', 'id_registro'),
      ('bitacora_mantenimiento', 'operation', 'operacion'),
      ('bitacora_mantenimiento', 'actor_id', 'id_actor'),
      ('bitacora_mantenimiento', 'old_data', 'datos_anteriores'),
      ('bitacora_mantenimiento', 'new_data', 'datos_nuevos'),
      ('bitacora_mantenimiento', 'occurred_at', 'ocurrido_en')
    ) as nombres(tabla, anterior, nuevo)
  loop
    execute format('alter table public.%I rename column %I to %I',
      cambio.tabla, cambio.anterior, cambio.nuevo);
  end loop;
end;
$renombrar_columnas$;

alter type public.app_role rename to rol_aplicacion;
alter type public.maintenance_status rename to estado_mantenimiento;

-- PostgreSQL actualiza automáticamente las referencias de claves, índices y
-- políticas. Las funciones con cuerpo SQL/PLpgSQL sí se redefinen explícitamente.
create or replace function private.is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.perfiles
    where id = (select auth.uid()) and rol = 'administrador'
  );
$$;

create or replace function private.has_role(expected_role public.rol_aplicacion)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.perfiles
    where id = (select auth.uid()) and rol = expected_role
  );
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.perfiles (id, nombre_completo)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create or replace function private.set_updated_at()
returns trigger language plpgsql set search_path = ''
as $$
begin
  new.actualizado_en = now();
  return new;
end;
$$;

create or replace function public.set_user_role(
  target_user_id uuid, new_role public.rol_aplicacion
)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not (select private.is_admin()) then
    raise exception 'Acceso denegado';
  end if;
  update public.perfiles set rol = new_role where id = target_user_id;
  if not found then raise exception 'Usuario no encontrado'; end if;
end;
$$;

create or replace function public.set_user_area(target_user_id uuid, new_area_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not (select private.is_admin()) then raise exception 'Acceso denegado'; end if;
  if new_area_id is not null and not exists (
    select 1 from public.areas where id = new_area_id and activo
  ) then raise exception 'Área no disponible'; end if;
  update public.perfiles set id_area = new_area_id where id = target_user_id;
  if not found then raise exception 'Usuario no encontrado'; end if;
end;
$$;

create or replace function public.set_user_employee(target_user_id uuid, new_employee_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not (select private.is_admin()) then raise exception 'Acceso denegado'; end if;
  if new_employee_id is not null and not exists (
    select 1 from public.empleados where id = new_employee_id and activo
  ) then raise exception 'Empleado no disponible'; end if;
  update public.perfiles set id_empleado = new_employee_id where id = target_user_id;
  if not found then raise exception 'Usuario no encontrado'; end if;
end;
$$;

create or replace function private.is_assigned_to_activity(target_activity_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select private.has_role('tecnico') and exists (
    select 1 from public.asignaciones_actividad
    where id_actividad = target_activity_id
      and id_tecnico = (select auth.uid()) and activa
  );
$$;

create or replace function private.can_access_request(target_request_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select private.is_maintenance_manager() or (private.has_role('tecnico') and exists (
    select 1 from public.actividades a
    join public.asignaciones_actividad aa on aa.id_actividad = a.id
    where a.id_solicitud = target_request_id
      and aa.id_tecnico = (select auth.uid()) and aa.activa
  ));
$$;

create or replace function private.validate_request_equipment()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if new.id_equipo is not null and not exists (
    select 1 from public.equipos
    where id = new.id_equipo and id_area = new.id_area
  ) then
    raise exception 'El equipo no pertenece al área de la solicitud';
  end if;
  return new;
end;
$$;

create or replace function private.validate_technician_assignment()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.activa and not exists (
    select 1 from public.perfiles where id = new.id_tecnico and rol = 'tecnico'
  ) then
    raise exception 'El perfil asignado debe tener rol de técnico';
  end if;
  return new;
end;
$$;

create or replace function private.validate_activity_photo()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (
    select 1 from storage.objects
    where bucket_id = 'activity-photos' and name = new.ruta_almacenamiento
  ) then
    raise exception 'La fotografía no existe en Storage';
  end if;
  return new;
end;
$$;

create or replace function private.prepare_activity_change()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.estado <> 'pendiente' then raise exception 'Una actividad nueva debe iniciar pendiente'; end if;
    return new;
  end if;

  if private.has_role('tecnico') and not private.is_maintenance_manager() then
    if new.id_tipo_actividad is distinct from old.id_tipo_actividad
      or new.descripcion is distinct from old.descripcion
      or new.fecha_fin_prevista is distinct from old.fecha_fin_prevista then
      raise exception 'El técnico solo puede actualizar estado y observaciones';
    end if;
    if new.estado is distinct from old.estado and not (
      (old.estado = 'pendiente' and new.estado = 'en_proceso')
      or (old.estado = 'en_proceso' and new.estado = 'finalizada')
    ) then
      raise exception 'Cambio de estado no permitido';
    end if;
  end if;

  if new.estado is distinct from old.estado then
    if new.estado = 'en_proceso' then
      new.iniciada_en := coalesce(old.iniciada_en, now());
    end if;
    if new.estado = 'finalizada' then
      if not exists (
        select 1 from public.fotos_actividad where id_actividad = new.id
      ) then
        raise exception 'Se requiere al menos una fotografía para finalizar la actividad';
      end if;
      new.iniciada_en := coalesce(old.iniciada_en, now());
      new.finalizada_en := now();
    elsif old.estado = 'finalizada' then
      new.finalizada_en := null;
    end if;
  end if;
  return new;
end;
$$;

create or replace function private.record_activity_status()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.historial_estados_actividad
      (id_actividad, estado_anterior, estado_nuevo, id_usuario_cambio)
    values (new.id, null, new.estado, auth.uid());
  elsif old.estado is distinct from new.estado then
    insert into public.historial_estados_actividad
      (id_actividad, estado_anterior, estado_nuevo, id_usuario_cambio)
    values (new.id, old.estado, new.estado, auth.uid());
  end if;
  return new;
end;
$$;

create or replace function private.sync_request_status()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare next_status public.estado_mantenimiento;
begin
  select case
    when count(*) = 0 then 'pendiente'::public.estado_mantenimiento
    when bool_and(estado = 'finalizada') then 'finalizada'::public.estado_mantenimiento
    when bool_or(estado = 'en_proceso' or estado = 'finalizada') then 'en_proceso'::public.estado_mantenimiento
    else 'pendiente'::public.estado_mantenimiento
  end into next_status
  from public.actividades where id_solicitud = new.id_solicitud;

  update public.solicitudes_mantenimiento
  set estado = next_status
  where id = new.id_solicitud and estado is distinct from next_status;
  return new;
end;
$$;

create or replace function private.consume_activity_supply()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  update public.insumos
  set cantidad_disponible = cantidad_disponible - new.cantidad
  where id = new.id_insumo and activo and cantidad_disponible >= new.cantidad;
  if not found then raise exception 'Insumo inactivo o existencias insuficientes'; end if;
  return new;
end;
$$;

create or replace function private.consume_activity_spare_part()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  update public.repuestos
  set cantidad_disponible = cantidad_disponible - new.cantidad
  where id = new.id_repuesto and activo and cantidad_disponible >= new.cantidad;
  if not found then raise exception 'Repuesto inactivo o existencias insuficientes'; end if;
  return new;
end;
$$;

create or replace function private.record_maintenance_audit()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare changed_id uuid;
begin
  if tg_op = 'INSERT' then
    changed_id := new.id;
    insert into public.bitacora_mantenimiento
      (nombre_tabla, id_registro, operacion, id_actor, datos_nuevos)
    values (tg_table_name, changed_id, tg_op, auth.uid(), to_jsonb(new));
    return new;
  elsif tg_op = 'UPDATE' then
    changed_id := new.id;
    insert into public.bitacora_mantenimiento
      (nombre_tabla, id_registro, operacion, id_actor, datos_anteriores, datos_nuevos)
    values (tg_table_name, changed_id, tg_op, auth.uid(), to_jsonb(old), to_jsonb(new));
    return new;
  else
    changed_id := old.id;
    insert into public.bitacora_mantenimiento
      (nombre_tabla, id_registro, operacion, id_actor, datos_anteriores)
    values (tg_table_name, changed_id, tg_op, auth.uid(), to_jsonb(old));
    return old;
  end if;
end;
$$;

create or replace function private.maintenance_dashboard_stats()
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare request_counts jsonb;
declare leading_technician jsonb;
begin
  if auth.uid() is null or not exists (
    select 1 from public.perfiles where id = auth.uid()
  ) then
    raise exception 'Se requiere iniciar sesión';
  end if;

  select jsonb_build_object(
    'solicitudes_total', count(*),
    'solicitudes_pendientes', count(*) filter (where estado = 'pendiente'),
    'solicitudes_en_proceso', count(*) filter (where estado = 'en_proceso'),
    'solicitudes_finalizadas', count(*) filter (where estado = 'finalizada')
  ) into request_counts
  from public.solicitudes_mantenimiento;

  select jsonb_build_object(
    'perfil_id', p.id,
    'nombre', coalesce(nullif(btrim(p.nombre_completo), ''), 'Técnico sin nombre'),
    'solicitudes_resueltas', count(distinct a.id_solicitud)
  ) into leading_technician
  from public.asignaciones_actividad aa
  join public.actividades a on a.id = aa.id_actividad
  join public.solicitudes_mantenimiento r on r.id = a.id_solicitud
  join public.perfiles p on p.id = aa.id_tecnico
  where aa.activa and p.rol = 'tecnico'
    and a.estado = 'finalizada' and r.estado = 'finalizada'
  group by p.id, p.nombre_completo
  order by count(distinct a.id_solicitud) desc, p.nombre_completo, p.id
  limit 1;

  return request_counts || jsonb_build_object(
    'tecnico_con_mas_solicitudes_resueltas', leading_technician
  );
end;
$$;
