# Fase 06: panel del técnico

## Resultado

En el modo de mantenimiento, el rol `tecnico` abre primero la pestaña **Mi trabajo** y puede ver las diez asignaciones activas más recientes vinculadas con su usuario. Cada actividad muestra su descripción y estado. La lista permite actualizarse al deslizar hacia abajo y distingue entre carga, falta de asignaciones y error de conexión. El técnico también conserva **Perfil**.

Los accesos **Registrar avance**, **Fotografías** e **Insumos y repuestos** abren vistas base. Todavía no cambian estados ni guardan fotografías o materiales. El técnico ya no recibe la pestaña de estadísticas globales; no se modificó el panel administrador ni el coordinador.

## Archivos

| Ruta en el proyecto                                                             | Función                                                                                               |
| ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `gestion-casos>src>features>technician>technicianService.ts`                    | Consulta las asignaciones activas del usuario y valida la respuesta.                                  |
| `gestion-casos>src>features>technician>screens>MaintenanceTechnicianScreen.tsx` | Muestra la lista, sus estados y los accesos de trabajo.                                               |
| `gestion-casos>src>features>technician>__tests__>technicianService.test.ts`     | Verifica el filtro por técnico, asignación activa y límite de diez resultados.                        |
| `gestion-casos>src>navigation>MainNavigator.tsx`                                | Añade la pestaña **Mi trabajo** solo para el rol técnico y retira de su navegación el resumen global. |
| `gestion-casos>src>navigation>types.ts`                                         | Declara las rutas del técnico y la sección **Registrar avance**.                                      |
| `gestion-casos>src>features>admin>screens>MaintenanceModuleScreen.tsx`          | Reconoce la nueva sección inferior sin duplicar la vista base.                                        |

## Líneas clave y propósito

| Ruta y línea                                                                        | Bloque                            | Idea                                                                                    |
| ----------------------------------------------------------------------------------- | --------------------------------- | --------------------------------------------------------------------------------------- |
| `gestion-casos>src>features>technician>technicianService.ts:19`                     | `.from('asignaciones_actividad')` | Inicia la consulta desde la tabla de asignaciones, no desde todas las actividades.      |
| `gestion-casos>src>features>technician>technicianService.ts:21`                     | `.eq('id_tecnico', userId)`       | Solicita únicamente las asignaciones del usuario conectado.                             |
| `gestion-casos>src>features>technician>technicianService.ts:22`                     | `.eq('activa', true)`             | Omite asignaciones retiradas.                                                           |
| `gestion-casos>src>features>technician>technicianService.ts:24`                     | `.limit(10)`                      | Mantiene breve el panel inicial. La lista completa con paginación queda para otra fase. |
| `gestion-casos>src>features>technician>screens>MaintenanceTechnicianScreen.tsx:25`  | `STATUS_LABELS`                   | Traduce los estados de la base de datos a etiquetas visibles.                           |
| `gestion-casos>src>features>technician>screens>MaintenanceTechnicianScreen.tsx:55`  | `useQuery`                        | Carga las asignaciones y permite reintentar o actualizar.                               |
| `gestion-casos>src>features>technician>screens>MaintenanceTechnicianScreen.tsx:100` | Lista de actividades              | Presenta solo los resultados recibidos para este técnico.                               |
| `gestion-casos>src>navigation>MainNavigator.tsx:208`                                | `role === 'tecnico'`              | Muestra la pestaña **Mi trabajo** solo a este rol.                                      |
| `gestion-casos>src>navigation>MainNavigator.tsx:215`                                | Condición de **Resumen**          | Evita mostrar al técnico el resumen general de todos los usuarios.                      |

Las políticas RLS del esquema nuevo también restringen las filas de `asignaciones_actividad` y `actividades` que un técnico puede leer. El filtro de la app mejora la consulta, pero la protección de datos no depende solo de ocultar pantallas.

## Verificación y prueba manual pendiente

TypeScript, análisis de código y las pruebas automatizadas pasaron. La nueva prueba comprueba que la consulta incluye `id_tecnico`, `activa = true`, el orden reciente y el límite de diez.

Para revisar el panel en el teléfono se necesita una cuenta distinta de la administradora con `rol = 'tecnico'`. Si aún no hay actividades asignadas, debe mostrarse el mensaje **Aún no tienes actividades asignadas**. La lista con datos reales y las acciones de avance, fotos y materiales se verificarán cuando esos módulos estén conectados.
