# Análisis de brechas — código actual frente al nuevo modelo

Fecha: 22 de septiembre de 2026 · Autor: Claude (Cowork) · Rama:
`agent/claude/business-model-backend`.

Compara lo que ya existe en la aplicación con `docs/BUSINESS_RULES.md` (versión 2) y
define qué se conserva, qué cambia y qué falta. El módulo de reportes, firmas y PDF queda
fuera de este análisis por decisión del responsable; se analizará después.

## 1. Resumen

- **Se conserva**:
  - la base técnica: Expo, navegación, autenticación con correo y Google, sesión segura,
    React Query, formularios con Zod, tokens de diseño, marca y animación inicial;
  - los módulos de administración (usuarios, áreas y categorías), como punto de partida.
- **Cambia a fondo**:
  - el módulo de casos, que pasa de un CRUD con tres estados a un flujo de 10 estados con
    acciones por rol;
  - la matriz de permisos;
  - la administración de usuarios.
- **Falta**:
  - empresas e invitaciones;
  - tipo de área;
  - recursos y su registro de uso;
  - el panel de inicio por rol;
  - los reportes, que se analizarán después.
- **Base de datos**: implementada en esta rama y probada con 95 pruebas SQL. Pendiente de
  la revisión de Codex y de tu autorización para aplicarla en Supabase.

## 2. Base de datos

### 2.1 Qué había

- Roles globales `administrador`, `auditor` y `visualizador`, sin empresa.
- Casos con tres estados (`abierto`, `en_progreso` y `cerrado`), cualquier transición
  permitida y cambios solo por el administrador.
- La categoría del caso se guardaba como texto, sin vínculo con el catálogo ni con áreas.
- Cualquier usuario autenticado leía todos los casos; solo el administrador leía otros
  perfiles.
- Áreas y categorías sin empresa y sin tipo.

### 2.2 Qué se implementó (migraciones `20260922200000` a `20260922200500`)

1. **Roles**: `visualizador` pasa a `solicitante`; se agregan `jefe_area` y `tecnico`.
2. **Reinicio del dominio de casos**: se descartan los casos y el historial anteriores,
   según la aprobación del responsable. Se conservan usuarios, perfiles, áreas y
   categorías.
3. **Empresas**:
   - tabla `organizations` y `organization_id` en perfiles, áreas y tipos de servicio;
   - los datos actuales pasan a «Organización inicial»;
   - Tecnología y Mantenimiento se marcan como áreas técnicas; las demás, como
     solicitantes;
   - los tipos de servicio de áreas no técnicas se eliminan.
4. **Miembros**:
   - los miembros de una empresa ven el directorio de su empresa (nombre, rol y área);
   - solo el administrador cambia rol y área, mediante `set_member_access`;
   - un técnico debe estar en un área técnica y un jefe debe tener área;
   - la empresa nunca se queda sin administrador;
   - nadie cambia su empresa desde el cliente.
5. **Invitaciones**:
   - el administrador invita por correo con rol y área;
   - la persona se vincula al registrarse, al confirmar su correo o de inmediato si ya
     tenía cuenta;
   - `private.create_organization` da de alta una empresa nueva con su primer
     administrador (solo desde el SQL editor).
6. **Solicitudes**:
   - numeración por empresa y año (`CAS-2026-00001`);
   - área solicitante y área destino fijadas por el servidor;
   - `category_id` obligatorio;
   - visibilidad por rol y área;
   - edición limitada por estado;
   - RPC `transition_case` con las acciones aceptar, rechazar, cancelar, asignar
     (reasignar), iniciar, pausar y reanudar;
   - historial `case_events`, que no se edita.
7. **Recursos**:
   - catálogo por empresa (material, herramienta, equipo);
   - registro de uso y mano de obra por solicitud, solo en ejecución o en espera, con copia
     del nombre, la unidad y el costo al registrar.
8. **Pruebas**:
   - `scripts/test-supabase-migrations.sh` aplica todas las migraciones sobre un
     PostgreSQL local que imita a Supabase y ejecuta
     `supabase/tests/10_business_model_test.sql`;
   - las pruebas cubren migración de datos, invitaciones, roles, catálogos, flujo
     completo, recursos, aislamiento entre empresas y acceso anónimo;
   - se agregó un job en GitHub Actions.
9. **Finales de línea**: `.gitattributes` con LF (T-001).

### 2.3 Qué falta en base de datos

- **Reportes, firmas, Storage y PDF** (fase 4): las acciones `enviar_reporte`,
  `validar_reporte`, `devolver_reporte` y `aprobar_reporte` ya existen en el enum, pero la
  RPC responde «Acción no disponible». Se analizarán después.
- **Tiempos por prioridad y notificaciones** (fase 5).
- **Historial de migraciones** (T-002, resuelto en esta rama): los archivos antiguos se
  renombraron a las versiones registradas en el proyecto remoto. La primera migración
  pasó de `202607270001` a `20260727000000`; no está registrada en remoto y se registrará
  en el despliegue (ver sección 6).

## 3. Frontend (lo implementa Codex)

Cada punto cita el contrato de `docs/AGENT_HANDOFF.md` que debe usar.

### 3.1 Autenticación y sesión (C-001, C-002)

- `src/features/auth/types.ts`: los roles pasan a `administrador`, `jefe_area`, `tecnico`,
  `auditor` y `solicitante`. El perfil incluye `organizationId` y `organizationName`.
- `authService.getProfile`: debe leer también `organization:organizations(name)`.
- **Sin empresa**: pantalla nueva que explica que la cuenta espera una invitación, con un
  botón «Reintentar» (`accept_pending_invitation`) y otro para cerrar sesión. Hoy un
  usuario sin empresa entraría a pantallas vacías.
- Después de registrarse o iniciar sesión sin empresa, llamar a
  `accept_pending_invitation` una vez.
- `RegisterScreen`: aclarar que se debe usar el correo al que llegó la invitación.

### 3.2 Permisos

`src/features/auth/permissions.ts` debe reflejar la base de datos. Propuesta:

- `cases.read`: todos los roles con empresa.
- `cases.create`: administrador, jefe de área, técnico y solicitante (con área asignada).
- `cases.review` (aceptar y rechazar) y `cases.assign`: jefe del área destino y
  administrador.
- `cases.execute` (iniciar, pausar, reanudar y registrar recursos): técnico asignado y jefe
  del área destino.
- `users.manage`, `areas.manage`, `serviceTypes.manage` y `resources.manage`:
  administrador.
- `reports.read` y `audit.read`: administrador y auditor.

Varias acciones dependen del caso (área, asignado, estado). Conviene una función pura
`getAvailableCaseActions(caso, perfil)` que replique las reglas de `transition_case`, con
pruebas unitarias. La base de datos sigue siendo la autoridad.

### 3.3 Solicitudes (C-003)

- **Tipos y servicio**:
  - los 10 estados nuevos y los campos `categoryId`, `requestingAreaId`, `targetAreaId`,
    `assignedTo` y las fechas del caso;
  - el servicio lee nombres con relaciones:
    `creator:profiles!cases_created_by_fkey(full_name)`,
    `assignee:profiles!cases_assigned_to_fkey(full_name)`, `category:categories(name)` y
    las dos áreas.
- **Crear**:
  - el formulario envía `category_id`, no el nombre;
  - el selector muestra los tipos de servicio agrupados por área técnica;
  - si el usuario no tiene área, lo explica en lugar de mostrar el formulario.
- **Listado**:
  - pestañas o segmentos «Mis solicitudes», «Mi área» y «Bandeja técnica» según el rol;
  - filtros por estado agrupados: pendientes, en curso y cerradas;
  - la búsqueda actual se conserva.
- **Detalle**:
  - nombres de creador y técnico; áreas solicitante y destino; tipo de servicio;
  - línea de tiempo con `case_events`, que reemplaza el historial de estados;
  - botones de acción según `getAvailableCaseActions`.
- **Acciones**:
  - `ChangeCaseStatusScreen` se reemplaza por hojas o pantallas específicas: aceptar,
    rechazar (motivo), cancelar, pausar (motivo) y reanudar;
  - `AssignCaseScreen` lista solo técnicos y jefes del área destino.
- **Editar**: solo el creador mientras está «solicitado», o el jefe del área destino y el
  administrador mientras no esté cerrada.

### 3.4 Recursos (C-004)

- **Administrar → Recursos**: catálogo con tipo, unidad y costo, y activar o desactivar.
- **Detalle del caso → Recursos utilizados**: lista, agregar (material con cantidad,
  herramienta o equipo con horas opcionales, mano de obra con técnico y horas), corregir y
  eliminar mientras el caso esté en ejecución o en espera.

### 3.5 Administración (C-001, C-002)

- **Usuarios**:
  - cambio de rol y área con `set_member_access`;
  - mostrar errores claros («Un técnico debe pertenecer a un área técnica», «La empresa
    debe conservar al menos un administrador»).
- **Invitaciones**: pantalla nueva para invitar (correo, rol y área), ver pendientes y
  aceptadas, y revocar.
- **Áreas**: agregar el tipo (solicitante o técnica); explicar que no se puede cambiar
  cuando está en uso.
- **Categorías**:
  - se renombran en la interfaz a «Tipos de servicio»;
  - solo se ofrecen áreas técnicas.
- **Empresa**: el administrador puede ver y renombrar su empresa.

### 3.6 Inicio y perfil

- `HomeScreen` tiene textos del modelo anterior («03», «Gestión de casos disponible») y
  muestra el rol sin formato. Debe ser un inicio por rol:
  - solicitante: sus solicitudes abiertas y el botón de crear;
  - jefe técnico: pendientes por aceptar y sin asignar;
  - técnico: sus trabajos asignados y en ejecución;
  - administrador y auditor: conteos por estado.
- `ProfileScreen`: nombre de la empresa, rol con etiqueta legible y área.

## 4. Diseño e identidad (Codex)

El responsable autorizó que Codex proponga diseños. Recomendaciones:

1. **Sistema de estados**: color, ícono y etiqueta para los 10 estados y las 3
   prioridades. Hoy `CasesListScreen` usa colores sueltos (`#C4320A`…) fuera de
   `tokens.ts`.
2. **Componentes reutilizables**:
   - `StatusBadge`, `PriorityBadge`, `Timeline`, `ActionSheet` para las transiciones;
   - `EmptyState`, `ErrorState` y `LoadingState` comunes (hoy cada pantalla los resuelve
     por su cuenta).
3. **Tipografía y escala**: agregar tamaños y pesos a `tokens.ts` para dejar de repetir
   valores en cada `StyleSheet`.
4. **Marca**: el logo y la animación actuales ya transmiten «conexión». Antes de
   rediseñarlos, conviene validar que se lean bien en tamaño de ícono y en modo
   monocromático. Un rediseño completo no es necesario para el MVP.
5. **Modo oscuro**: `app.json` fija `userInterfaceStyle: light`. Se puede posponer.

## 5. Riesgos

- **Aplicar las migraciones rompe la versión instalada de la app.** Los roles, estados y
  tablas cambian; la APK actual dejará de funcionar para los 11 usuarios hasta que Codex
  actualice el frontend. Opciones:
  - aplicar ya y asumir la interrupción mientras se desarrolla;
  - aplicar cuando el frontend de las fases 1 y 2 esté listo para la prueba integrada.
- **Roles reales**: después de aplicar, todos los usuarios que no son administradores ni
  auditores quedan como `solicitante`. Hay que asignar jefes y técnicos desde la app o con
  `set_member_access`.
- **Perfiles sin área**: 9 de los 11 perfiles no tienen área. El administrador la
  asignará desde la app (decisión del responsable), así que la pantalla de Usuarios de
  T-104 es imprescindible para el despliegue.
- **Nombre de la empresa inicial**: queda como «Organización inicial». El administrador
  puede renombrarla.
- **Ajustes a las reglas de negocio**: la implementación precisó algunas reglas
  (sección 5 de `docs/BUSINESS_RULES.md`, marcadas como «Precisión de implementación»).
  Requieren la confirmación del responsable.

## 6. Decisiones del responsable y plan de despliegue

Decisiones del 22/09/2026:

1. Se borran los 7 casos y las 4 categorías de áreas no técnicas; se conservan los
   usuarios.
2. El administrador asigna área y rol a los perfiles desde la app después del despliegue.
3. El administrador puede suplir siempre al jefe de área en aceptar, rechazar, asignar y
   cancelar; nunca firma.
4. Se descartaron los cambios locales solo de CRLF y se alineó el historial de migraciones
   (T-002).
5. No se aplica nada en Supabase hasta que la app esté lista para el nuevo esquema
   (recomendación de Codex).

Despliegue, cuando Codex apruebe el backend y el frontend de T-104 y T-202 esté listo:

1. Respaldar en JSON los datos actuales de `profiles`, `areas`, `categories`, `cases` y
   `case_status_history`.
2. Registrar en `supabase_migrations.schema_migrations` la versión `20260727000000`
   (sus objetos ya existen en remoto).
3. Aplicar las migraciones `20260922200000` a `20260922200500` en orden, cada una
   registrada con la versión de su archivo.
4. Revisar los avisos de seguridad y rendimiento de Supabase.
5. Publicar la nueva versión de la app y asignar áreas y roles desde Usuarios.
