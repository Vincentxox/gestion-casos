# Fase 08: registro y lista de actividades

> Registro histórico de la fase 08. La migración de prioridad ya fue aplicada por el usuario. El flujo actual de alta, roles y esquema V3 se explica en `gestion-casos>docs>fase-09-roles-esquema-v3-y-solicitudes.md`.

## Resultado

Administrador y coordinador abren el mismo módulo **Actividades**. En **Agregar** eligen una solicitud existente, un tipo de actividad, una prioridad y una descripción. La base asigna el estado inicial **pendiente** y registra la creación en la bitácora. En **Ver lista** pueden filtrar por área y estado, ordenar por prioridad y avanzar de diez en diez actividades.

**Activas** comprende **pendientes** y **en proceso**. **En proceso** muestra solamente ese estado. El orden ascendente es **Baja → Media → Alta**; el descendente, **Alta → Media → Baja**.

## Archivos y bloques clave

| Ruta en el proyecto                                                               |           Líneas | Para qué sirve                                                                                                                        |
| --------------------------------------------------------------------------------- | ---------------: | ------------------------------------------------------------------------------------------------------------------------------------- |
| `gestion-casos>supabase>migrations>20260920135050_add_activity_priority.sql`      |                2 | Declara las prioridades en el orden usado para ordenar ascendentemente.                                                               |
| Mismo archivo                                                                     |              4–5 | Añade `prioridad` a `actividades`, obligatoria y con valor inicial `media` para las filas que ya existan.                             |
| Mismo archivo                                                                     |              7–8 | Crea un índice para las consultas ordenadas por prioridad y fecha.                                                                    |
| `gestion-casos>src>features>activities>activityService.ts`                        |                5 | `ACTIVITY_PAGE_SIZE = 10` fija cuántas actividades se piden por página.                                                               |
| Mismo archivo                                                                     |            73–84 | Consulta las actividades con su solicitud, área y tipo; aplica filtros de área y estado en Supabase.                                  |
| Mismo archivo                                                                     |            86–91 | Ordena por prioridad y usa `range` para pedir solo la página visible; fecha e ID estabilizan el orden cuando hay prioridades iguales. |
| Mismo archivo                                                                     |           97–110 | Guarda una actividad sin enviar estado ni usuario creador: la base proporciona ambos y valida los permisos.                           |
| `gestion-casos>src>features>activities>screens>MaintenanceActivitiesScreen.tsx`   |            33–45 | Define las opciones de estado y prioridad visibles en pantalla.                                                                       |
| Mismo archivo                                                                     |          104–125 | Lee la página actual y, después de guardar, actualiza la lista.                                                                       |
| Mismo archivo                                                                     |          188–251 | Presenta los filtros y reinicia la página al cambiarlos.                                                                              |
| Mismo archivo                                                                     |          284–300 | Muestra el número de página y los controles Anterior/Siguiente.                                                                       |
| Mismo archivo                                                                     |          306–415 | Presenta el formulario y explica cuando aún no existe ninguna solicitud.                                                              |
| `gestion-casos>src>navigation>MainNavigator.tsx`                                  | 103–106, 146–149 | Registra la misma pantalla en las rutas de administrador y coordinador.                                                               |
| `gestion-casos>src>navigation>types.ts`                                           |           21, 38 | Declara las rutas nuevas para que TypeScript compruebe la navegación.                                                                 |
| `gestion-casos>src>features>admin>screens>MaintenanceAdminScreen.tsx`             |          211–212 | Abre el módulo real desde el panel del administrador.                                                                                 |
| `gestion-casos>src>features>coordinator>screens>MaintenanceCoordinatorScreen.tsx` |            66–67 | Abre el mismo módulo desde el panel del coordinador.                                                                                  |
| `gestion-casos>src>features>activities>__tests__>activityService.test.ts`         |             1–86 | Comprueba filtros, orden, límites de página y datos enviados al crear.                                                                |

## Aplicar la migración

Desde la raíz de la **rama de propuesta**, con el proyecto Supabase correcto ya enlazado:

```powershell
npx.cmd --yes supabase@2.117.0 db push --dry-run --skip-vault --linked
```

El resultado debe anunciar solo `20260920135050_add_activity_priority.sql`. Revísalo antes de aplicar:

```powershell
npx.cmd --yes supabase@2.117.0 db push --skip-vault --linked
```

Esta migración aún no se había aplicado al preparar esta fase; el usuario confirmó después que se aplicó correctamente. No modifiques las migraciones anteriores que ya aparecen como aplicadas.

## Comprobar en la aplicación

1. Entra como administrador o coordinador y abre **Actividades**.
2. En **Ver lista**, comprueba que **Activas** incluye pendientes y en proceso; usa **En proceso** y **Finalizadas** para verlos por separado.
3. Cambia entre **Alta → Baja** y **Baja → Alta**; cuando haya más de diez registros, usa **Siguiente** y **Anterior**.
4. En **Agregar**, selecciona una solicitud, un tipo, una prioridad y escribe al menos diez caracteres. Al guardar, la nueva actividad debe aparecer como pendiente.
5. Revisa `bitacora_mantenimiento` en Supabase si quieres confirmar el registro de creación.

**Dependencia de esta fase:** una actividad necesita una fila previa en `solicitudes_mantenimiento`. Si todavía no hay solicitudes, el formulario indica que primero debe registrarse una. El módulo de solicitudes aún es una vista preliminar; su formulario será una fase distinta.

## Verificación realizada

Pasaron la comprobación de tipos, el análisis de código, las 74 pruebas automatizadas, la revisión de formato y la exportación de Android. La simulación remota no pudo ejecutarse desde esta sesión porque aquí la CLI no dispone de un token de acceso; ejecútala en tu terminal, donde ya vinculaste el proyecto. Falta probar el flujo completo en el teléfono después de aplicar la migración y contar con una solicitud.
