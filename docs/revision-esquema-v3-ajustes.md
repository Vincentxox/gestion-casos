# Revisión del esquema V3 y de los ajustes solicitados

> Esta fue la revisión previa. La implementación posterior se describe en `gestion-casos>docs>fase-09-roles-esquema-v3-y-solicitudes.md`; el usuario ya aplicó las dos migraciones nuevas y queda pendiente probar el flujo en la app.

## Alcance

Se compararon `BD_AppMovilesV3.sql`, `Ajustes de app y base de datos .txt`, la explicación funcional anterior y el esquema de mantenimiento que ya se aplicó a Supabase. Esta revisión no modifica la base remota ni sustituye las migraciones aplicadas. El archivo V3 sirve como modelo funcional; ejecutarlo directamente sobre el proyecto actual intentaría crear tablas nuevas con otros nombres y no actualizaría las existentes.

## Coincidencias y diferencias

| Concepto de V3 | Implementación actual | Ajuste recomendado |
| --- | --- | --- |
| `Usuario` y `Tipo_Usuario` | `auth.users`, `perfiles` y `rol_aplicacion` | Mantener Supabase Auth y `perfiles`: no copiar `contrase_a_usuario` ni almacenar contraseñas en una tabla propia. Conservar el enlace opcional al empleado para permitir visualizadores sin ficha de empleado. |
| `Empleado` → `Area` → `Servicio`, `Cargo` | `empleados` → `areas` → `servicios`, `cargos` | Ya coincide en lo esencial. |
| `Solicitud_Actividad` | `solicitudes_mantenimiento` tiene número, área, equipo, empleado solicitante y fecha; le falta `id_tipo_actividad`. | Añadir la referencia a `tipos_actividad` en la solicitud. Conservar `numero_solicitud` como identificador visible y el UUID como clave interna. |
| `Actividad` | `actividades` tiene `id_solicitud`, `id_tipo_actividad`, descripción, estado y prioridad. | Trasladar el tipo a la solicitud y retirar el campo de actividad una vez adaptadas las consultas y comprobados los datos existentes. Mantener prioridad porque ya se usa para ordenar la lista. |
| `Detalle_Actividad` y `Estado_Actividad` | `asignaciones_actividad`, `historial_estados_actividad`, estado y fechas en `actividades`. | Verificar si esta representación cubre el historial que necesita el equipo antes de crear tablas adicionales. El estado de tres valores no cabe en el `Bit(1)` de `Actividad` de V3. |
| `Capturas` | `fotos_actividad` apunta a `actividades`, pero también tiene `id_usuario_carga` ligado a `perfiles`. | Retirar esa segunda relación si se confirma que no se necesita como dato de negocio. Preservar la autorización de carga y la bitácora. Guardar la imagen en Supabase Storage y su ruta en la tabla, en vez de un `bytea` grande. |
| `Insumos` y `Repusto` en `Actividad` | `insumos_actividad` y `repuestos_actividad` permiten cantidades y varios elementos. | Mantener las tablas de detalle: la explicación funcional pide varios insumos y permite cero repuestos. Copiar literalmente las dos columnas obligatorias de V3 impediría ese caso. |
| `Equipo` | `equipos` tiene `id_area` adicional. | Pendiente de decisión: el SQL V3 no lo trae, pero la explicación dice que cada equipo pertenece a un área y la base actual valida esa relación. |

`solicitudes_mantenimiento` incluye `id_usuario_registro` para identificar a quien digitó la solicitud física; ese usuario puede ser diferente de `id_empleado_solicitante`. La bitácora también registra autor y momento de los cambios. Estas referencias tienen una finalidad distinta a asignar un área al perfil.

## Redundancia de área en el perfil

Hoy `perfiles.id_area` duplica el dato que se puede obtener por `perfiles.id_empleado` → `empleados.id_area`. La app lee la columna duplicada al iniciar sesión en `gestion-casos>src>features>auth>authService.ts`. La función `set_user_area` de la migración española y el servicio antiguo `gestion-casos>src>features>admin>userService.ts` también dependen de ella. Una eliminación aislada en Supabase rompería la consulta de login y la asignación antigua de áreas.

Propuesta: actualizar primero el cliente para obtener el área desde el empleado; luego crear una migración nueva que retire `set_user_area`, su índice y `perfiles.id_area`. Los visualizadores sin empleado deben seguir pudiendo iniciar sesión con área vacía. No editar migraciones que ya se aplicaron.

## Tipo de actividad y formulario

La consulta y creación de `gestion-casos>src>features>activities>activityService.ts` todavía leen y envían `actividades.id_tipo_actividad`. El disparador `private.prepare_activity_change()` de la migración española también compara esa columna. Al moverla hay que actualizar los tres puntos y revisar las políticas, los índices y las pruebas antes de quitar la columna.

El formulario actual de `gestion-casos>src>features>activities>screens>MaintenanceActivitiesScreen.tsx` selecciona una solicitud existente y crea después una actividad. La solicitud no se puede crear todavía desde ese módulo. Para cumplir el flujo descrito en el TXT, el apartado **Agregar** tendrá que recoger o seleccionar número de solicitud, equipo, área, empleado solicitante, fecha y tipo, y después registrar el trabajo a realizar. El orden de los pasos del formulario queda por concretar.

La lista ya pagina y filtra por área/estado y ordena por prioridad. Más adelante se pueden ubicar los filtros en listas desplegables y restaurar la navegación inferior **Agregar / Ver lista / Editar**; según el TXT, primero se termina la base y después el formulario **Agregar**.

## Decisiones antes de crear la migración

1. ¿Conservar el historial de estados y asignaciones actual como equivalente de `Detalle_Actividad`, o crear esa tabla tal como aparece en V3?
2. ¿Mantener varios insumos/repuestos opcionales por actividad, como indica la explicación funcional, o exigir uno de cada uno según el SQL literal?
3. ¿Conservar `equipos.id_area` para saber dónde está cada equipo, pese a que falta en la tabla `Equipo` de V3?
4. ¿Permitir solicitudes sin equipo para fallas del área? El sistema actual lo permite; V3 exige `id_equipo`.
5. ¿**Agregar** debe crear solicitud y primera actividad en el mismo proceso, o seleccionar una solicitud creada previamente?

## Orden de implementación propuesto

1. Resolver las decisiones anteriores y comprobar si existen registros en las tablas que cambiarán; el proyecto era nuevo al crear el esquema, pero ya se han realizado pruebas.
2. Preparar una **migración nueva** que añada `id_tipo_actividad` a solicitudes. Si ya hay actividades, copiar los tipos existentes y resolver las solicitudes que tengan actividades de tipos distintos antes de imponer obligatoriedad. No borrar la columna anterior hasta que la app use la nueva.
3. Adaptar `authService.ts`, `activityService.ts`, los disparadores, las políticas pertinentes y las pruebas para la estructura nueva. En una migración posterior, retirar `perfiles.id_area`, `actividades.id_tipo_actividad` y la relación sobrante de fotos cuando ya no tengan consumidores.
4. Comprobar tipos, pruebas, migraciones pendientes y una simulación de `db push`. Después aplicar al proyecto correcto y probar login, alta de solicitud/actividad y consulta de lista.
5. Terminar el formulario **Agregar**, luego la navegación inferior, la lista y **Editar**. Retomar la campana de roles después de estabilizar el esquema.

## Estado y precaución de esta revisión

La última migración confirmada por el usuario en Supabase al realizar esta revisión fue `20260920135050_add_activity_priority.sql`. La campana y los ajustes V3 se prepararon después como las migraciones `20260920173756_track_pending_user_roles.sql` y `20260920190551_align_maintenance_v3_and_profile_photos.sql`. El usuario confirmó que ambas se aplicaron correctamente. Las comprobaciones de funcionamiento están en `gestion-casos>docs>fase-09-roles-esquema-v3-y-solicitudes.md`.
