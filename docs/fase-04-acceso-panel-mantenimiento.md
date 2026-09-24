# Fase 04: acceso al proyecto nuevo y panel de mantenimiento

## Objetivo y alcance

El usuario administrador ya existe en Supabase y su fila de `perfiles` tiene `rol = 'administrador'`. Esta fase prepara la app para iniciar sesión con ese usuario y abrir la primera vista del panel de mantenimiento. El modo nuevo se activa con una variable local; la rama principal de casos no se reemplaza. Los módulos Agregar, Ver lista y Editar son pantallas base y todavía no guardan datos.

## Archivos de esta fase

| Archivo                                                         | Idea del cambio                                                                                                                                           |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `gestion-casos>.env.example`                                    | Documenta `EXPO_PUBLIC_DATA_MODEL`, que selecciona el esquema activo.                                                                                     |
| `gestion-casos>src>config>dataModel.ts`                         | Comprueba si se eligió `maintenance`.                                                                                                                     |
| `gestion-casos>src>features>auth>authService.ts`                | Consulta `perfiles` y traduce los campos en español al perfil usado por la app.                                                                           |
| `gestion-casos>src>features>auth>types.ts`                      | Reconoce los cinco roles del esquema nuevo.                                                                                                               |
| `gestion-casos>src>features>auth>permissions.ts`                | Mantiene los permisos anteriores de casos y define los roles nuevos sin permisos de casos.                                                                |
| `gestion-casos>src>features>auth>screens>LoginScreen.tsx`       | Muestra textos de mantenimiento en el modo nuevo. La opción Google queda fuera de esta fase porque aún no se configuró el proveedor en el proyecto nuevo. |
| `gestion-casos>src>features>home>MaintenanceOverviewScreen.tsx` | Lee el resumen agregado con `get_maintenance_dashboard_stats`; muestra cantidades y el técnico destacado.                                                 |
| `gestion-casos>src>navigation>MainNavigator.tsx`                | Envía al administrador al panel y muestra al visualizador solo Resumen y Perfil. Evita abrir las pantallas antiguas de casos con el esquema nuevo.        |
| `gestion-casos>src>features>settings>ProfileScreen.tsx`         | Muestra las etiquetas de los roles nuevos.                                                                                                                |
| `gestion-casos>src>features>auth>__tests__>authService.test.ts` | Verifica que el inicio de sesión siga leyendo `profiles` en modo casos y `perfiles` en modo mantenimiento.                                                |

También se actualizó `gestion-casos>src>features>auth>screens>RegisterScreen.tsx` para aclarar que las cuentas nuevas comienzan como visualizador.

Las pantallas visuales del panel y de los módulos, y las rutas correspondientes, se describen en `gestion-casos>docs>fase-03-nombres-espanol-panel-administrador.md`.

## Líneas principales y para qué sirven

| Archivo y línea                                                           | Código o bloque                                            | Función                                                                                   |
| ------------------------------------------------------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `gestion-casos>src>config>dataModel.ts:2`                                 | `process.env.EXPO_PUBLIC_DATA_MODEL === 'maintenance'`     | Activa el esquema nuevo solo si se eligió expresamente en `.env`.                         |
| `gestion-casos>src>features>auth>authService.ts:80`                       | `if (usesMaintenanceDataModel())`                          | Separa la lectura del perfil nuevo de la lectura anterior.                                |
| `gestion-casos>src>features>auth>authService.ts:82`                       | `.from('perfiles')`                                        | Consulta la tabla de perfiles en español después de iniciar sesión.                       |
| `gestion-casos>src>features>auth>authService.ts:88`                       | `return mapMaintenanceProfile(data)`                       | Convierte el resultado de Supabase al perfil que entienden las pantallas.                 |
| `gestion-casos>src>navigation>MainNavigator.tsx:136`                      | `maintenanceMode && role === 'administrador'`              | Muestra la pestaña Administrar solo al administrador en el modo nuevo.                    |
| `gestion-casos>src>navigation>MainNavigator.tsx:144`                      | `maintenanceMode ? MaintenanceOverviewScreen : HomeScreen` | Muestra el resumen nuevo en vez del inicio de casos.                                      |
| `gestion-casos>src>features>home>MaintenanceOverviewScreen.tsx:22`        | `supabase.rpc('get_maintenance_dashboard_stats')`          | Solicita las cifras agregadas sin descargar la lista de solicitudes para el visualizador. |
| `gestion-casos>src>features>admin>screens>MaintenanceAdminScreen.tsx:142` | `useState<ViewMode>('grid')`                               | Inicia el panel en formato de cuadrícula y permite cambiar a lista.                       |
| `gestion-casos>src>features>admin>screens>MaintenanceModuleScreen.tsx:13` | `SECTIONS`                                                 | Define las tres opciones inferiores: Agregar, Ver lista y Editar.                         |

## Cómo se elige el esquema

La función `usesMaintenanceDataModel()` devuelve `true` solo cuando `EXPO_PUBLIC_DATA_MODEL` vale `maintenance`. Sin esa variable, la app conserva el modo `cases` actual. Así se puede probar la propuesta sin modificar los servicios de casos de los compañeros.

El inicio de sesión sigue usando correo y contraseña de Supabase Auth. Una vez autenticado, `getProfile()` consulta `perfiles` en el modo nuevo, lee `nombre_completo`, `rol` e `id_area`, y los transforma en el formato que ya usa la navegación. El administrador llega al panel de mantenimiento; el visualizador ve cifras agregadas y su perfil. Los roles coordinador, técnico y auditor también podrán entrar, pero sus vistas de trabajo se implementarán en fases posteriores.

## Paso para probarlo en tu equipo

En Visual Studio Code abre `D:\gestion-casos-propuesta`. Crea allí un archivo local llamado `.env` (en la raíz, junto a `package.json`). Copia las tres líneas de `.env.example` y sustituye los valores por la **Project URL** y la **publishable key** del proyecto Supabase nuevo. En la tercera línea escribe:

```dotenv
EXPO_PUBLIC_DATA_MODEL=maintenance
```

Encontrarás la URL y la clave pública en el botón **Connect** del proyecto Supabase; también puedes ver las claves en **Settings > API Keys**. Usa la clave **publishable**; nunca pongas `service_role` ni una clave secreta en la app. `.env` está excluido de Git y no debe compartirse en el chat.

Después reinicia Expo desde la carpeta de propuesta:

```powershell
Set-Location D:\gestion-casos-propuesta
npm.cmd start -- --clear
```

Abre la app e inicia sesión con el correo y la contraseña del usuario administrador que ya creaste en **Authentication > Users**. Debes ver la pestaña **Administrar** con cuatro accesos principales. La opción **Todas las gestiones** abre todos los módulos; **Resumen** debe mostrar cero solicitudes si la base sigue vacía. En **Perfil** debe aparecer **Administrador**.

Si el inicio de sesión falla, primero comprueba que el usuario exista en el mismo proyecto de la URL escrita en `.env`, que la clave sea la publishable key de ese proyecto y que `EXPO_PUBLIC_DATA_MODEL` sea `maintenance`. Los cambios de `.env` requieren reiniciar Expo.

## Pendiente para la siguiente fase

- Probar desde el dispositivo contra el proyecto Supabase nuevo. Esta prueba remota aún no se ha realizado aquí porque la URL y la clave pública locales no están configuradas en este trabajo.
- Conectar el primer módulo a sus tablas en español, con permisos y bitácora.
- Configurar Google Auth en el proyecto Supabase nuevo antes de mostrar esa opción en el modo mantenimiento.
