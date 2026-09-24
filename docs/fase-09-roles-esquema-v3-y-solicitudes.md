# Fase 09: roles pendientes, esquema V3 y alta de solicitud con actividad

> **Aplicación remota confirmada:** el usuario ejecutó `db push --skip-vault --linked` y Supabase informó que aplicó correctamente `20260920173756_track_pending_user_roles.sql` y `20260920190551_align_maintenance_v3_and_profile_photos.sql`. Queda por probar el flujo en la app y consultar los objetos nuevos en Supabase.

## Resultado preparado

- El administrador ve una campana con la cantidad de cuentas nuevas cuyo rol falta confirmar. Desde **Usuarios** puede asignar **coordinador**, **técnico** o **visualizador**. Confirmar visualizador también quita el aviso. La cuenta propia y las cuentas de administrador/auditor no se editan desde esta vista.
- **Agregar** registra los datos de la solicitud física y la primera actividad en una sola operación. Si falla cualquiera de las dos inserciones, no se guarda ninguna. La actividad queda pendiente y puede asignarse a un técnico desde **Ver lista**.
- El tipo de actividad pertenece a `solicitudes_mantenimiento`. El área del perfil se obtiene de `empleados`. Las fotos del trabajo quedan relacionadas únicamente con `actividades`; las fotos de usuario tienen su propia tabla `fotos_perfil` y su propio bucket `profile-photos`.
- Se conservan `equipos.id_area`, los estados y el historial, así como los insumos/repuestos múltiples y opcionales, porque corresponden al funcionamiento explicado con el ejemplo del microscopio. Una solicitud puede no tener equipo cuando se trata de una falla del área.

## Archivos y bloques de código

| Ruta en el proyecto | Líneas clave | Para qué sirve |
| --- | ---: | --- |
| `gestion-casos>supabase>migrations>20260920173756_track_pending_user_roles.sql` | 2–9, 31–58 | Marca usuarios nuevos como pendientes; la función protegida confirma el rol cuando lo asigna un administrador. |
| `gestion-casos>src>features>admin>maintenanceUserService.ts` | 24–58 | Cuenta pendientes, obtiene usuarios y llama a la función protegida para asignar un rol. |
| `gestion-casos>src>features>admin>screens>MaintenanceAdminScreen.tsx` | 145–150, 167–178, 228–235 | Refresca el contador de la campana, abre los pendientes y conecta las tarjetas Usuarios/Roles con la vista real. |
| `gestion-casos>src>features>admin>screens>MaintenanceUsersScreen.tsx` | 44–68, 81–155 | Muestra pendientes o todos, permite elegir el rol y refresca la lista después de guardar. |
| `gestion-casos>supabase>migrations>20260920190551_align_maintenance_v3_and_profile_photos.sql` | 2–34 | Añade el tipo a solicitudes, comprueba que los datos existentes no tengan tipos contradictorios y migra ese valor. |
| Mismo archivo | 37–81 | Ajusta el disparador de actividades y retira el tipo duplicado de la actividad. |
| Mismo archivo | 84–113 | Quita el área duplicada del perfil y la relación de fotos de actividad con perfiles. Permite a cada usuario leer su propia ficha de empleado para resolver el área. |
| Mismo archivo | 117–201 | Crea `fotos_perfil`, conserva fotos externas existentes, establece permisos por usuario y separa las fotos en su propio bucket privado. |
| Mismo archivo | 204–258 | Crea la función que inserta solicitud y primera actividad en una sola transacción y valida empleado/equipo del área. |
| `gestion-casos>src>features>auth>authService.ts` | 25–68, 78–94 | Obtiene área desde el empleado y foto desde `fotos_perfil`, sin depender de las columnas retiradas de `perfiles`. |
| `gestion-casos>src>features>settings>ProfileScreen.tsx` | 40–49 | Muestra la foto si existe y, si no, la inicial del usuario. |
| `gestion-casos>src>features>activities>activityService.ts` | 47–105, 131–158 | Lee catálogos del área, lista y asigna técnicos, y envía el formulario a la operación atómica de la base. |
| `gestion-casos>src>features>activities>screens>MaintenanceActivitiesScreen.tsx` | 88–222, 237–389, 435–619 | Captura y valida solicitud/actividad, oculta los filtros en listas desplegables, ofrece asignación desde la lista y deja la navegación inferior. |
| `gestion-casos>src>navigation>MainNavigator.tsx` y `gestion-casos>src>navigation>types.ts` | 108–112, 22 | Registran la pantalla de usuarios y las rutas nuevas. |

## Antes de aplicar las migraciones

En **Supabase > SQL Editor** del proyecto correcto, estas consultas son solo de lectura. Los tres resultados deberían ser `0`. Si alguno no lo es, revisa esos registros antes de aplicar la segunda migración:

```sql
select count(*) as solicitudes_sin_actividad
from public.solicitudes_mantenimiento s
where not exists (
  select 1 from public.actividades a where a.id_solicitud = s.id
);

select count(*) as solicitudes_con_tipos_distintos
from (
  select id_solicitud from public.actividades
  group by id_solicitud having count(distinct id_tipo_actividad) > 1
) x;

select count(*) as perfiles_con_area_inconsistente
from public.perfiles p
left join public.empleados e on e.id = p.id_empleado
where p.id_area is not null and p.id_area is distinct from e.id_area;
```

La segunda migración aborta con un mensaje claro si hay solicitudes sin actividad, tipos distintos dentro de una solicitud o áreas de perfil que no coinciden con su empleado. Evita así asignar un tipo arbitrario o perder una asociación de área sin darse cuenta.

## Aplicar desde la terminal vinculada

Desde la raíz del worktree de propuesta, con el proyecto correcto ya enlazado:

```powershell
npx.cmd --yes supabase@2.117.0 db push --dry-run --skip-vault --linked
```

La simulación debe anunciar, en este orden, **solo**:

1. `20260920173756_track_pending_user_roles.sql`
2. `20260920190551_align_maintenance_v3_and_profile_photos.sql`

Si coincide y las tres consultas previas dieron cero, aplica:

```powershell
npx.cmd --yes supabase@2.117.0 db push --skip-vault --linked
```

Después verifica en Supabase que existen `fotos_perfil` y la columna `solicitudes_mantenimiento.id_tipo_actividad`. La columna `perfiles.id_area` y la relación `fotos_actividad.id_usuario_carga` ya no deben aparecer. Para comprobar el historial:

```powershell
npx.cmd --yes supabase@2.117.0 migration list --linked
```

En **SQL Editor**, esta consulta de solo lectura confirma la estructura y muestra si ya hay catálogos para probar **Agregar**:

```sql
select
  to_regclass('public.fotos_perfil') is not null as fotos_perfil_existe,
  exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'solicitudes_mantenimiento'
      and column_name = 'id_tipo_actividad') as tipo_en_solicitud,
  not exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'perfiles'
      and column_name = 'id_area') as area_no_duplicada,
  not exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'fotos_actividad'
      and column_name = 'id_usuario_carga') as fotos_solo_actividad,
  (select count(*) from public.servicios) as servicios,
  (select count(*) from public.areas) as areas,
  (select count(*) from public.cargos) as cargos,
  (select count(*) from public.empleados) as empleados;
```

Los cuatro indicadores deben ser `true`. Para guardar la primera solicitud desde la app hacen falta al menos un servicio, su área, un cargo y un empleado activo de esa área. El equipo es opcional si la solicitud trata una falla del área.

## Probar en la app

1. Crea una cuenta de prueba en Supabase Authentication y confirma su correo en el panel si no dispone de buzón real. Al entrar al panel de administrador, la campana debe mostrar un pendiente.
2. Abre la campana, asigna **coordinador**, **técnico** o **visualizador** y comprueba que disminuye el contador.
3. Comprueba que existen un área, un empleado activo de esa área y, opcionalmente, un equipo activo en ella. Abre **Actividades > Agregar**, rellena número, área, empleado, fecha, tipo, descripciones y prioridad; guarda.
4. Ve a **Ver lista**: debe aparecer la actividad junto al número de solicitud. Desde **Asignar técnico**, elige una cuenta con rol técnico. El técnico debe verla en su panel.
5. En **Mi perfil**, comprueba que aparece la foto de Google si está disponible o la inicial si no hay foto. `fotos_perfil` almacena únicamente fotos de perfiles; las fotos del trabajo permanecen en `fotos_actividad`.

## Verificación y pendientes

Pasaron `npm.cmd run typecheck`, `npm.cmd run lint`, 79 pruebas automatizadas y la exportación Android de Expo. `git diff --check` no encontró errores de espacios. La comprobación global de Prettier sigue señalando archivos previos fuera de esta fase; no se reformateó todo el repositorio para evitar conflictos. La simulación de `db push` no pudo conectarse desde esta sesión porque la CLI aquí no tiene el token Supabase vinculado; tampoco hay un Postgres local activo. Por eso falta la comprobación real de la migración y del flujo en el teléfono después de aplicarla.

La tabla y el bucket de fotos de perfil quedan listos, pero el control para subir una foto desde la app todavía no forma parte de esta fase. **Editar** muestra una indicación de fase pendiente. La salida exitosa de `db push` confirma la aplicación de los archivos; aún falta probar login, notificaciones, alta y asignación con usuarios reales de prueba.
