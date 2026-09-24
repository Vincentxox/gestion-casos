# Fase 05: primera vista del coordinador

## Alcance

Se añadió la vista inicial del rol `coordinador` en la rama `feature/propuesta-mantenimiento`. El coordinador verá primero la pestaña **Coordinar**, además de **Resumen** y **Perfil**. La pestaña de administración queda reservada al administrador. No se creó ni aplicó ninguna migración en esta fase.

La pantalla ofrece cuatro accesos principales: **Solicitudes**, **Actividades**, **Asignaciones** y **Seguimiento**. Debajo aparece **Informes**. Cada acceso abre una vista base con flecha para regresar y con las secciones que corresponden a esa tarea. Estas secciones todavía no consultan ni guardan registros; se conectarán por etapas. El resumen de estadísticas existente sigue disponible en su propia pestaña.

## Archivos

| Ruta en el proyecto                                                               | Qué se hizo                                                                                                                                          |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `gestion-casos>src>features>coordinator>screens>MaintenanceCoordinatorScreen.tsx` | Creó el panel inicial y sus cinco accesos, siguiendo el estilo del panel administrador.                                                              |
| `gestion-casos>src>navigation>MainNavigator.tsx`                                  | Registró la ruta del coordinador y muestra la pestaña **Coordinar** solo a ese rol en el modo mantenimiento.                                         |
| `gestion-casos>src>navigation>types.ts`                                           | Declaró las rutas y opciones de cada módulo para que TypeScript verifique la navegación.                                                             |
| `gestion-casos>src>features>admin>screens>MaintenanceModuleScreen.tsx`            | Reutilizó la vista base de módulos y permite elegir sus secciones inferiores según la tarea. El administrador conserva las tres opciones originales. |

## Líneas clave

| Ruta y línea                                                                         | Bloque                                          | Para qué sirve                                                                                                             |
| ------------------------------------------------------------------------------------ | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `gestion-casos>src>features>coordinator>screens>MaintenanceCoordinatorScreen.tsx:12` | `QUICK_ACTIONS`                                 | Define los cuatro accesos del coordinador, sus iconos y sus secciones.                                                     |
| `gestion-casos>src>features>coordinator>screens>MaintenanceCoordinatorScreen.tsx:43` | `MaintenanceCoordinatorScreen`                  | Construye la pantalla usando el nombre del perfil activo.                                                                  |
| `gestion-casos>src>features>coordinator>screens>MaintenanceCoordinatorScreen.tsx:66` | `navigation.navigate('MaintenanceModule', ...)` | Abre el módulo elegido con sus secciones permitidas en esta vista.                                                         |
| `gestion-casos>src>features>coordinator>screens>MaintenanceCoordinatorScreen.tsx:86` | Acceso **Informes**                             | Abre una vista con **Ver lista** y **Generar**; la generación real queda para una fase posterior.                          |
| `gestion-casos>src>navigation>MainNavigator.tsx:117`                                 | `CoordinatorNavigator`                          | Agrupa el panel y los módulos en una navegación con flecha de regreso.                                                     |
| `gestion-casos>src>navigation>MainNavigator.tsx:174`                                 | `role === 'coordinador'`                        | Muestra la pestaña **Coordinar** únicamente a ese rol.                                                                     |
| `gestion-casos>src>features>admin>screens>MaintenanceModuleScreen.tsx:23`            | `route.params.sections ?? DEFAULT_SECTIONS`     | Muestra las secciones del coordinador cuando se proporcionan y conserva Agregar, Ver lista y Editar para el administrador. |

## Permisos y datos

La navegación oculta funciones ajenas al rol, pero los permisos efectivos siguen en la base de datos. Las migraciones ya aplicadas permiten al coordinador crear solicitudes y actividades, asignar técnicos y consultar el progreso bajo las políticas RLS existentes. Esta fase solo prepara la pantalla; todavía no llama a esas tablas ni modifica sus datos.

## Verificación

- `npm.cmd run typecheck`: correcto.
- `npm.cmd run lint`: correcto.
- `npm.cmd test -- --watch=false`: 68 pruebas correctas.
- Compilación del paquete Android con Expo: correcta.
- Pendiente: prueba visual en el teléfono con una cuenta que tenga `rol = 'coordinador'`.

## Cómo probar la vista sin cambiar tu administrador

Crea un **segundo usuario** en Supabase Authentication > Users, o regístralo desde la app y confirma el correo si se solicita. El perfil nuevo comienza como `visualizador`. En Supabase SQL Editor, cambia solo ese perfil usando su correo real:

```sql
update public.perfiles as p
set rol = 'coordinador'
from auth.users as u
where p.id = u.id
  and lower(u.email) = lower('CORREO_DEL_COORDINADOR')
  and p.rol = 'visualizador'
returning p.id, p.nombre_completo, p.rol;
```

La consulta debe devolver una fila con `coordinador`. Cierra sesión en la app e ingresa con ese segundo usuario. Debes ver **Coordinar**, **Resumen** y **Perfil**; no debe aparecer **Administrar**. Al tocar cada tarjeta debes poder regresar con la flecha. No uses el correo de tu administrador en esta prueba.
