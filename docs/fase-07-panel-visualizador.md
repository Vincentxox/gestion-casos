# Fase 07: panel del visualizador

## Resultado

El visualizador entra a la pestaña **Panel**, que muestra la cantidad total de solicitudes, las pendientes, las que están en proceso, las finalizadas y el técnico con más solicitudes resueltas. También puede abrir **Perfil**. No aparecen las pestañas de administración, coordinación, trabajo técnico ni casos del modelo anterior.

Se reutilizó el resumen de mantenimiento ya conectado a la función `get_maintenance_dashboard_stats`. El texto de cabecera se adapta al visualizador. No se creó otra consulta ni otra migración para mostrar las mismas cifras.

## Archivos

| Ruta en el proyecto                                             | Función                                                                                  |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `gestion-casos>src>features>home>MaintenanceOverviewScreen.tsx` | Presenta las cifras agregadas y el encabezado propio del visualizador.                   |
| `gestion-casos>src>navigation>MainNavigator.tsx`                | Nombra su pestaña **Panel** y muestra únicamente esa pestaña y **Perfil** para este rol. |

## Líneas clave y propósito

| Ruta y línea                                                       | Bloque                                            | Idea                                                                                               |
| ------------------------------------------------------------------ | ------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `gestion-casos>src>features>home>MaintenanceOverviewScreen.tsx:22` | `supabase.rpc('get_maintenance_dashboard_stats')` | Lee cifras agregadas sin descargar las filas de solicitudes.                                       |
| `gestion-casos>src>features>home>MaintenanceOverviewScreen.tsx:29` | `profile?.role === 'visualizador'`                | Detecta el rol para mostrar el encabezado correspondiente.                                         |
| `gestion-casos>src>features>home>MaintenanceOverviewScreen.tsx:38` | `Panel del visualizador`                          | Da un título claro a su página de inicio.                                                          |
| `gestion-casos>src>navigation>MainNavigator.tsx:215`               | Condición de **Resumen/Panel**                    | Conserva las estadísticas para visualizador, administrador y coordinador, y las oculta al técnico. |

## Cómo comprobarlo

Ingresa con una cuenta nueva que conserve el rol inicial `visualizador`. Debes ver **Panel** y **Perfil**. Si la base está vacía, las cifras serán cero y aparecerá **Aún no hay datos** bajo el técnico destacado. La prueba visual en el teléfono queda pendiente de ingresar con esa cuenta.
