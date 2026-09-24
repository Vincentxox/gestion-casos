# Fase 03: nombres en español y primera vista del administrador

## Estado

Los cambios están en la rama `feature/propuesta-mantenimiento`, dentro del trabajo aislado `gestion-casos-propuesta`. La migración de nombres en español **se aplicó al proyecto Supabase vinculado**: el `dry-run` mostró únicamente `20260918224254_rename_maintenance_schema_to_spanish.sql` y el `db push` posterior terminó con `Finished supabase db push.` Las seis migraciones anteriores permanecen en el historial remoto.

La app tampoco se ha conectado al proyecto Supabase nuevo. La primera vista del panel es una estructura visual; no muestra cifras ni permite registrar datos hasta que conectemos sus módulos en las siguientes fases.

## Archivos modificados

| Archivo                                                                                     | Cambio                                                                                                                          |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `gestion-casos>supabase>migrations>20260918224254_rename_maintenance_schema_to_spanish.sql` | Renombra tablas y columnas de la aplicación sin borrar los datos. Actualiza las funciones que consultan los nombres anteriores. |
| `gestion-casos>src>features>admin>screens>MaintenanceAdminScreen.tsx`                       | Presenta la primera vista del panel con módulos de solicitudes, actividades, personal y equipos, inventario y bitácora.         |
| `gestion-casos>src>features>admin>screens>MaintenanceModuleScreen.tsx`                      | Presenta la vista base de cada módulo con las secciones Agregar, Ver lista y Editar.                                            |
| `gestion-casos>src>features>admin>screens>AdministrationHomeScreen.tsx`                     | Agrega una entrada al panel nuevo dentro de Administración.                                                                     |
| `gestion-casos>src>navigation>MainNavigator.tsx`                                            | Registra la nueva pantalla en la navegación.                                                                                    |
| `gestion-casos>src>navigation>types.ts`                                                     | Declara la ruta `MaintenanceAdmin` para que TypeScript compruebe la navegación.                                                 |

## Ejemplos de nombres nuevos

| Antes                                         | Después                                      |
| --------------------------------------------- | -------------------------------------------- |
| `profiles.full_name`, `profiles.role`         | `perfiles.nombre_completo`, `perfiles.rol`   |
| `services.name`                               | `servicios.nombre`                           |
| `employees.first_name`, `employees.last_name` | `empleados.nombres`, `empleados.apellidos`   |
| `maintenance_requests.request_number`         | `solicitudes_mantenimiento.numero_solicitud` |
| `activities.status`                           | `actividades.estado`                         |
| `activity_photos.storage_path`                | `fotos_actividad.ruta_almacenamiento`        |
| `maintenance_audit_log.old_data`              | `bitacora_mantenimiento.datos_anteriores`    |

`id` se conserva como identificador común. `areas` ya es una palabra en español. Las tablas internas `auth.users` y `storage.objects` pertenecen a Supabase y no se renombran. El bucket privado `activity-photos` conserva su identificador para no alterar las rutas de archivos ni sus políticas. Los archivos de las migraciones anteriores siguen escritos con los nombres originales porque forman parte del historial ya aplicado; la nueva migración contiene el cambio incremental.

## Qué hace la primera vista

La tarjeta **Panel de mantenimiento** aparece en la pantalla actual de Administración y abre la nueva vista. Solo la ve quien ya tiene acceso de administrador a esa pestaña. La página inicial muestra cuatro accesos: Solicitudes, Actividades, Usuarios y Todas las gestiones. El cuarto acceso despliega todos los módulos previstos. Un selector permite alternar entre cuadrícula y lista en ambas vistas.

Al abrir un módulo, la flecha del encabezado permite regresar. Una barra inferior cambia entre Agregar, Ver lista y Editar. Por ahora estas secciones muestran una vista base: no registran ni modifican datos hasta que se conecten a la nueva base. Las opciones anteriores de Administración siguen disponibles.

## Verificación

- Las siete migraciones se aplicaron en orden en una base PostgreSQL temporal; las 20 tablas públicas mantuvieron RLS activo.
- Una prueba funcional conservó datos creados antes del renombrado y comprobó el registro de usuarios, los permisos por rol, la exigencia de fotografía para finalizar, el descuento de inventario, la sincronización de estados, el resumen estadístico y la bitácora.
- El SQL nuevo pasó el analizador de PostgreSQL y la app pasó la revisión de tipos y el análisis estático de los archivos modificados.

## Aplicación en Supabase

La aplicación remota la realizó el propietario desde su terminal autenticada. El siguiente comando sirve para confirmar que las siete versiones coinciden entre `Local` y `Remote`:

```powershell
Set-Location D:\gestion-casos-propuesta
npx.cmd --yes supabase@2.117.0 migration list --linked
```

La aplicación del cambio y la prueba funcional en Supabase remoto son comprobaciones diferentes: esta fase confirmó la primera por la salida de la CLI, pero la segunda queda para la conexión de la app. Habrá que actualizar las consultas de la app para usar los nombres en español antes de cambiar su conexión al proyecto nuevo.
