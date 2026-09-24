# Fase 02: propuesta de esquema de mantenimiento y bitácora

## Estado

Las seis migraciones activas de la rama `feature/propuesta-mantenimiento` **se aplicaron al proyecto Supabase vinculado**. La terminal del propietario informó `Applying migration...` para cada una y terminó con `Finished supabase db push.` Después, `migration list --linked` mostró las seis versiones iguales en las columnas `Local` y `Remote`. No se cambió la configuración de conexión de la app.

El nuevo proyecto se considera sin tablas de la aplicación. Las diez migraciones del modelo de casos anterior se conservaron en `gestion-casos>docs>legacy-supabase-migrations` y quedaron fuera de la carpeta activa. Por eso esta secuencia se debe usar en un proyecto Supabase nuevo; no se debe mezclar con una base donde esas diez migraciones ya se aplicaron.

## Archivos activos, en orden

| Archivo                                                                                   | Propósito                                                                                                                               |
| ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `gestion-casos>supabase>migrations>202607270001_create_profiles_and_roles.sql`            | Conserva `auth.users`, `profiles`, el perfil automático de visualizador y el cambio de rol por administrador.                           |
| `gestion-casos>supabase>migrations>20260917085535_add_maintenance_roles.sql`              | Añade los roles `coordinador` y `tecnico` al tipo de rol actual.                                                                        |
| `gestion-casos>supabase>migrations>20260917090657_create_maintenance_catalogs.sql`        | Crea servicios, áreas, cargos, empleados, equipos y catálogos de recursos; vincula opcionalmente cada perfil a un empleado y a un área. |
| `gestion-casos>supabase>migrations>20260917090703_create_maintenance_workflow.sql`        | Crea solicitudes, actividades, asignaciones, consumo de insumos/repuestos, fotografías e historial de estados.                          |
| `gestion-casos>supabase>migrations>20260917090708_create_maintenance_audit.sql`           | Crea la bitácora de cambios y los disparadores que la alimentan.                                                                        |
| `gestion-casos>supabase>migrations>20260917090714_create_maintenance_dashboard_stats.sql` | Expone únicamente cifras agregadas para el panel de estadísticas.                                                                       |

## Correspondencia con el SQL de referencia

| Modelo anterior                                                        | Propuesta Supabase                                                                                        |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `Usuario`, `Tipo_Usuario`                                              | `auth.users`, `profiles.role`; las contraseñas quedan exclusivamente en Supabase Auth.                    |
| `Empleado`, `Cargo`, `Servicio`, `Area`                                | `employees`, `job_titles`, `services`, `areas`.                                                           |
| `Marca`, `Modelo`, `Tipo_equipo`, `Equipo`                             | `brands`, `models`, `equipment_types`, `equipment`.                                                       |
| `Solicitud_Actividad`                                                  | `maintenance_requests`.                                                                                   |
| `Actividad`, `Tipo_Actividad`, `Estado_Actividad`, `Detalle_Actividad` | `activities`, `activity_types`, `maintenance_status`, `activity_assignments` y `activity_status_history`. |
| `Insumos`, `Repusto`                                                   | `supplies`, `spare_parts` y sus tablas de consumo por actividad.                                          |
| `Capturas`                                                             | `activity_photos` y un bucket privado de Supabase Storage llamado `activity-photos`.                      |

Las claves principales son UUID. Las relaciones se declaran con claves foráneas e índices. Los nombres son minúsculos y usan guiones bajos para evitar problemas con identificadores entre comillas. Los recursos se suspenden con `is_active` en vez de borrarse.

## Acceso y comportamiento

- **Administrador:** consulta y mantiene catálogos; gestiona solicitudes, actividades, asignaciones y roles; puede consultar la bitácora.
- **Coordinador:** consulta catálogos y empleados; crea solicitudes y actividades, asigna técnicos y sigue el progreso.
- **Técnico:** consulta solamente solicitudes y actividades que tiene asignadas; registra progreso, fotografías e insumos o repuestos utilizados.
- **Visualizador:** consulta su perfil y el resumen agregado del panel; no puede leer filas de solicitudes o actividades.

Cada tabla nueva de `public` tiene seguridad por filas (RLS) y permisos explícitos. Las funciones internas con privilegios se ubican en el esquema no expuesto `private` y comprueban la identidad del usuario. El inicio de sesión con Google continúa usando Supabase Auth; el proveedor Google y sus URL de retorno se deberán configurar aparte en el proyecto nuevo.

Una solicitud puede no señalar un equipo cuando describe una falla de infraestructura. Si señala un equipo, este debe pertenecer al área indicada. Una actividad puede tener varios técnicos y cero o más insumos o repuestos. Al registrar consumo, se descuenta la existencia de forma atómica; las filas de consumo son inmutables en esta fase. Para finalizar una actividad debe existir al menos una fotografía registrada en Storage. El estado de la solicitud se calcula a partir de sus actividades.

## Bitácora

`maintenance_audit_log` guarda tabla, registro, operación (`INSERT`, `UPDATE`, `DELETE`), usuario que hizo el cambio, datos anteriores, datos nuevos y fecha. Solo el administrador tiene permiso de lectura; la app no puede insertar o editar entradas directamente. Los cambios automáticos de inventario y estado también quedan registrados. `activity_status_history` ofrece además una línea de tiempo específica de los estados de cada actividad.

La bitácora registra cambios en los datos de la aplicación, no intentos de inicio de sesión. Un cambio hecho directamente por un administrador de base de datos puede aparecer con `actor_id` vacío, porque no existe una sesión de usuario de la app.

## Antes de conectar la app

La interfaz actual todavía consulta `cases` y `categories`, y solo reconoce los roles anteriores. Por tanto, **no se debe cambiar aún el archivo de variables de entorno de la app al proyecto nuevo**. La próxima fase debe adaptar navegación, permisos, servicios y pantallas al modelo de mantenimiento. También falta elegir al primer administrador después de registrar su usuario en Supabase Auth.

Para confirmar el historial remoto desde `gestion-casos-propuesta`, ejecutar:

```powershell
npx.cmd --yes supabase@2.117.0 migration list --linked
```

El `db push --dry-run --skip-vault --linked` del propietario listó exactamente las seis migraciones activas. Después, su `db push --skip-vault --linked` aplicó las seis sin mostrar errores. Una consulta posterior con `migration list --linked` confirmó que `202607270001`, `20260917085535`, `20260917090657`, `20260917090703`, `20260917090708` y `20260917090714` figuran tanto en el historial local como en el remoto. Todavía no se ha realizado una prueba funcional de las tablas y políticas en el proyecto remoto: el acceso a ese proyecto no está disponible desde esta sesión de trabajo.

El SQL de las seis migraciones activas pasó el analizador de PostgreSQL 17. También se aplicó en una base PostgreSQL temporal en memoria con imitaciones mínimas de `auth` y `storage`: funcionaron la creación de solicitud y actividad, la asignación, la carga autorizada de una fotografía, la restricción de fotografía antes de finalizar, el descuento de existencias, la sincronización del estado, la lectura de estadísticas por el visualizador y el acceso restringido a la bitácora. Esta prueba funcional local no sustituye una prueba de inicio de sesión y permisos en el proyecto Supabase real.
