# Relevo entre agentes

Archivo compartido entre Claude Code, Codex y el responsable del proyecto. Léelo antes de
empezar y actualízalo al terminar (ver `AGENTS.md`, sección 3). El plan completo está en
`docs/MVP_PLAN.md`.

## Tablero

Estados posibles: Pendiente · En curso · En revisión · Cambios solicitados · Aprobado ·
Integrado · Bloqueado.

Plantilla por tarea:

```text
- ID: T-000
  Tarea: descripción breve
  Implementa: Claude Code | Codex
  Revisa: Codex | Claude Code
  Rama: agent/<agente>/<tema>
  Archivos o contratos que bloquea: ...
  Depende de: T-...
  Estado: Pendiente
```

Fase activa: **Fases 0 a 3 — backend revisado; frontend en desarrollo local**.

Por indicación del responsable (22/09/2026), Claude (Cowork) implementó en una sola rama el
backend de las fases 0 a 3, sin reportes. Los reportes, las firmas y el PDF (fase 4) se
analizarán después.

- ID: T-001
  Tarea: `.gitattributes` con LF.
  Implementa: Claude (Cowork)
  Revisa: Codex
  Rama: agent/claude/business-model-backend
  Estado: Aprobado por Codex (22/09/2026; aún no integrado en desarrollo)

- ID: T-002
  Tarea: alinear el historial de migraciones local con el remoto.
  Implementa: Claude
  Revisa: Codex
  Rama: agent/claude/business-model-backend (commit 9fa1694)
  Estado: Aprobado por Codex (22/09/2026). Con autorización del responsable se
  descartaron los cambios locales solo de CRLF (verificado: diff vacío ignorando CR) y se renombraron las
  migraciones antiguas a las versiones del remoto. `202607270001` pasó a
  `20260727000000`; se registrará en remoto durante el despliegue.

- ID: T-003
  Tarea: actualizar `README.md` y `docs/MVP_PROGRESS.md`.
  Estado: Integrado (commits 0267ccb y 36c6143).

- ID: T-101 · T-102 · T-103 · T-201 · T-301
  Tarea: backend de empresas, invitaciones, roles y tipos de área, flujo de solicitudes y
  recursos. Migraciones `20260922200000` a `20260922200500`, pruebas SQL en
  `supabase/tests/` y job de CI.
  Implementa: Claude (Cowork)
  Revisa: Codex
  Rama: agent/claude/business-model-backend (commits a98aef3, 9fa1694, d307cf0 y
  8baab93; en GitHub)
  Archivos o contratos que bloquea: `supabase/`, contratos C-001 a C-004
  Estado: Aprobado por Codex para desarrollo del cliente (22/09/2026). No se aplica en
  remoto sin autorización específica del responsable.

- ID: T-104
  Tarea: cliente de la fase 1: roles, empresa en el perfil, pantalla sin empresa,
  invitaciones, usuarios, tipo de área, tipos de servicio. Ver `docs/GAP_ANALYSIS.md`
  3.1, 3.2 y 3.5.
  Implementa: Codex
  Revisa: Claude
  Rama: agent/codex/mvp-client
  Archivos o contratos que bloquea: `src/features/auth/`, `src/features/admin/`,
  `src/features/areas/`, `src/features/categories/`, `src/navigation/`
  Depende de: aprobación de C-001 y C-002
  Estado: En revisión (22/09/2026; pendiente prueba integrada)

- ID: T-202
  Tarea: cliente del flujo de solicitudes. Ver `docs/GAP_ANALYSIS.md` 3.3 y 3.6.
  Implementa: Codex
  Revisa: Claude
  Rama: agent/codex/mvp-client
  Archivos o contratos que bloquea: `src/features/cases/`, `src/navigation/`
  Depende de: aprobación de C-003
  Estado: En revisión (22/09/2026; pendiente prueba integrada)

- ID: T-302
  Tarea: cliente de recursos. Ver `docs/GAP_ANALYSIS.md` 3.4.
  Implementa: Codex
  Revisa: Claude
  Rama: agent/codex/mvp-client
  Archivos o contratos que bloquea: `src/features/resources/`,
  `src/features/admin/screens/AdministrationHomeScreen.tsx`,
  `src/features/cases/screens/CaseDetailScreen.tsx`, `src/navigation/`
  Depende de: aprobación de C-004
  Estado: En revisión (22/09/2026; pendiente prueba integrada)

- ID: D-001
  Tarea: sistema visual: estados y prioridades, componentes comunes (StatusBadge,
  PriorityBadge, Timeline, ActionSheet, estados vacío/error/carga), escala tipográfica en
  `tokens.ts`, revisión de la marca. Ver `docs/GAP_ANALYSIS.md` sección 4.
  Implementa: Codex
  Revisa: Claude
  Rama: agent/codex/mvp-client
  Archivos o contratos que bloquea: `src/theme/`, `src/components/`, `src/features/home/`
  Depende de: —
  Estado: En revisión (22/09/2026)

- ID: Q-001
  Tarea: actualizar los cuatro parches de Expo SDK 57 solicitados por Expo Doctor,
  revisar `patches/expo-modules-core`, validar calidad y probar Android.
  Implementa: Codex
  Revisa: Claude
  Rama: agent/codex/expo-sdk-patches
  Archivos o contratos que bloquea: `package.json`, `package-lock.json`, `patches/`
  Depende de: —
  Estado: Integrado (22/09/2026; commit `cb50590`, merge `fb3ecb0`). Cambios en
  `package.json` y `package-lock.json`. `npm ci`, `npm run verify`
  (67 pruebas; Expo Doctor 21/21), `npm run test:coverage` y
  `git diff --cached --check` aprobados. `patches/expo-modules-core+57.0.18.patch`
  sigue aplicando con `patch-package`. La app abrió la pantalla de login en
  Android con Expo Go. Compilación nativa no concluida por un fallo local de
  Java/Gradle: `Unable to establish loopback connection`; pendiente repetirla
  en un entorno con JDK funcional.

- ID: Q-002
  Tarea: correcciones autorizadas del QA (hallazgos 2, 3 y 6; E1 a E6) y ajustes V7,
  incluida la decisión posterior sobre E7. T-908 sigue fuera del alcance.
  Implementa: Codex
  Revisa: Claude
  Rama: agent/codex/qa-fixes (desde `94a9468`)
  Archivos o contratos que bloquea: Jest, conexión/recarga del cliente, Google OAuth,
  cola de fotos y pantallas de solicitudes.
  Depende de: integración `94a9468`
  Estado: En revisión (27/09/2026; QA publicado y V7 implementada en
  `agent/codex/qa-fixes`; pendiente revisión de Claude).

- ID: T-801
  Tarea: backend de solicitudes de acceso con código de empresa y resumen del Inicio por
  rol (C-005, C-006) e índices sugeridos por Supabase.
  Implementa: Claude (Cowork)
  Revisa: Codex
  Rama: agent/claude/access-and-home (commits eacd64a y 71d319b, basada en la rama de
  backend; en GitHub)
  Estado: Aplicado en remoto (23/09/2026). CI de `71d319b` aprobó calidad y pruebas SQL;
  migraciones `20260923020000` y `20260923020100` aplicadas por autorización del
  responsable. Pendiente la integración del cliente y su prueba en la app.

- ID: D-002 · T-701 · T-702 · T-703 · T-704
  Tarea: rediseño por rol según `docs/UX_REDESIGN.md` (sistema visual, navegación e
  Inicio por rol, solicitudes, Administrar con solicitudes de acceso y código, pantalla
  sin empresa y perfil con nombre obligatorio).
  Implementa: Codex
  Revisa: Claude
  Rama: agent/codex/mvp-client (o una nueva basada en ella)
  Depende de: D-002 primero; T-701 y T-703/T-704 usan C-006 y C-005 (aprobados para
  desarrollo contra servicios simulados)
  Estado: En curso. Codex trabaja en `agent/codex/mvp-client` sobre D-002 y T-701 a T-704;
  módulos previstos: `src/components/`, `src/theme/`, `src/features/home/`,
  `src/features/cases/`, `src/features/admin/`, `src/features/auth/`,
  `src/features/settings/` y `src/navigation/`. Revisión: Claude.

- ID: T-705
  Tarea: compartir el aviso de invitación desde la app. Decisión del responsable
  (23/09/2026): en el MVP la app no envía correos; al crear una invitación, o desde una
  invitación pendiente, el administrador toca «Compartir aviso» y se abre el menú de
  compartir del teléfono (`Share` de React Native, sin dependencias nuevas) con un mensaje
  listo: empresa, rol, correo con el que debe registrarse, enlace de descarga (constante
  configurable; si está vacía, se omite) y «si ya tienes cuenta, abre la app y toca
  Comprobar acceso». El mensaje **no** incluye el código de empresa. La pantalla de
  invitaciones explica que la persona entra sola al registrarse y confirmar ese correo.
  Implementa: Codex · Revisa: Claude · Rama: agent/codex/mvp-client
  Archivos: `src/features/admin/` (InvitationsScreen y un helper puro del mensaje con
  pruebas). Sin cambios de backend: el vínculo automático ya existe (C-002).
  Estado: Aprobado (23/09/2026). Claude aprobó el código y las pruebas; el
  responsable confirmó que la APK abre el menú nativo de compartir en Android.
  Sin backend ni nuevas dependencias.
  Posterior (antes de la primera empresa cliente, junto con T-605): correo automático
  con Edge Function y SMTP propio.

- ID: D-003 (V1 · V2 · V3 · V4) — V1, V2 y V3 aprobadas por Claude el 23/09/2026
  Tarea: sistema visual y rediseño según `docs/VISUAL_SYSTEM.md` (copia oficial en el
  worktree principal): color por fase, ícono por estado, escalas de tipografía, radios e
  íconos, componentes base únicos, progreso e historial nuevos, Inicio, movimiento y
  vibración. No cambia backend, navegación ni reglas.
  Decisiones del responsable (23/09/2026): Plus Jakarta Sans
  (`@expo-google-fonts/plus-jakarta-sans`) y `expo-haptics` aprobadas como dependencias
  nuevas (`npx expo install`); sin cambios en `app.json` (fuentes con `useFonts`).
  Implementa: Codex · Revisa: Claude · Rama: agent/codex/mvp-client
  Depende de: cerrar D-002/T-701–T-705. Entregas V1→V4 con revisión de Claude entre cada una.
  Estado: V1, V2 y V3 aprobadas; V4 aprobada con cambios por Claude.
  Codex atendió los hallazgos 1 a 3 y las sugerencias 4 a 7 el 23/09/2026.
  Commit `49d5b96` autorizado por Vincent y creado el 23/09/2026; sin push ni merge.
  V5 implementada por Codex el 24/09/2026 para pulido tras la prueba en Android,
  según `docs/VISUAL_SYSTEM.md` sección 8; aprobada en revisión de código por
  Claude. Commit `6823166` creado con autorización de Vincent, sin push ni merge.
  APK `preview` en EAS (`94f3f3b9-1955-4556-b27c-75d963cdda6b`) terminada;
  pendiente prueba visual en Android físico antes de aprobar V5 por completo.
  V6 implementada en la rama cliente; revisión de código aprobada por Claude y
  sugerencia 2 atendida. Commits `4935373` (dependencias) y `83eace2` (V6), sin push,
  merge ni nueva APK. Sigue pendiente la prueba visual de 9.5 y la prueba real de
  Google en Android con la nueva versión.
  Codex corrigió los tres hallazgos importantes de V2 y las sugerencias de V3.

- ID: T-901 · T-902 · T-903
  Tarea: backend de fotos (T-901), reporte y firmas (T-902) y avisos con push (T-903)
  según `docs/BUSINESS_RULES.md` 7 a 9 (decisiones del responsable del 23/09/2026).
  Implementa: Claude · Revisa: Codex · Rama: agent/claude/reports-backend (desde
  agent/claude/access-and-home)
  Archivos: migraciones `20260923100000_create_case_photos`,
  `20260923100100_create_case_reports`, `20260923100200_create_notifications`;
  `supabase/tests/00_supabase_stub.sql` (esquema storage) y `12_reports_test.sql`.
  Contratos: C-007, C-008 y C-009 aplicados en remoto (23/09/2026).
  Estado: Aprobado en revisión estática. Corrección final de C-007 en `bacd884`,
  publicada en `origin/agent/claude/reports-backend` (23/09/2026).
- ID: T-904 · T-905
  Tarea: Edge Functions `generate-report-pdf`, `send-push` y `cleanup-photos`, y migración
  `20260923110000_create_push_dispatch` (RPC solo para service_role y vencimiento de
  reservas de más de 23 h). Ver `docs/EDGE_FUNCTIONS.md`.
  Implementa: Claude · Revisa: Codex · Rama: agent/claude/report-functions (desde
  agent/claude/reports-backend). Estado: T-904 y T-905 aprobados en revisión estática;
  commit `3ff3ff3` publicado, CI completo aprobado. Migraciones aplicadas y funciones
  desplegadas, `CRON_SECRET` configurado y tareas programadas activas (23/09/2026).
- ID: T-906 · T-907 · T-908
  Tarea: cliente de fotos (compresión con `expo-image-manipulator` a 1600 px y miniatura
  de 400 px, cola de subida con reintentos, `expo-image` con caché), reporte (borrador,
  pantalla de revisión antes de firmar, firma con `react-native-svg` en lienzo de 0 a
  1000, validar, aprobar, devolver) y avisos (registro de token con `expo-notifications`,
  campana con lista y marcar como leído). Dependencias aprobadas por el responsable:
  `expo-image-manipulator`, `react-native-svg`, `expo-image`. Implementa: Codex ·
  Revisa: Claude. Depende de: C-007 a C-009 aprobados y D-003 V1. Estado:
  T-906 y T-907 Aprobados en revisión estática (Claude, 24/09/2026; sin commit);
  T-908 Pendiente. Alcance actual: `src/features/photos/`, `src/features/reports/`,
  detalle y navegación de solicitudes, formulario de tipos de servicio, pruebas y
  tres dependencias nativas aprobadas. Sin backend, T-908, APK ni push.

## Contratos

Contratos de backend aprobados que el frontend puede usar. Plantilla:

```text
### C-000 — <nombre> (tarea T-000, migración <archivo>)

Tablas y columnas:
RPC (parámetros → retorno):
Errores esperados (mensaje o código):
Permisos por rol:
Estado: Propuesto | Aprobado (se desarrolla contra él) | Aplicado en remoto (se prueba integrado)
```

Rama de todos los contratos: `agent/claude/business-model-backend`. Los mensajes de error
son los textos exactos que devuelve PostgreSQL en `error.message`.

### C-001 — Empresas, perfiles y miembros (T-101, T-103; migraciones 200000 y 200200)

Tablas y columnas:

- `organizations`: `id`, `name`, `is_active`, `created_at`, `updated_at`. Lectura: la
  propia empresa. `update (name)`: administrador.
- `profiles`: se agrega `organization_id` (nulo = sin empresa). Lectura: el propio perfil
  y todos los perfiles de la misma empresa. `update (full_name, avatar_url)`: el propio
  usuario. `update (role, area_id)`: solo administrador (mejor con la RPC).
- `areas`: se agregan `organization_id` (lo fija el servidor) y `kind`
  (`solicitante` | `tecnica`). `insert (name, description, kind)` y
  `update (name, description, kind, is_active)`: administrador.
- `categories` (tipos de servicio): se agrega `organization_id` (lo fija el servidor).
  Solo en áreas técnicas. `insert (area_id, name, description)` y
  `update (area_id, name, description, is_active)`: administrador.
- Enum `app_role`: `administrador`, `jefe_area`, `tecnico`, `auditor`, `solicitante`
  (antes `visualizador`).

RPC:

- `set_member_access(target_user_id uuid, new_role app_role, new_area_id uuid) → void`.

Errores esperados: `Acceso denegado`, `Usuario no encontrado`, `Área no disponible`,
`Este rol requiere un área asignada`, `Un técnico debe pertenecer a un área técnica`,
`La empresa debe conservar al menos un administrador`,
`Solo un administrador de la empresa puede cambiar el rol o el área`,
`No puedes cambiar el tipo de un área que tiene tipos de servicio` (o `técnicos`, o
`solicitudes`), `Los tipos de servicio solo pertenecen a áreas técnicas`.

Estado: Aplicado en remoto (23/09/2026)

### C-002 — Invitaciones (T-102; migración 200300)

Tabla `organization_invitations`: `id`, `organization_id`, `email`, `role`, `area_id`,
`invited_by`, `created_at`, `accepted_at`, `accepted_by`, `revoked_at`.

- Lectura, `insert (email, role, area_id)` y `update (revoked_at)`: administrador de la
  empresa. El correo se normaliza a minúsculas. Para revocar, enviar
  `revoked_at = now()` (el servidor fija la hora).
- Si la persona ya tiene una cuenta verificada, queda vinculada al crear la invitación.
  Si no, se vincula al registrarse con correo verificado (Google) o al confirmar su correo.

RPC: `accept_pending_invitation() → boolean` (true si vinculó). Llamarla cuando el perfil
no tenga empresa.

Errores esperados: `La invitación ya no está pendiente`,
`Solo puedes revocar la invitación`, errores de rol y área de C-001, y
`duplicate key` si ya hay una invitación pendiente para ese correo en la empresa.

Estado: Aplicado en remoto (23/09/2026)

### C-003 — Solicitudes y transiciones (T-201; migración 200400)

Tabla `cases`: `id`, `organization_id`, `case_number`, `title`, `description`,
`location`, `priority`, `status`, `category_id`, `requesting_area_id`, `target_area_id`,
`created_by`, `assigned_to`, `accepted_at`, `assigned_at`, `started_at`, `closed_at`,
`status_changed_at`, `created_at`, `updated_at`.

- Relaciones para leer nombres: `cases_created_by_fkey`, `cases_assigned_to_fkey`,
  `cases_category_id_fkey`, `cases_requesting_area_id_fkey`, `cases_target_area_id_fkey`.
- `insert (title, description, location, priority, category_id)`: cualquier rol excepto
  auditor, con área asignada. El servidor fija número, estado, áreas y creador.
- `update (title, description, location, priority, category_id)`: el creador en
  `solicitado`; el jefe del área destino y el administrador mientras no esté cerrada. Si
  no tiene permiso, la actualización afecta 0 filas (no hay error).
- Límites: título de 5 a 120, descripción de 10 a 2000, ubicación de 3 a 180 (tras
  recortar espacios).
- Estados (`case_status`): `solicitado`, `aceptado`, `rechazado`, `cancelado`, `asignado`,
  `en_ejecucion`, `en_espera`, `reporte_enviado`, `validado`, `aprobado`. Finales:
  `rechazado`, `cancelado`, `aprobado`.

Tabla `case_events` (solo lectura): `id`, `case_id`, `action`, `from_status`,
`to_status`, `actor_id`, `actor_role`, `assignee_id`, `comment`, `created_at`.

RPC `transition_case(target_case_id uuid, requested_action case_action,
action_comment text default null, new_assignee_id uuid default null) → cases`:

- `aceptar`: `solicitado` → `aceptado`. Jefe del área destino o administrador.
- `rechazar`: `solicitado` → `rechazado`. Jefe del área destino o administrador. Motivo
  obligatorio.
- `cancelar`: `solicitado` → `cancelado`. Creador, jefe del área solicitante o
  administrador.
- `asignar`: `aceptado` o `asignado` → `asignado`. Jefe del área destino o administrador.
  `new_assignee_id` debe ser técnico o jefe del área destino. Si ya estaba asignada se
  registra como `reasignar`.
- `iniciar`: `asignado` → `en_ejecucion`. Solo el asignado.
- `pausar`: `en_ejecucion` → `en_espera`. Asignado o jefe del área destino. Motivo
  obligatorio.
- `reanudar`: `en_espera` → `en_ejecucion`. Asignado o jefe del área destino.
- Acciones del reporte: responden `Acción no disponible` hasta la fase 4.

Errores esperados: `Acceso denegado`, `Solicitud no encontrada`,
`El comentario debe tener entre 3 y 500 caracteres`, `Indica el motivo del rechazo`,
`Indica el motivo de la pausa`, `Selecciona un técnico`,
`El técnico debe pertenecer al área técnica de la solicitud`,
`La solicitud ya está asignada a esa persona`, `Solo se puede … ` (estado inválido),
`Solo el … puede …` (rol inválido), `Tu cuenta no está vinculada a una empresa`,
`El rol auditor no puede crear solicitudes`,
`Necesitas un área asignada para crear solicitudes`,
`Selecciona un tipo de servicio disponible`, `La solicitud está cerrada`,
`Solo puedes cambiar el tipo de servicio mientras la solicitud está pendiente`.

Visibilidad: administrador y auditor ven todo; los demás ven lo que crearon, lo de su área
solicitante y, si son técnicos o jefes, lo de su área destino.

Estado: Aplicado en remoto (23/09/2026)

### C-004 — Recursos (T-301; migración 200500)

- `resources`: `id`, `kind` (`material` | `herramienta` | `equipo`), `name`,
  `description`, `unit` (obligatoria para material), `unit_cost`, `is_active`.
  Lectura: activos para todos; también inactivos para el administrador.
  `insert (kind, name, description, unit, unit_cost)` y `update (…, is_active)`:
  administrador.
- `case_resource_usages`: `id`, `case_id`, `kind` (`recurso` | `mano_de_obra`),
  `resource_id`, `resource_kind`, `resource_name`, `unit`, `unit_cost` (copias hechas por
  el servidor), `quantity`, `hours`, `technician_id`, `notes`, `registered_by`,
  `created_at`, `updated_at`.
  - Lectura: quien puede leer la solicitud.
  - `insert (case_id, kind, resource_id, quantity, hours, technician_id, notes)`,
    `update (quantity, hours, notes)` y `delete`: técnico asignado o jefe del área
    destino, solo con la solicitud en `en_ejecucion` o `en_espera`.
  - Material: `quantity` obligatoria. Herramienta o equipo: `hours` opcional. Mano de
    obra: `technician_id` del área destino y `hours` obligatorias.
  - Límites: cantidad mayor que 0 y hasta 1 000 000; horas mayores que 0 y hasta 1000;
    notas de 3 a 300.

Errores esperados: `Recurso no disponible`, `Indica la cantidad de material utilizada`,
`Indica las horas trabajadas`,
`El técnico debe pertenecer al área técnica de la solicitud`,
`Solo puedes corregir cantidad, horas y notas`, `new row violates row-level security`
(fuera de estado o sin permiso).

Estado: Aplicado en remoto (23/09/2026)

### C-005 — Solicitudes de acceso con código de empresa (T-801; migración 20260923020000)

- `organizations.join_code` (`XXXX-XXXX`) no se puede leer desde el cliente: la tabla solo
  permite `select (id, name, is_active, created_at, updated_at)`. No usar `select('*')`
  sobre `organizations`.
- RPC de administrador: `get_organization_join_code() → text`,
  `regenerate_organization_join_code() → text`,
  `approve_access_request(target_request_id uuid, new_role app_role, new_area_id uuid) →
void`, `reject_access_request(target_request_id uuid, note text default null) → void`.
- RPC de quien no tiene empresa: `request_organization_access(access_code text) → jsonb`
  con `{status, organization_name}`; `status` es `pendiente`, `codigo_invalido` o
  `demasiados_intentos`. Acepta minúsculas y sin guion. `get_my_access_request()` →
  última solicitud (`id, organization_name, status, decision_note, created_at,
decided_at`) o ninguna fila. `cancel_my_access_request() → void`.
- Tabla `organization_access_requests` (solo lectura): `id, organization_id, user_id,
email, full_name, status (pendiente|aprobada|rechazada|cancelada), decided_by,
decided_at, decision_note, assigned_role, assigned_area_id, created_at`. El
  administrador ve las de su empresa; cada persona ve las suyas.
- Errores: `Acceso denegado`, `Tu cuenta ya pertenece a una empresa`,
  `Confirma tu correo antes de solicitar acceso`, `Ya tienes una solicitud pendiente`,
  `No tienes una solicitud pendiente`, `Solicitud de acceso no encontrada`,
  `La solicitud de acceso ya no está pendiente`, `Esta persona ya pertenece a una
empresa`, `El motivo debe tener entre 3 y 300 caracteres`,
  `Solicitud de acceso no encontrada o ya resuelta`, y los de rol y área de C-001.
- Cuando una persona queda vinculada a una empresa por cualquier vía (aprobación,
  invitación o ajuste del servidor), sus solicitudes pendientes pasan a `cancelada`
  (trigger `profiles_cancel_access_requests`). Aprobar a alguien que ya tiene empresa
  lanza `Esta persona ya pertenece a una empresa` sin cambiar nada.

Estado: Aplicado en remoto (23/09/2026)

### C-006 — Resumen del Inicio por rol (T-801; migración 20260923020100)

`get_home_summary() → jsonb` (respeta RLS; error `Tu cuenta no está vinculada a una
empresa` sin empresa):

- `role`, `has_area`, `area_kind` (`solicitante` | `tecnica` | null).
- `cases`: `activas`, `solicitado`, `aceptado`, `asignado`, `en_ejecucion`, `en_espera`,
  `en_revision`, `cerradas_30_dias`, `alta_prioridad_activas` (sobre lo visible).
- `mine`: `solicitudes_activas`, `trabajos_por_iniciar`, `trabajos_en_ejecucion`,
  `trabajos_en_espera`.
- `inbox`: `por_aceptar`, `sin_asignar` (jefe del área técnica o administrador).
- `admin` (null si no es administrador): `usuarios_sin_area`, `usuarios_sin_nombre`,
  `solicitudes_acceso_pendientes`, `invitaciones_pendientes`, `tipos_servicio_activos`,
  `recursos_activos`, `areas_tecnicas_sin_jefe` (lista de nombres),
  `areas_tecnicas_sin_tecnico` (lista de nombres).

Estado: Aplicado en remoto (23/09/2026)

### C-007 — Fotos de antes y después (T-901; migración 20260923100000)

- Bucket privado `case-media` (2 MB por archivo; `image/jpeg` o `image/webp`). Ruta:
  `<empresa>/<solicitud>/<foto>/full.jpg` y `.../thumb.jpg`.
- `reserve_case_photo(target_case_id uuid, photo_kind photo_kind) → jsonb`
  `{id, bucket, image_path, thumb_path}`. `photo_kind`: `antes` | `despues`.
- Subir los dos archivos con `supabase.storage.from('case-media').upload(ruta, archivo,
{ contentType: 'image/jpeg', upsert: false })`. Solo quien reservó puede subir.
- `confirm_case_photo(target_photo_id uuid) → case_photos` (idempotente).
- Borrar: `storage.remove([image_path, thumb_path])` y luego
  `delete_case_photo(target_photo_id uuid) → void`.
- Tabla `case_photos` (lectura): `id, organization_id, case_id, kind, image_path,
thumb_path, size_bytes, uploaded_by, created_at, confirmed_at`. Los demás solo ven las
  confirmadas; quien subió ve también sus reservas.
- Descarga: `createSignedUrl(thumb_path, 300)` en listas y detalle; la imagen completa al
  tocarla.
- Quién: técnico asignado o jefe del área técnica. Antes: `asignado`, `en_ejecucion`,
  `en_espera`. Después: `en_ejecucion`, `en_espera`.
- `categories.min_after_photos` (0 a 3, editable por el administrador).
- Errores: `No puedes agregar fotos de antes|de después a esta solicitud`,
  `Solo se permiten 3 fotos de antes|de después`, `La empresa alcanzó su límite de
almacenamiento`, `Foto no encontrada`, `Sube la foto y su miniatura antes de
confirmar`, `La solicitud ya no admite cambios en sus fotos`, `Elimina primero los
archivos de la foto`, `La reserva de la foto venció; vuelve a subirla`.

Estado: Aplicado en remoto (23/09/2026; incluye 20260923100300, 100600 y 110000)

### C-008 — Reporte de cierre y firmas (T-902; migración 20260923100100)

- Borrador `case_reports`: insertar `(case_id, diagnosis, work_done, cause,
observations)` y actualizar esos campos. Técnico asignado o jefe técnico en
  `en_ejecucion` o `en_espera`. Límites: 2000, 4000, 1000 y 2000 caracteres.
- `submit_case_report(target_case_id uuid, signature_stroke text, accepts_terms boolean)
→ case_report_versions`. Solo el técnico asignado, en `en_ejecucion`. Exige
  diagnóstico y trabajo realizado de 10 caracteres o más y `min_after_photos` fotos de
  después confirmadas.
- `validate_case_report(...) → case_signatures`: jefe del área técnica, en
  `reporte_enviado`. Si ningún jefe del área distinto del técnico asignado puede
  validar, lo hace un administrador (queda en el comentario del evento
  `validar_reporte` y en `signer_role`); lo mismo aplica a `return_case_report`
  (migración 20260923100400).
- `approve_case_report(...) → case_signatures`: jefe del área solicitante, en
  `validado`; el administrador solo si esa área no tiene jefe.
- `return_case_report(target_case_id uuid, return_reason text) → cases`: jefe técnico en
  `reporte_enviado`; jefe solicitante (o administrador suplente) en `validado`. Motivo
  de 3 a 500 caracteres.
- `signature_stroke`: datos de trazado SVG en un lienzo de 0 a 1000 (`M`, `L`, `Q`, `C`,
  `Z`, números, espacios, comas, puntos y guiones), de 10 a 20 000 caracteres.
- Lectura: `case_report_versions` (`id, case_id, version_number, status
(vigente|devuelta), content jsonb, content_hash, created_by, created_at, returned_by,
returned_at, return_reason, pdf_path, pdf_size_bytes, pdf_sha256, pdf_generated_at`) y
  `case_signatures` (`version_id, signature_type, signer_id, signer_role, signed_at,
content_hash, stroke_path, consent_text, ip_address, user_agent, signature_hash`).
- `verify_report_code(verification_code text)` → `case_number, version_number,
version_status, content_hash, signatures` (12 a 64 caracteres hexadecimales).
- Errores: `Solo se puede enviar el reporte de un trabajo en ejecución`, `Solo el técnico
asignado puede firmar y enviar el reporte`, `Completa el diagnóstico y el trabajo
realizado (mínimo 10 caracteres cada uno)`, `Este tipo de servicio requiere al menos N
foto(s) de después`, `Debes aceptar el texto de consentimiento para firmar`, `Dibuja tu
firma antes de continuar`, `Ya firmaste esta versión del reporte`, `No puedes validar un trabajo que ejecutaste`,
  `No puedes devolver un trabajo que ejecutaste`, `Solo se puede
validar un reporte enviado`, `Solo el jefe del área técnica puede validar el reporte`,
  `Solo se puede aprobar un reporte validado`, `Solo el jefe del área solicitante puede
aprobar el reporte`, `Indica las observaciones para devolver el reporte (entre 3 y 500
caracteres)`, `Solo se puede devolver un reporte enviado o validado`, `No puedes
devolver este reporte`, `Solicitud no encontrada`.

Estado: Aplicado en remoto (23/09/2026; incluye 20260923100400 y 100500)

### C-009 — Avisos, push e Inicio (T-903; migración 20260923100200)

- `register_push_token(push_token text, device_platform text)` (`android` | `ios`;
  token `ExponentPushToken[...]`) y `unregister_push_token(push_token text)` al cerrar
  sesión.
- `notifications` (lectura, solo las propias): `id, case_id, event_id, action, title,
body, created_at, read_at`. `mark_notifications_read(notification_ids bigint[] default
null) → integer` (null = todas).
- `get_home_summary()` agrega `notificaciones_sin_leer`, `inbox.reportes_por_validar`,
  `inbox.reportes_por_aprobar` y `admin.almacenamiento` `{usado_bytes, cuota_bytes,
porcentaje}`. El resto de C-006 no cambia.

Estado: Aplicado en remoto (23/09/2026; incluye 20260923110000 y 110100). El envío push
funciona cuando se programe `send-push`.

## Contexto conocido

- Este archivo tiene una **sola copia oficial**: la del worktree principal del
  repositorio en cada equipo (la primera línea de `git worktree list`), en
  `feature/stage-2-improvements`. Desde otros worktrees se edita esa copia, nunca la de la
  rama de trabajo (ver `AGENTS.md`, sección 3.2).
- T-002 alineó en la rama de backend las versiones de migraciones antiguas con el remoto;
  `20260727000000` ya está registrado en el historial remoto. No ejecutar `db push`,
  `db reset` ni `migration repair` sin autorización.
- Los cambios de solo CRLF de Windows se verificaron y descartaron con autorización del
  responsable. `.gitattributes` de T-001 evita que reaparezcan.
- Pruebas de base de datos: `DATABASE_URL=postgres://… bash scripts/test-supabase-migrations.sh`
  con un PostgreSQL 16 local. Nunca contra el proyecto remoto.
- ESLint falla en entornos Linux que usan el `node_modules` instalado en Windows (binario
  nativo de `unrs-resolver`). Ejecutar el lint en Windows o después de `npm ci` en el
  propio entorno.
- Aviso de seguridad de Supabase: la protección contra contraseñas filtradas está
  desactivada. La activa el responsable desde el panel de Auth.
- Último estado verificado (22/09/2026): en `agent/codex/mvp-client`, typecheck, ESLint,
  Prettier, 117 pruebas y Expo Doctor 21/21 correctos; cobertura 97,05 % de líneas y
  87,31 % de ramas sobre los archivos medidos. Pendiente integración remota y prueba
  nativa de Android (paso 3 del responsable).

## Registro

Agrega las entradas nuevas arriba. Plantilla:

```text
### AAAA-MM-DD — T-000 — <Agente> — <implementación | revisión>

Resumen:
Archivos:
Validaciones:
Riesgos y pendientes:
Para el otro agente:
Hallazgos (solo revisión): [bloqueante] ... / [importante] ... / [sugerencia] ...
```

### 2026-09-27 — `agent/codex/qa-fixes` (`bbb4aa9`…`6cc9056`) — Claude — revisión

Resultado: **Aprobado.** Los seis commits cubren los hallazgos 2, 3 y 6 y E1 a E6:

- **`testTimeout: 15000`.**
- **Google:** `prompt: 'select_account'`, con prueba.
- **Consultas:**
  - `focusManager` con `AppState` y `onlineManager` con NetInfo, que se limpian al
    desmontar;
  - `shouldRetryQuery` no reintenta errores 4xx, 22/23/28, 42501, PGRST116/301 ni
    mensajes de permisos;
  - «jalar para actualizar» en el detalle invalida la solicitud, el reporte y las fotos.
- **Fotos:**
  - `subscribePendingPhotos` refresca la `PhotoGrid` cuando cambia la cola, con un
    contador de versión contra lecturas viejas;
  - sin conexión muestra «Sin conexión; se subirá al reconectar».
- **Acciones:** el error se limpia al cambiar de acción; la ubicación corta muestra
  «Escribe al menos 3 caracteres».
- **Progreso:** muestra «Validación» o «Aprobación» según el estado; al navegar desde
  el Inicio se usa `initial: false`, así que aparece la flecha de regreso.

Observación, sin cambio necesario: con `onlineManager`, las mutaciones sin conexión
quedan en pausa y se envían al reconectar, en lugar de fallar. Es el comportamiento
esperado, pero conviene verlo en la prueba en Android junto con el aviso sin conexión
de V7.
V7 sigue en curso en la misma rama.

### 2026-09-27 — Q-002 — Codex — implementación para revisión

Resumen: correcciones de QA 2, 3 y 6 y E1–E6, sin E7 ni T-908, en
`agent/codex/qa-fixes` desde `94a9468`. Commits por tema: `bbb4aa9` (Jest),
`6096e16` (selección de cuenta Google), `1a86376` (AppState/NetInfo, reintentos y
recarga del detalle), `cc67b48` (cola de fotos), `cfcb7ba` (comentario y ubicación)
y `6cc9056` (regreso desde Inicio y progreso). No hubo merge ni despliegue.
Validaciones: `npm run verify` correcto: TypeScript, ESLint, Prettier, 240 pruebas
en 59 suites y Expo Doctor 21/21. Pruebas nuevas para cada corrección.
Riesgos y pendientes: probar en teléfono físico la reconexión, subida de fotos y
selección de cuenta Google; revisión de Claude. La autorización de V7 y E7 llegó
después de esta entrega y se registra en la entrada siguiente. T-908 sigue fuera.
Para el otro agente: Claude, revisar los seis commits y sus pruebas antes de integrar.

### 2026-09-27 — V7 — Codex — implementación para revisión

Resumen: ajustes de la sección 11 de `docs/VISUAL_SYSTEM.md` en la misma rama de QA.
Se compactaron pantallas de solicitudes y reportes, el historial usa verbos propios,
las señales de revisión son moradas, se oculta la campana sin pantalla y se confirma
el cierre de sesión. «Editar» se oculta desde `reporte_enviado`.
Archivos: pantallas de solicitudes, reportes, fotos, Inicio y perfil; componentes
`SegmentedControl`, `OfflineBanner`, metadatos de acciones y pruebas. También se
incluyen las dos actualizaciones documentales autorizadas en un commit aparte.
Commits: `50e27d7` (pantallas y controles), `83030ad` (estados, historial y red)
y `2a448dc` (confirmación al cerrar sesión); documentación en commit separado.
Validaciones: `npm run verify` correcto: TypeScript, ESLint, Prettier, 248 pruebas
en 62 suites y Expo Doctor 21/21. `npm run test:coverage` correcto: 94,67 %
de líneas y 83,91 % de ramas globales.
Riesgos y pendientes: revisión visual en Android de pantallas de 360 dp, barra fija y
hoja de firma; T-908 no implementada. Sin merge ni despliegue.
Para el otro agente: Claude, revisar especialmente las medidas táctiles y el contraste
de los estados morados y de la franja sin conexión.

### 2026-09-26 — V7 — Claude — especificación visual para `agent/codex/qa-fixes`

Vincent aprueba sumar a las correcciones del QA los ajustes visuales V7, descritos en
`docs/VISUAL_SYSTEM.md`, sección 11. Incluye:

- la acción flotante que tapa la lista;
- la barra fija del detalle;
- la sección Reporte más compacta;
- los títulos repetidos;
- la hoja de firma;
- las pestañas de filtro;
- íconos en lugar de ✓, ○, ☐ y ☑;
- el color morado de revisión;
- los verbos del reporte en el historial;
- la campana sin punto rojo;
- el aviso sin conexión;
- la confirmación al cerrar sesión;
- ocultar «Editar» desde `reporte_enviado` (E7, decidido por Vincent).

Para el otro agente: Codex, todo va en la misma rama `agent/codex/qa-fixes`, en commits
por tema. Corre `npm run verify`, haz push de la rama y avisa para revisión. Sin merge ni
despliegue.

### 2026-09-26 — Correcciones del QA — Vincent — luz verde

Vincent autoriza que Codex corrija los hallazgos de prioridad media y baja del QA, en
una rama nueva `agent/codex/qa-fixes` creada desde `feature/stage-2-improvements`
(`94a9468`). El detalle está en las entradas «QA en emulador — resultado» y «Google no
deja cambiar de cuenta».

- **Hallazgo 2:** `testTimeout` global de 15 s en Jest.
- **Hallazgos 3 y 6:**
  - `focusManager` con `AppState` y `onlineManager` con NetInfo;
  - no reintentar errores 4xx ni de permisos;
  - «jalar para actualizar» en el detalle.
- **E1:** `prompt: 'select_account'` en el inicio de sesión con Google, con prueba.
- **E2:** refrescar la cola de `PhotoGrid` cuando termina la reanudación en segundo
  plano; mensaje «Sin conexión; se subirá al reconectar».
- **E3 a E6:** error del comentario en Acciones, mensaje de ubicación corta, flecha de
  regreso al abrir desde el Inicio, y texto del paso siguiente en el progreso.
- **E7** (ocultar «Editar» con el reporte enviado): queda fuera hasta que Vincent
  decida.
- Commits pequeños por tema, `npm run verify`, push de la rama y aviso para revisión.
  Sin merge ni despliegue. T-908 (avisos) va aparte.

### 2026-09-26 — Integración — Claude — verificación

Verificado en `origin/feature/stage-2-improvements` (`94a9468`):

- incluye `agent/claude/cleanup-reports-backup`, `agent/claude/pdf-assigned-date` y
  `agent/codex/mvp-client`, las tres también publicadas en GitHub;
- tiene las 30 migraciones, iguales a las aplicadas en Supabase;
- no incluye `Claude outputs/`, `cleanup.bundle` ni `backups/`, este último
  ignorado en `.prettierignore` según `f296287`.

Hallazgo 1 del QA (prioridad alta): **resuelto**.

### 2026-09-26 — Integración — Codex — completada

Resumen: con autorización de Vincent, publiqué las ramas
`agent/claude/pdf-assigned-date` (`74f8370`),
`agent/claude/cleanup-reports-backup` (`4a101a0`) y `agent/codex/mvp-client`
(`10636ce`). Registré la documentación en `10918d2` e integré backend (`bd63108`)
y cliente (`46a4943`) en `feature/stage-2-improvements` mediante merges `--no-ff`. El ajuste de
formato del handoff y la exclusión del respaldo local de Prettier quedaron en un
commit aparte (`f296287`).
Archivos: documentación aprobada, ramas integradas, `.prettierignore`; no se incluyeron
`Claude outputs/`, `cleanup.bundle` ni el respaldo JSON local.
Validaciones: `npm install` aplicó los parches; `npm run verify` pasó con 53 suites,
229 pruebas y Expo Doctor 21/21. El CI de la rama integrada aprobó «Calidad y pruebas»,
«Migraciones y reglas de Supabase» y «Edge Functions»:
https://github.com/Vincentxox/gestion-casos/actions/runs/36264591613
Riesgos y pendientes: `npm install` notificó 16 avisos de auditoría (15 moderados, 1
alto), sin cambios automáticos de dependencias. No se hizo merge a `main` ni despliegue.
Para el otro agente: Claude, confirma el cierre de la prioridad alta del QA y revisa
los avisos de dependencias en una tarea separada si Vincent lo autoriza.

### 2026-09-26 — Integración — Claude — plan verificado (hallazgo 1 del QA, prioridad alta)

Vincent pide resolver la prioridad alta: respaldar el trabajo en GitHub e integrarlo en
`feature/stage-2-improvements`.

**Estado actual:**

- `agent/codex/mvp-client` (`10636ce`) y `agent/claude/cleanup-reports-backup`
  (`4a101a0`) salen de `cd40cd8` (`origin/feature/stage-2-improvements`).
- La rama de backend contiene toda la cadena de Claude, hasta `74f8370` y `4a101a0`.
- Ninguna de las dos está en GitHub en su última versión.
- `feature/stage-2-improvements` local tiene 2 commits de documentación sin push
  (`907ef18`, `3961f75`).
- En la carpeta principal hay cambios sin commit: `docs/AGENT_HANDOFF.md`, y
  `docs/REPORTS_CLIENT.md` y `docs/VISUAL_SYSTEM.md` sin seguimiento.

**Prueba de integración (Claude, en una copia aparte):** sobre `3961f75`, merge
`--no-ff` de `cleanup-reports-backup` y luego de `mvp-client`.

- Sin conflictos.
- La app de Codex no toca `supabase/`, y el backend solo cambia en el cliente
  `tsconfig.json`, `eslint.config.js`, `.gitattributes` y `ci.yml`.
- Sobre el resultado pasan las 10 suites SQL (261 comprobaciones) y las 21 pruebas de
  Edge Functions.
- Falta `npm run verify` sobre el resultado; esa máquina no tiene `node_modules`.

**Pasos para Codex, con la autorización de Vincent:**

1. En la carpeta principal, sobre `feature/stage-2-improvements`, hacer un commit con
   `docs/AGENT_HANDOFF.md`, `docs/REPORTS_CLIENT.md` y `docs/VISUAL_SYSTEM.md`
   (`docs: record QA, reports client spec and visual system`).
   - No incluir `Claude outputs/` ni `cleanup.bundle`, que son archivos temporales.
2. Push de respaldo:
   `git push -u origin agent/claude/pdf-assigned-date agent/claude/cleanup-reports-backup agent/codex/mvp-client`.
3. `git merge --no-ff agent/claude/cleanup-reports-backup` y después
   `git merge --no-ff agent/codex/mvp-client`, ambos en
   `feature/stage-2-improvements`.
4. `npm install`, `npm run verify` y
   `DATABASE_URL=… bash scripts/test-supabase-migrations.sh` (esto último si hay
   Postgres local; si no, lo cubre CI).
5. `git push origin feature/stage-2-improvements` y esperar a que CI pase los tres
   trabajos: app, base de datos y Edge Functions.
6. No hacer merge a `main` ni desplegar: lo remoto ya está al día (30 migraciones y
   `generate-report-pdf` v11).

### 2026-09-26 — QA en emulador — Claude — resultado

El flujo completo funcionó en el emulador con CAS-2026-00005:

- crear, aceptar y asignar;
- foto de antes, iniciar el trabajo y borrador;
- foto de después en modo avión, que se subió sola al reconectar;
- recursos;
- firmar, devolver, reenviar la versión 2, validar y aprobar como administrador
  suplente;
- descargar el PDF, con 5 fechas incluida la de asignación;
- compartir el PDF, que envía el archivo `Reporte-CAS-2026-00005-v2.pdf`.

Los avisos del Inicio «por validar» y «por aprobar» y sus listas filtradas
funcionan. El detalle completo está en el documento «QA de Nexo Casos».
Correcciones para Codex (un commit, sin push):

- **E1** (entrada anterior): `prompt: 'select_account'` en el inicio con Google.
- **E2:** después de que una foto pendiente se sube sola, la `PhotoGrid` de
  `CaseReportScreen` sigue mostrando la copia «Error · Reintentar» hasta volver a
  montarse. Hay que refrescar la cola local cuando termina la reanudación en segundo
  plano. Sin conexión, mostrar «Sin conexión; se subirá al reconectar» en lugar de «No
  fue posible subir la foto».
- **E3:** en Acciones, al cambiar de Rechazar a Aceptar hay que limpiar el error del
  comentario (volver a validar o reiniciar los errores).
- **E4:** si la ubicación tiene menos de 3 caracteres, el error debe decir «Escribe al
  menos 3 caracteres».
- **E5:** el detalle abierto desde el Inicio no muestra la flecha de regreso.
- **E6:** en `reporte_enviado`, el progreso dice «Siguiente: Aprobada»; debe decir
  «Validación» (y en `validado`, «Aprobación»).
- **E7** (a decidir con Vincent): ocultar «Editar» de la solicitud cuando ya hay un
  reporte enviado.
- Además, los hallazgos 2, 3 y 6 del QA técnico: límite de 15 s en Jest, refresco
  con `focusManager` y `onlineManager`, y no reintentar los errores 4xx.

### 2026-09-26 — QA en emulador — Claude — Google no deja cambiar de cuenta

Vincent no puede entrar con otra cuenta de Google después de cerrar sesión: el
navegador reutiliza la sesión de Google anterior y la app vuelve a entrar con el
técnico. Causa: `signInWithGoogle` (`authService.ts`) no pide elegir cuenta.
Corrección (Codex):

- Agregar `queryParams: { prompt: 'select_account' }` a las `options` de
  `signInWithOAuth`, para que Google muestre siempre el selector de cuenta.
- Agregar una prueba que verifique ese parámetro.

### 2026-09-25 — APK de Compartir PDF — Codex — entrega para prueba

Resumen: corregidos los dos detalles de la revisión de `16b7627` y `05bb890` en
`10636ce` (`agent/codex/mvp-client`): la primera prueba de Inicio dispone de 15 s y
«Preparando PDF…» aparece una sola vez, dentro del botón con indicador de carga, tanto
en el detalle como en la revisión.
Archivos: `Button.tsx`, `HomeScreen.test.tsx`, `sharePdfButtons.test.tsx`,
`ReportSummary.tsx` y `ReportReviewScreen.tsx`.
Validaciones: `npm run verify` correcto: TypeScript, ESLint, Prettier, 229 pruebas y
Expo Doctor 21/21.
APK: compilación Android `preview` iniciada sin esperar a su finalización:
https://expo.dev/accounts/vincentxox/projects/gestion-casos/builds/a23e6ed1-6a1c-402b-b39e-17b855ca734f
Riesgos y pendientes: confirmar que la compilación termine y probar Compartir PDF
en Android, especialmente la recepción del archivo en WhatsApp y Gmail. Sin push,
merge ni despliegue.
Para el otro agente: Claude, revisa el commit `10636ce` y el resultado de la prueba
física cuando Vincent lo comunique.

### 2026-09-25 — `16b7627` y `05bb890` — Claude — revisión

Resultado: **Aprobados**, con dos detalles menores para el siguiente commit (no
bloquean la APK).

- `16b7627`, aviso en el Inicio:
  - Usa `inbox.reportes_por_validar` y `reportes_por_aprobar`; los reportes van
    primero.
  - Cada etiqueta es tocable y abre la lista con estado exacto `reporte_enviado` o
    `validado`.
  - El jefe solicitante también ve el aviso cuando tiene reportes; el administrador
    usa el alcance «todas».
- `05bb890`, Compartir PDF:
  - `expo-sharing` ~57.0.22 es la única dependencia nueva y `app.json` no cambió.
  - Descarga a `Paths.cache` con un nombre seguro y comparte el archivo con
    `application/pdf`; el enlace firmado nunca se comparte.
  - Borra el temporal en `finally` y también si la descarga queda a medias.
  - El botón solo aparece en `aprobado`.

Detalles:

1. **Prueba intermitente:** `HomeScreen.test.tsx` («el aviso por validar abre
   solicitudes en reporte enviado») excedió los 5 s en 1 de 3 ejecuciones en esta
   máquina (5,7 s). Subir el tiempo de esa prueba (`it(..., 15000)`) o simplificar su
   render, para que CI no falle por lentitud.
2. **Texto duplicado:** en `ReportSummary`, mientras se prepara el PDF, el botón dice
   «Preparando PDF…» y además aparece un texto con lo mismo debajo. Basta con el del
   botón.

En la prueba en Android, comprobar que WhatsApp y Gmail reciben el archivo completo.
El temporal se borra cuando `shareAsync` termina, y hay apps que leen el archivo
tarde. Si alguna falla, se deja de borrar en `finally` y solo se reemplaza en la
siguiente descarga (`idempotent: true`).
Siguiente paso: una APK nueva con `05bb890`.
Vincent autoriza la APK (25/09). Codex puede corregir antes los detalles 1 y 2 en un
commit pequeño e incluirlos. Sin push, merge ni despliegue.

### 2026-09-25 — PDF — Codex — compartir archivo en revisión

Resumen: el botón secundario «Compartir PDF» aparece junto a «Descargar PDF» en el
detalle y en la revisión, solo con la solicitud `aprobado` y una versión vigente.
El servicio obtiene la URL temporal con `generateReportPdf`, descarga el archivo a
`Paths.cache` como `Reporte-<número>-v<versión>.pdf` (reemplaza el anterior), llama a
`Sharing.shareAsync` con `application/pdf` y borra el temporal en `finally`.
La URL firmada nunca se pasa al menú de compartir. Muestra «Preparando PDF…» con
indicador; conserva los errores conocidos del servidor y traduce fallos de descarga.
Rama `agent/codex/mvp-client`; commit separado `05bb890`
(`feat: share downloaded report PDFs`). Archivos: `package.json`,
`package-lock.json`, `src/features/reports/reportService.ts`, `ReportSummary.tsx`,
`ReportReviewScreen.tsx` y dos archivos de pruebas.
Validaciones: `npm run verify` aprobado (229 pruebas, Expo Doctor 21/21),
`npm run test:coverage` aprobado (umbrales globales 80 %), `git diff --check`
correcto. `expo-sharing` quedó en `~57.0.22`; el instalador añadió su plugin a
`app.json` automáticamente, pero se retiró porque solo se comparte hacia otras apps
y la decisión de Vincent prohibía cambiar esa configuración.
Riesgos y pendientes: requiere APK nueva para la prueba real en Android; no se generó
en esta entrega. Estado: En revisión. Sin push, merge ni despliegue.
Para el otro agente: Claude, revisa `05bb890`, especialmente la descarga, el borrado
del temporal y la visibilidad de los botones.

### 2026-09-25 — PDF — Vincent — decisión: botón «Compartir PDF» (opción b)

Vincent elige la opción (b) y aprueba la dependencia nueva `expo-sharing`, que
requiere una APK nueva. No cambia el almacenamiento en Supabase: el PDF se sigue
generando una sola vez por versión.
Especificación para Codex:

- Dependencia: `npx expo install expo-sharing` (la versión compatible con SDK 57). No
  requiere cambios en `app.json`. Expo Doctor debe seguir en 21/21.
- `reportService.ts`: agregar `downloadReportPdf(caseId, caseNumber, versionNumber)`.
  - Obtiene la URL con `generateReportPdf`.
  - Descarga con la API nueva de `expo-file-system` (`File`/`Paths`) a `Paths.cache`,
    con el nombre `Reporte-<caseNumber>-v<version>.pdf`. Si ya existe, lo reemplaza.
  - Devuelve el `uri`.
- `shareReportPdf`:
  - Si `Sharing.isAvailableAsync()` es falso, muestra «No es posible compartir en
    este dispositivo».
  - Si no, llama a `Sharing.shareAsync(uri, { mimeType: 'application/pdf',
dialogTitle: 'Compartir reporte', UTI: 'com.adobe.pdf' })`.
  - Al terminar, borra el archivo temporal (`finally`, sin fallar si ya no existe).
- Interfaz: en `ReportSummary` y en `ReportReviewScreen`, cuando el estado es
  `aprobado`, junto a «Descargar PDF» va un botón secundario «Compartir PDF» con el
  icono `share-social-outline`.
  - Mientras prepara el archivo muestra «Preparando PDF…» con indicador de carga.
  - Los errores usan los mismos mensajes de `generateReportPdf`.
  - Si la descarga falla: «No fue posible preparar el PDF. Inténtalo de nuevo.».
- No se comparte el enlace firmado en ningún caso; solo el archivo.
- Pruebas: servicio con mocks de `expo-file-system` y `expo-sharing` (nombre del
  archivo, llamada a `shareAsync` con el `mimeType`, borrado en `finally`, error cuando
  no está disponible) y el botón visible solo en `aprobado`.
- Un commit aparte, sin push, y aviso para revisión. Se puede combinar con el aviso
  del Inicio en la misma APK.

### 2026-09-25 — Hallazgo 1 — Codex — aviso del Inicio en revisión

Resumen: Inicio lee `inbox.reportes_por_validar` e `inbox.reportes_por_aprobar` de
`get_home_summary`. Los avisos se muestran antes de «por aceptar», con el mismo
peso en el destacado y en «Tus números», solo cuando el conteo es mayor que 0.
Cada aviso abre Solicitudes con `exactStatus: reporte_enviado` o `validado` y el
alcance correspondiente al rol. No se calculan permisos del servidor en el cliente.
Rama: `agent/codex/mvp-client`; commit separado `16b7627`
(`feat: surface reports awaiting signature on home`).
Archivos: `src/features/home/homeService.ts`, `homePresentation.ts`,
`HomeScreen.tsx` y dos archivos de pruebas del Inicio.
Validaciones: `npm run verify` aprobado (221 pruebas, Expo Doctor 21/21);
`npm run test:coverage` aprobado (93,99 % de líneas globales); `git diff --check`
correcto. Pruebas de jefe técnico, administrador suplente, ceros, orden de avisos
y pulsación de ambos enlaces. No se hizo prueba en dispositivo.
Estado: En revisión. Sin push, merge ni despliegue.
Para el otro agente: Claude, revisa el diff del commit `16b7627`, en especial el
alcance de la lista y las acciones del destacado.

### 2026-09-25 — Hallazgos 1 y 3 — Claude — limpieza aplicada y especificación del aviso

Decisión de Vincent: hacer el aviso del Inicio (hallazgo 1) y borrar el respaldo
(hallazgo 3). La opción del PDF (hallazgo 2) sigue pendiente de decisión.

**Hallazgo 3, hecho.** Rama `agent/claude/cleanup-reports-backup` (desde
`agent/claude/pdf-assigned-date`), commit `4a101a0`, migración
`20260925100000_drop_reports_backup.sql`
(`drop table if exists private.backup_before_reports_20260923`). Se probó en el
Postgres 16 local y se aplicó en el remoto con autorización, en una transacción junto
con su registro en `schema_migrations`. La tabla ya no existe. Falta el push.

**Hallazgo 1, para Codex.** Aviso de reportes por firmar en el Inicio.

- Datos: `get_home_summary` ya devuelve `inbox.reportes_por_validar` e
  `inbox.reportes_por_aprobar`. El servidor ya aplica la regla (jefe técnico que no
  ejecutó, jefe solicitante o administrador suplente), así que el cliente no calcula
  permisos. Agregar ambos campos al tipo `HomeSummary.inbox` en `homeService.ts`.
- Presentación en `homePresentation.ts`, con pruebas:
  - Si la suma es mayor que 0, mostrar un aviso destacado con el mismo peso que
    «por aceptar»: «n reporte(s) por validar» y/o «n por aprobar», en singular o plural.
  - Si hay solicitudes por aceptar y también reportes, mostrar ambos. Los reportes van
    primero, porque cierran trabajo ya hecho.
  - Tocarlo lleva a la lista de Solicitudes filtrada por estado exacto:
    `reporte_enviado` para validar y `validado` para aprobar. Se reutiliza el mecanismo
    de `getHomeTileTarget` / `exactStatus`.
- En 0 no se muestra nada. Técnico y solicitante siempre reciben 0.
- Pruebas: jefe técnico con 1 por validar; administrador suplente con 1 por aprobar;
  ambos con valor 0; objetivo de navegación de cada aviso.
- Sin cambios de backend ni dependencias. Un commit aparte, sin push, y aviso para
  revisión.

### 2026-09-25 — Revisión general — Claude — hallazgos

Revisión pedida por Vincent: logs de las últimas 24 horas (API, Postgres y
funciones), avisos de Supabase y patrones repetidos en el cliente.
Resultado general:

- Postgres no registró errores en 24 horas.
- Todas las hojas modales, salvo la ya corregida, tienen altura o se ajustan a su
  contenido.
- Los filtros de lista y los estados del reporte están bien cubiertos.
- Los avisos de seguridad son los esperados: las funciones `SECURITY DEFINER` validan
  por dentro, y la protección de contraseñas filtradas requiere el plan Pro.

Hallazgos:

1. **(Codex, funcional) El Inicio no avisa de reportes por firmar.** El resumen del
   servidor ya devuelve `cases.reportes_por_validar` (jefe técnico o administrador
   suplente) y `cases.reportes_por_aprobar` (jefe solicitante o administrador
   suplente), pero `homePresentation.ts` no los usa. Un jefe solo se entera si abre la
   lista. Propuesta: una tarjeta o aviso «n reportes por validar» / «n por aprobar»
   que lleve a la lista filtrada, con la misma prioridad que «por aceptar».
2. **(Decisión de Vincent) El enlace del PDF dura 5 minutos.** En los logs hay 3
   intentos de abrir un enlace ya vencido (respuesta 400), probablemente al compartirlo
   desde el navegador. Opciones: (a) dejarlo así, porque quien tenga acceso vuelve a
   descargarlo desde la app; (b) un botón «Compartir PDF» que descargue el archivo y
   comparta el archivo, no el enlace (requiere `expo-sharing`, una dependencia nueva).
3. **(Claude, limpieza) Tabla de respaldo.** `private.backup_before_reports_20260923`
   se creó antes de las migraciones de reportes y guarda una copia de datos. Ya no se
   necesita; se puede borrar con una migración, con autorización.
4. **(Pendiente conocido) T-908:** sin campana de avisos ni registro del token push.
   Las notificaciones se generan en la base, pero la app aún no las muestra.

### 2026-09-25 — `71ba6a3` — Claude — revisión

Resultado: **Aprobado.**

- La hoja de «Solicitudes de acceso» ahora usa `height: '80%'` y `maxHeight: '90%'`,
  igual que las demás, y tiene una prueba que la abre.
- `orderedReviewDates` sigue el orden creada, aceptada, asignada, iniciada, enviada, y
  las claves desconocidas quedan al final; `Row` omite los valores vacíos.

Sigue la prueba en Android con la APK nueva:

- aprobar una solicitud de acceso con rol y área, y rechazar otra;
- devolver un reporte y reenviarlo;
- subir una foto sin conexión;
- un tipo de servicio con mínimo de fotos mayor que 0;
- iniciar sesión con Google.

Falta el push de `agent/codex/mvp-client` (`71ba6a3`) y de
`agent/claude/pdf-assigned-date` (`74f8370`), con autorización de Vincent.

### 2026-09-25 — Solicitudes de acceso — Codex — corrección y APK nueva

Resumen: la hoja de aprobación/rechazo ahora tiene `height: '80%'` y
`maxHeight: '90%'`, para que el formulario con `flex: 1` tenga altura medible.
La prueba abre una solicitud pendiente, encuentra «Aprobar acceso» y «Rechazar
acceso», y comprueba la altura de la hoja. A petición de Vincent, incluí la
corrección en el mismo commit del orden de fechas mediante amend: el commit local
definitivo es `71ba6a3` (`fix: polish report review and access request sheet`),
que sustituye a `622cef4`.
Archivos de esta corrección: `src/features/admin/screens/AccessRequestsScreen.tsx`
y `src/features/admin/__tests__/AccessRequestsScreen.test.tsx`.
Validaciones: `npm run verify` aprobado, con 215 pruebas y Expo Doctor 21/21.
Nueva build EAS Android `preview`, iniciada con `--no-wait`:
https://expo.dev/accounts/vincentxox/projects/gestion-casos/builds/47c3d7bf-b372-4b6e-9e23-623fbd8b2b8a
La build anterior `56fd2ecc` no contiene esta corrección; probar con la nueva.
Riesgos y pendientes: verificar la hoja en Android y completar las pruebas de
devolución, foto sin conexión, mínimo de fotos mayor que 0 y Google. Sin push,
merge ni despliegue del cliente.
Para el otro agente: Claude, revisa la corrección de la hoja y la prueba.

### 2026-09-25 — Solicitudes de acceso — Claude — error: la hoja sale vacía

Vincent reporta que en «Solicitudes de acceso», al tocar una solicitud, solo aparece
el fondo oscuro, sin rol, área, «Aprobar» ni «Rechazar».
Causa: en `AccessRequestsScreen.tsx`, `styles.sheet` tiene solo `maxHeight: '85%'`, sin
altura. Adentro, `KeyboardFormScrollView` usa `flex: 1` (`KeyboardAvoidingView`); en un
contenedor sin altura, ese hijo mide 0 y la hoja no se ve. Las otras hojas (Áreas,
Tipos de servicio, Recursos) tienen `height` y por eso funcionan. El error ya estaba
antes de V6.1; no es un problema de permisos ni del backend.
Corrección (Codex): dar altura a la hoja como en las demás, por ejemplo
`height: '80%'` y `maxHeight: '90%'`, y agregar una prueba que abra la hoja y encuentre
«Aprobar acceso» y «Rechazar acceso». Va en el mismo commit que el orden de las fechas.

### 2026-09-24 — T-906 · T-907 — Codex — ajustes aprobados y nueva build Android

Vincent autorizó el commit y una APK nueva sin esperar a que EAS termine. La fecha
«Asignada» del PDF ya fue corregida y desplegada por Claude (commit `74f8370`,
versión 11), por lo que no se repitió el despliegue.
Codex incluyó los cinco ajustes visuales aprobados y ordenó las fechas congeladas
(creada, aceptada, asignada, iniciada, enviada), con prueba. Commit local
`622cef4` (`fix: polish report review and photo controls`) en
`agent/codex/mvp-client`, solo con los siete archivos del cliente correspondientes.
`npm run verify` aprobó: TypeScript, ESLint, Prettier, 214 pruebas y Expo Doctor 21/21.
Build EAS Android `preview` iniciada con `--no-wait`:
https://expo.dev/accounts/vincentxox/projects/gestion-casos/builds/56fd2ecc-836b-4d73-92c5-ce2277d88a81
No se hizo push, merge ni despliegue del cliente. Cuando esté disponible la APK,
faltan las pruebas de devolución y reenvío, foto sin conexión, mínimo de fotos mayor
que 0 e inicio de sesión con Google.

### 2026-09-24 — T-906 · T-907 — Claude — revisión de los ajustes visuales

Resultado: **Aprobado** (sin commit, sobre `9a99a52`). Los cinco ajustes están bien:
el requisito de fotos «(opcional)» con mínimo 0, las etiquetas en tipo oración, la
prioridad y la clase con sus etiquetas, las fotos separadas en «Antes» y «Después», los
recursos con separador y unidad, y el botón «…» circular y semitransparente. Solo cambia
la presentación; `reportPresentation.ts` tiene pruebas y está en la cobertura.
Sugerencia menor, no bloqueante: en `ReportContent`, mostrar las fechas en orden fijo
(creada, aceptada, asignada, iniciada, enviada) en lugar de `Object.entries`. `jsonb`
ordena las claves por longitud y hoy «Enviada» sale en segundo lugar.
Decisión de Vincent: aplicarla. Codex la incluye en el mismo commit de los ajustes.
Para el otro agente: Codex, el PDF ya está resuelto (`74f8370`, versión 11); no hace
falta pedir otra autorización. Con el visto bueno de Vincent: commit de estos ajustes y
una APK nueva para las pruebas pendientes (devolución, foto sin conexión, mínimo de
fotos mayor que 0 e inicio de sesión con Google).

### 2026-09-24 — T-906 · T-907 — Codex — ajustes visuales tras prueba Android

Resumen: atendí los cinco ajustes visuales señalados por Claude. El requisito de
fotos con mínimo 0 dice «n (opcional)»; la revisión usa etiquetas de oración,
prioridad y clase de recurso legibles; separa las fotos de antes y después;
presenta cantidad con unidad y horas como texto sin línea de campo editable;
y el botón «…» de cada foto tiene un círculo pequeño semitransparente dentro
de una zona táctil de 44 px.
Archivos: `src/features/reports/reportPresentation.ts`, `components/ReportContent.tsx`,
`components/ReportSummary.tsx`, pruebas de presentación, `src/features/photos/components/PhotoGrid.tsx`
y configuración de cobertura en `package.json`.
Validaciones: `npm run verify` aprobado (213 pruebas, Expo Doctor 21/21);
`npm run test:coverage` aprobado (89,94 % instrucciones, 83,15 % ramas,
95,74 % funciones y 93,72 % líneas).
Riesgos y pendientes: no se ha comprobado este ajuste visual en una APK nueva.
Devolución y reenvío, foto sin conexión, mínimo mayor que 0 y Google siguen
pendientes de prueba. El cambio de la fecha «Asignada» del PDF corresponde al
backend y exige autorización explícita de Vincent antes de desplegar.
Sin commit, APK, push, merge ni despliegue en esta entrega.
Para el otro agente: Claude, revisa solo estos cinco ajustes visuales.

### 2026-09-24 — T-906 · T-907 — Codex — commit y build Android

Resumen: con autorización de Vincent hice el commit local `9a99a52`
(`feat: add case photos and signed reports client`) en `agent/codex/mvp-client`,
solo con los archivos de T-906/T-907. La rama quedó limpia. Lancé una build EAS
Android con perfil `preview` (APK), sin esperar a su finalización:
https://expo.dev/accounts/vincentxox/projects/gestion-casos/builds/eee1d1c6-2fa3-458c-80f6-6e8dd22809c2
Validaciones: `npm run verify` antes del commit, aprobado: TypeScript, ESLint,
Prettier, 209 pruebas y Expo Doctor 21/21.
Riesgos y pendientes: EAS puede seguir compilando; la prueba integrada de la
sección 9 de `docs/REPORTS_CLIENT.md` queda pendiente de instalar la APK. Sin
push, merge ni despliegue.
Para el otro agente: Claude, la revisión estática ya está aprobada; espera el
resultado de la build y las pruebas en Android.

### 2026-09-24 — PDF — Claude — fecha de asignación (autorizado)

Con la autorización de Vincent, en la rama `agent/claude/pdf-assigned-date` (desde
`agent/claude/admin-cancel-rule`), el commit `74f8370` agrega «Asignada» a la sección
Fechas de `generate-report-pdf`. Las pruebas de `supabase/functions/tests` pasan (21 de
21). Se desplegó como versión 11, con `verify_jwt` activo; el código desplegado es el
mismo del commit.
Los PDF ya generados no cambian, porque cada versión genera su PDF una sola vez
(CAS-2026-00002 conserva el suyo). Falta el push de la rama: esta sesión no puede
publicar en GitHub.

### 2026-09-24 — T-906 · T-907 — Claude — resultado de la prueba en Android (parcial)

Vincent probó en Android el flujo completo de CAS-2026-00002: borrador, fotos, tres
firmas (la conformidad la firmó el administrador como suplente, con su nota) y PDF.
Funciona de punta a punta: contenido congelado, código de verificación, hoja de
evidencia y flechas sin caracteres rotos.
Ajustes visuales para Codex (misma rama, sin commit hasta revisión):

1. Requisito de fotos con mínimo 0: hoy dice «Fotos de después 3 de 0». Si el mínimo
   es 0, mostrar «Fotos de después: 3 (opcional)»; si es mayor, «n de m».
2. `ReportContent`: etiquetas en tipo oración («Tipo de servicio», «Trabajo realizado»,
   «Área solicitante»), no en mayúscula por palabra. Prioridad y clase de recurso con
   sus etiquetas («Alta», «Material», «Herramienta»).
3. `ReportContent`, Fotografías: separar con subtítulos «Antes» y «Después».
4. `ReportContent`, Recursos: la línea bajo «Cantidad» y «Horas» parece un campo
   editable. Usar el separador de las otras tarjetas y mostrar la unidad
   («1 unidad», «1 h»).
5. `PhotoGrid`: el botón «…» tapa la esquina de la miniatura con un cuadro blanco.
   Usar un botón circular pequeño y semitransparente en la esquina.

Backend (Claude): el PDF no incluye la fecha «Asignada», aunque sí está en el contenido
congelado. Es un cambio de una línea en `generate-report-pdf`; queda pendiente la
autorización de Vincent para la rama y el redespliegue.
Pendientes de la prueba: devolución y reenvío, foto sin conexión, mínimo de fotos
mayor que 0 e inicio de sesión con Google.

### 2026-09-24 — T-906 · T-907 — Vincent — autorización

Vincent autoriza: (1) el commit de T-906/T-907 en `agent/codex/mvp-client`, (2) una APK
nueva y (3) la prueba integrada en Android (sección 9 de `docs/REPORTS_CLIENT.md`).
No incluye push, merge ni despliegue.
Para el otro agente: Codex, haz el commit (sin incluir archivos ajenos), ejecuta
`npm run verify`, genera la APK y avisa con el hash del commit y el enlace de la build.

### 2026-09-24 — T-906 · T-907 — Claude — revisión de las correcciones

Resultado: **Aprobado en revisión estática.** Los tres puntos están resueltos.

1. `reportPermissions` separa `photos_before` (vale en `asignado`) de `edit` (solo en
   `en_ejecucion` y `en_espera`). `CaseReportScreen` no autoguarda sin `edit` y muestra
   «Inicia el trabajo para escribir el reporte». Las fotos de después dependen de
   `edit`, lo que coincide con `can_manage_case_photos`.
2. `discardPendingPhoto` valida el `localId`, el usuario y el estado `error`, rechaza
   las fotos que se están subiendo, borra los dos archivos locales y la entrada del
   kv-store. `PhotoGrid` ofrece «Descartar» con confirmación.
3. Los roles salen con `ROLE_LABELS` en las firmas y en `SignatureSheet`.

Validación propia: `tsc --noEmit` sin errores y las pruebas de `reports` y `photos` pasan
(8 suites, 32 pruebas).
Siguiente paso, con autorización de Vincent: commit de T-906/T-907 en
`agent/codex/mvp-client`, una APK nueva y la prueba integrada en Android de la sección 9
de `docs/REPORTS_CLIENT.md`.

### 2026-09-24 — T-906 · T-907 — Codex — correcciones de revisión

Resumen: resolví los tres hallazgos de Claude. En `asignado`, `photos_before`
permite agregar solo fotos de antes; los campos del reporte quedan en solo lectura,
con el aviso «Inicia el trabajo para escribir el reporte», y no se autoguardan. Una
foto pendiente con error ahora ofrece «Descartar» con confirmación; se comprueba
el usuario y que no siga procesándose, se borran las dos copias locales y después
la entrada de la cola. Las firmas muestran las etiquetas de rol existentes.
Archivos: `src/features/reports/reportPermissions.ts`, `screens/CaseReportScreen.tsx`,
`components/ReportSummary.tsx`, `components/ReportContent.tsx`,
`screens/ReportReviewScreen.tsx`, `src/features/photos/uploadQueue.ts`,
`components/PhotoGrid.tsx`, `src/features/cases/screens/CaseDetailScreen.tsx` y pruebas.
Validaciones: `npm run verify` aprobado (209 pruebas, Expo Doctor 21/21);
`npm run test:coverage` aprobado (89,91 % instrucciones, 83,38 % ramas,
95,60 % funciones, 93,62 % líneas). Pruebas nuevas de permisos en `asignado`
y del descarte con limpieza local y protección de usuario.
Riesgos y pendientes: sigue pendiente la revisión de estos tres cambios por Claude.
La prueba integrada necesita una APK nueva y autorización de Vincent. Sin commit,
APK, push, merge ni despliegue de T-906/T-907.
Para el otro agente: Claude, revisa solo las correcciones 1 a 3 de tu revisión.

### 2026-09-24 — T-906 · T-907 — Claude — revisión estática

Resultado: **Cambios solicitados** (dos correcciones y un detalle menor). Todo lo demás
coincide con C-007, C-008 y `docs/REPORTS_CLIENT.md`. V6.1 (`e488ebd`) queda aprobado
en revisión estática.
Revisado sin observaciones:

- Nombres y parámetros de las RPC (`submit`/`validate`/`approve_case_report` con
  `target_case_id`, `signature_stroke`, `accepts_terms`; `return_case_report` con
  `return_reason`).
- Firma: escala uniforme 0–1000 con `M`/`L` enteros, puntos de menos de 3 unidades
  descartados y un segundo intento a 6 si pasa de 20 000; es compatible con la expresión
  regular del servidor. El texto de consentimiento es el exacto y la hoja se reinicia
  por `key`.
- Suplencia y exclusión del ejecutor en `reportPermissions`: coinciden con
  `technical_validation_needs_admin` y `requesting_area_has_manager`.
- Quien valida o aprueba ve el `content` congelado de la versión vigente; las claves de
  `FrozenReportContent` coinciden con `build_report_content`.
- La devolución exige de 3 a 500 caracteres.
- PDF: `functions.invoke`, se exige una URL `https`, mensajes para los errores 409 y 404
  y se abre con `openBrowserAsync`.
- Fotos: preparación JPEG, cola persistente, re-reserva, reintentos 2/8/30 s,
  reanudación al arrancar y al reconectar, URL firmada de 300 s y conteo solo de fotos
  confirmadas.
- `min_after_photos` de 0 a 3 (tiene los permisos de columna).
- Solo se agregaron las tres dependencias aprobadas; `tsc --noEmit` sin errores.

Cambios solicitados:

1. **Borrador editable en `asignado`.** `getReportActions` devuelve `edit` en `asignado`,
   así que `CaseReportScreen` habilita los cuatro campos y el autoguardado. Pero las
   políticas de `case_reports` usan `can_register_case_usage`, que solo permite
   `en_ejecucion` y `en_espera`. Resultado: en `asignado` el técnico escribe y ve
   «No se guardó». Corrección: separar un permiso de fotos de antes (`photos_before`,
   válido en `asignado`) del permiso `edit` (solo en `en_ejecucion`/`en_espera`). En
   `asignado`, los campos van en solo lectura con el aviso «Inicia el trabajo para
   escribir el reporte». Agregar pruebas de `reportPermissions` para ese estado.
2. **Fotos pendientes con error de negocio sin salida.** `PhotoGrid` solo ofrece
   «Reintentar» y `uploadQueue` no expone cómo quitar un pendiente. Si el servidor lo
   rechaza por cuota, por el límite de 3 o porque la solicitud cambió de estado, la
   foto queda en la cola para siempre y ocupa un espacio de la cuadrícula. Corrección:
   `discardPendingPhoto(userId, localId)`, que borre la entrada del kv-store y los
   archivos en `pending-photos/`, y una opción «Descartar» junto a
   «Error · Reintentar», con confirmación. Agregar una prueba.
3. **Menor:** `signerRole` y el rol en `SignatureSheet` salen en crudo (`jefe_area`,
   `administrador`). Usar las etiquetas de rol que ya existen en la app.

Para el otro agente: Codex, aplica los puntos 1 a 3 en la misma rama sin commit y
avisa. Reviso solo esos cambios; después se pide a Vincent el commit y la APK.

### 2026-09-24 — T-906 · T-907 — Codex — entrega para revisión estática

Resumen: instalé las tres dependencias nativas aprobadas y completé fotos (preparación
JPEG, miniaturas, reserva, cola persistente con reintentos y recuperación al reconectar,
visor y borrado), mínimo de fotos por tipo de servicio, borrador autoguardado, vista de
revisión, firmas, devolución, versiones congeladas y descarga de PDF. El detalle de la
solicitud muestra estado, requisitos, fotos, firmas y código de verificación. La
autorización definitiva sigue en las RPC y RLS del servidor; el cliente muestra el
mensaje del servidor si rechaza una operación. No se modificó backend ni `app.json`.
Archivos: `src/features/photos/`, `src/features/reports/`, `App.tsx`, detalles y tipos
de solicitudes, tipos de servicio, navegación, `package.json` y `package-lock.json`.
Validaciones: `npm run verify` aprobado: TypeScript, ESLint, Prettier, 205 pruebas y
Expo Doctor 21/21. `npm run test:coverage` aprobado, incluyendo los servicios nuevos:
89,79 % instrucciones, 83,38 % ramas, 95,02 % funciones y 93,34 % líneas.
`git diff --check` sin errores de espacios.
Riesgos y pendientes: la prueba integrada en Android de la sección 9 de
`docs/REPORTS_CLIENT.md` requiere una APK nueva por las dependencias nativas. No se
generó APK ni se hizo commit, push, merge o despliegue de T-906/T-907. Quedan
pendientes revisión estática de Claude y, con nueva autorización de Vincent, commit,
APK y prueba real de cámara, cola sin conexión, firmas, devolución y PDF.
Para el otro agente: Claude, revisa T-906/T-907 contra C-007/C-008 y
`docs/REPORTS_CLIENT.md`; revisa en particular la fidelidad de la vista congelada,
la cola de fotos y los permisos de suplencia antes de pedir el commit y la APK.

### 2026-09-24 — D-003 V6.1 — Codex — implementación y commit

Resumen: apliqué los cuatro ajustes de la sección 10: Mi empresa distingue guardar,
compartir y regenerar (este último con confirmación dentro de la app); las opciones de
Invitaciones saltan de línea; los nombres de Áreas y Tipos de servicio admiten dos
líneas; Solicitudes de acceso usa `SegmentedControl` y `EmptyState`.
Archivos: cinco pantallas en `src/features/admin/`, `areas/` y `categories/`, más dos
pruebas de administración. Sin backend, dependencias ni cambios nativos.
Validaciones: `npm run verify` aprobado: TypeScript, ESLint, Prettier, 176 pruebas y
Expo Doctor 21/21.
Riesgos y pendientes: Vincent autorizó el commit local separado `e488ebd`
(`fix: polish remaining admin screens`). No se hizo APK, push ni merge. Tras el commit
comencé T-906/T-907 en la misma rama, sin incluirlo en V6.1.
Para el otro agente: Claude, revisa V6.1 en `e488ebd`.

### 2026-09-24 — D-003 V6 y Expo — Codex — commits y validación

Resumen: con la autorización de Vincent actualicé los cuatro parches pedidos por
Expo Doctor mediante `npx expo install --fix` y los separé en el commit `4935373`
(`chore: update Expo patch versions`). Versiones antes → después: `expo`
`~57.0.24` → `~57.0.25`; `expo-auth-session` `~57.0.12` → `~57.0.13`;
`expo-image-picker` `~57.0.19` → `~57.0.20`; `expo-notifications` `~57.0.20` →
`~57.0.21`. El parche de `expo-modules-core` conserva exactamente su cambio de
CMake, renombrado de `57.0.18` a `57.0.19`; `npm ci` lo aplicó correctamente.
Atendí la sugerencia 2 de V6: una única acción secundaria se muestra como botón
directo, rojo si es cancelar o rechazar; dos o más conservan «Más acciones». Añadí
dos pruebas y guardé V6 en `83eace2` (`feat: refine MVP client visual details`).
Archivos: commit de dependencias limitado a `package.json`, `package-lock.json` y
`patches/expo-modules-core`; commit V6 limitado a `App.tsx` y `src/`. Sin archivos
temporales ni cambios solo de finales de línea.
Validaciones: `npm ci` y `npm run verify` completos: TypeScript, ESLint, Prettier,
173 pruebas y Expo Doctor 21/21. El test automatizado de Google OAuth pasó.
Riesgos y pendientes: ADB no detectó ningún teléfono, así que no fue posible probar
un inicio de sesión real con Google tras actualizar `expo-auth-session`; requiere
una nueva APK, que Vincent no ha autorizado. `npm ci` informó 18 avisos de auditoría
(14 moderados, 4 altos), sin cambios automáticos fuera de alcance. Faltan también
las capturas visuales de V6. No hubo push, merge ni despliegue.
Para el otro agente: Claude, revisa el botón directo y los commits `4935373` y
`83eace2`. Esperar autorización de Vincent antes de generar la APK de V6.

### 2026-09-24 — D-003 V6 — Claude — confirmación en Android y siguiente paso

Resumen: con las capturas de la APK de V6, Vincent confirma que la app se ve bien.
Verifiqué en las capturas los filtros sin recorte, la tarjeta nueva, el menú «⋯» y los
botones flotantes de los catálogos, los quetzales con unidad, «Nueva invitación», los
chips de aviso de Administrar y la pantalla de arranque (opción A). Quedan cuatro ajustes
menores, que agregué como sección 10 «V6.1» de `docs/VISUAL_SYSTEM.md`:

- botones de Mi empresa;
- filas de rol y área que se cortan en Invitaciones;
- nombres recortados en Áreas y Tipos de servicio;
- pestañas y lista vacía de Solicitudes de acceso.
  Decisión de Vincent: seguir con V6.1 y después con fotos y reporte (T-906 y T-907, según
  `docs/REPORTS_CLIENT.md`).
  Para el otro agente: Codex, primero V6.1 en un commit aparte; después T-906 y T-907.

### 2026-09-24 — T-906 · T-907 — Claude — especificación del cliente de fotos y reporte

Resumen: a pedido de Vincent, escribí `docs/REPORTS_CLIENT.md` (sin commit) con la
especificación del cliente para fotos (T-906) y reporte con firmas (T-907), sobre los
contratos C-007 y C-008 aplicados en remoto y `generate-report-pdf`. Cubre:

- qué ve cada rol en cada estado, incluidas la suplencia del administrador y la exclusión
  del ejecutor;
- la sección «Reporte» del detalle;
- fotos con compresión (1600 y 400 px) y una cola persistente con reintentos
  (`expo-sqlite/kv-store`);
- borrador con guardado automático;
- pantalla única para revisar, firmar, validar, aprobar y devolver;
- lienzo de firma con escala uniforme de 0 a 1000 y consentimiento exacto del servidor;
- descarga del PDF;
- mínimo de fotos de después en el tipo de servicio;
- pruebas y prueba integrada.
  Dependencias ya aprobadas por Vincent (23/09): `expo-image-manipulator`,
  `react-native-svg` y `expo-image`; no se agrega `react-native-gesture-handler`.
  Para el otro agente: Codex, empieza T-906 y T-907 cuando Vincent confirme V6 en el
  teléfono, desde tu rama con V6 (`83eace2`).

### 2026-09-24 — Dependencias y V6 — Claude — revisión de `4935373` y `83eace2`

Resumen:

- `4935373` sube `expo` (57.0.25), `expo-auth-session` (57.0.13), `expo-image-picker`
  (57.0.20) y `expo-notifications` (57.0.21). El lockfile solo cambia versiones de parche
  del ecosistema Expo, y el parche de `expo-modules-core` se renombra a 57.0.19 sin cambiar
  su contenido. Correcto.
- `83eace2` guarda V6 como la aprobé e implementa la sugerencia 2 con
  `getSecondaryActionPresentation` y su prueba: una sola acción secundaria se muestra
  directamente (en rojo si es rechazar o cancelar) y dos o más van a «Más acciones». No
  incluye archivos que solo cambien finales de línea, temporales, `app.json` ni migraciones.
  Correcto.
  Veredicto: ambos commits aprobados.
  Pendientes:
- inicio de sesión real con Google en Android, tras el cambio de `expo-auth-session`;
- capturas de V6 (9.5) con una APK nueva, que requiere autorización de Vincent. Revisar
  que «Rechazar solicitud» y «Cancelar solicitud» quepan en medio ancho junto a «Editar»
  sin partirse.
  Push y merge siguen pendientes de autorización.
  Para el otro agente: Codex, sin cambios que hacer; espera la autorización de la APK.

### 2026-09-24 — Regla del administrador — Claude — aplicado en remoto

Resumen: con autorización de Vincent y la revisión aprobada de Codex, apliqué
`20260924100000_restrict_admin_cancel` en `bpwvtuofewwcgbewmwje`, en una transacción
registrada en `supabase_migrations.schema_migrations`.
Validaciones: la huella de `public.transition_case` en remoto
(`276b63c5eaa7d398234a669a85ffbd31`, que considera cuerpo, security definer,
search_path y retorno) es igual a la de una base local con la migración; los permisos
siguen siendo solo `authenticated` y `service_role`.
Contrato C-003: aplicado en remoto. El administrador acepta, rechaza y asigna; solo
cancela las solicitudes que él creó; en las demás recibe «Solo quien creó la solicitud o
el jefe de su área puede cancelarla».
Decisiones de Vincent (24/09/2026): autoriza actualizar los cuatro parches que pide Expo
Doctor, aplicar la sugerencia 2 de mi revisión de V6 (mostrar directamente la única
acción secundaria) y el commit de V6.
Para el otro agente: Codex, (1) actualiza los parches de `expo`, `expo-auth-session`,
`expo-image-picker` y `expo-notifications` con `npx expo install --fix`, en un commit
aparte, anotando las versiones y probando el inicio de sesión con Google; (2) aplica la
sugerencia 2; (3) haz el commit de V6, sin archivos que solo cambien finales de línea. La
APK de V6 sigue pendiente de autorización.

### 2026-09-24 — D-003 V6 — Claude — revisión

Resumen: revisé el diff sin commit de `agent/codex/mvp-client` frente a `6823166`
(19 archivos y 5 nuevos, ignorando finales de línea) contra la sección 9. Cumple:

- filas de filtros con `flexShrink: 0` y `minHeight: 52` en Solicitudes, Usuarios e
  Invitaciones;
- tarjeta con número, hora y asignado arriba, y etiquetas sin salto de línea;
- barra del detalle con la acción principal y una fila secundaria;
- `cancelar` sin el administrador, con prueba, alineado con `f564f42`;
- descripciones en la hoja de acciones;
- catálogos con menú «⋯», botones flotantes («Nueva área», «Nuevo tipo de servicio»,
  «Nuevo recurso») y espacio al final de la lista;
- quetzales con `formatQuetzales` y «Unidad: …», con ejemplo en el formulario;
- invitaciones con áreas filtradas por rol y correo con ejemplo;
- `App.tsx` solo muestra el fondo hasta que cargan las fuentes, y la intro (opción A) usa
  tarjeta de 112 px, nombre en una línea, barra de 84 px y versión, y respeta reducir
  movimiento.
  Veredicto: aprobada en revisión de código, sin hallazgos bloqueantes ni importantes.
  Sugerencias:

1. [sugerencia, para Vincent] La tarjeta de solicitud ya no lleva el `IconTile` de estado a
   la izquierda, algo que 9.1.2 no pedía. Gana ancho y el estado sigue en la etiqueta, pero
   cambia el aspecto de V2; Vincent debe confirmarlo en el teléfono.
2. [sugerencia] En el detalle desapareció la lógica que mostraba directamente una única
   acción secundaria. Ahora, si solo hay una (por ejemplo «Cancelar solicitud» para quien la
   creó, o «Rechazar» para el administrador), igual queda detrás de «Más acciones». Muéstrala
   directamente, en rojo, cuando sea la única.
   Nota: al revisar, un `git status` mío dejó un `index.lock` vacío en
   `.git/worktrees/gestion-casos-codex-mvp-client/`. Ya lo borré; desde ahora uso git en solo
   lectura (`GIT_OPTIONAL_LOCKS=0`) en tu worktree.
   CI: «Calidad y pruebas» falla solo en Expo Doctor, que pide versiones de parche nuevas de
   `expo`, `expo-auth-session`, `expo-image-picker` y `expo-notifications`. Actualizarlas
   requiere autorización de Vincent.
   Para el otro agente: Codex, aplica la sugerencia 2 si Vincent está de acuerdo. Después, con
   su autorización, commit y APK para las capturas de 9.5.

### 2026-09-24 — D-003 V6 — Codex — implementación para revisión

Resumen: implementé la sección 9 de `docs/VISUAL_SYSTEM.md` en
`agent/codex/mvp-client`. Filtros sin encogimiento; tarjeta de solicitud con número,
hora y asignado arriba; barra del detalle con acción principal y fila secundaria;
permiso de cancelar sin suplencia del administrador y explicaciones en la hoja;
catálogos con menú «⋯», botón flotante, datos en gris y costos en quetzales;
invitaciones con áreas filtradas por rol. La pantalla de arranque usa la opción A:
fondo claro, logo en tarjeta de 112 px, nombre en una línea, lema, barra de
84 × 4 px y versión tomada de `app.json` (solo lectura). `App.tsx` espera a que
`useFonts` concluya antes de montar la intro; esta espera también el resultado
de la sesión. Con «reducir movimiento» no se anima.
Archivos: `App.tsx`, `src/components/`, `src/features/{admin,areas,cases,categories,resources}/`
y `src/theme/`, con pruebas de intro, permisos, área por rol y quetzales. Sin
cambios en `app.json`, dependencias, backend ni navegación. Estado: En revisión,
sin commit ni nueva APK.
Validaciones: typecheck, lint, Prettier, 171 pruebas y cobertura global
(93,83 % sentencias; 85,35 % ramas) aprobados. `npm run verify` no queda verde:
Expo Doctor exige cuatro
parches nuevos de `expo`, `expo-auth-session`, `expo-image-picker` y
`expo-notifications`; no cambié dependencias por la restricción expresa de
esta entrega. Pendiente: revisión de Claude y capturas/prueba visual en Android
de los puntos 9.5, especialmente filtros, barra, menús y arranque en frío.
Para el otro agente: Claude, revisa el diff completo de V6. La APK de V5 no
incluye estos cambios.

### 2026-09-24 — Regla del administrador — Codex — revisión de `f564f42`

Resumen: revisé el commit de `agent/claude/admin-cancel-rule` y publiqué la
rama en GitHub sin aplicar la migración en Supabase. Al comparar la función
`transition_case` con la versión anterior, tras normalizar formato, la única
diferencia funcional es retirar `is_admin` de `cancelar`. La prueba 19 cubre
administrador creador/no creador, aceptación y rechazo; el documento de reglas
coincide con la decisión de Vincent. Estado: aprobado en revisión estática;
pendiente autorización separada para aplicar la migración en remoto.
Validaciones: CI de GitHub `36024171202`: «Migraciones y reglas de Supabase» y
«Edge Functions» aprobados. «Calidad y pruebas» falla en Expo Doctor por los
cuatro parches nuevos, sin relación con esta migración. No pude repetir SQL
local por falta de PostgreSQL en este entorno.
Para el otro agente: Claude, la revisión de la regla queda cerrada; no desplegar
sin autorización de Vincent.

### 2026-09-23 — T-904 — Codex — redespliegue autorizado del PDF

Resumen: Vincent autorizó específicamente volver a desplegar `generate-report-pdf`.
Publiqué la función desde el commit revisado `80b725c` en el proyecto de pruebas
`bpwvtuofewwcgbewmwje`; quedó `ACTIVE`, versión 8, con `verify_jwt=true`.
No cambié `send-push`, `cleanup-photos`, migraciones, secretos ni tareas cron.
Validaciones: los cuatro archivos recuperados de la función remota coinciden
exactamente con los de `80b725c`; las 21 pruebas Node de Edge Functions pasan;
una solicitud POST sin sesión devuelve 401 `UNAUTHORIZED_NO_AUTH_HEADER`.
Riesgos y pendientes: estas comprobaciones no prueban la generación y apertura de
un PDF autenticado para una solicitud aprobada; sigue pendiente esa prueba integrada.
Para el otro agente: Claude, el redespliegue autorizado terminó correctamente.

### 2026-09-24 — D-003 V5 — Codex — commit y APK autorizados

Resumen: Vincent autorizó el commit y una APK de V5 tras la aprobación de
Claude. Creé `6823166` (`feat: polish MVP client visual design`) en
`agent/codex/mvp-client` con 34 archivos del cliente; no incluí migraciones,
parches ni archivos de solo finales de línea. La rama quedó limpia. Repetí
`npm run verify`: 165 pruebas y Expo Doctor 21/21 aprobados. Inicié EAS Build
Android `preview` (APK) con las credenciales existentes; compilación
`94f3f3b9-1955-4556-b27c-75d963cdda6b`, terminada correctamente. APK:
`https://expo.dev/artifacts/eas/YmeftWwa_BkhOEUUkmNBNuQagxlITRYfcc1MTytXihs.apk`.
Pendiente: capturas en Android físico de 360 dp, en especial
las líneas del progreso. No hice push ni merge.
Para el otro agente: Claude, revisa las capturas cuando Vincent las comparta.

### 2026-09-24 — D-003 V5 — Codex — respuesta a la revisión

Resumen: corregí los hallazgos 1 y 2 de Claude. `ProgressTracker` ahora dibuja
las dos medias líneas dentro de cada paso, antes de su círculo, sin prolongar
la línea de un contenedor sobre el círculo vecino. El destacado de Inicio usa
«TU BANDEJA», «TUS TRABAJOS» o «TUS SOLICITUDES» según el rol; solo la bandeja
muestra el desglose en cápsulas. Añadí una prueba para las tres variantes.
También atendí las sugerencias 3 a 5: «En espera» coincide con el estado actual,
quité los sobretítulos/estilos sobrantes de Usuarios y Solicitudes de acceso, y
restauré `accessibilityRole="header"` al título del detalle. La sugerencia 6
(nombre de empresa visible en Inicio) sigue como decisión de Vincent; no la asumí.
Archivos de esta corrección: `ProgressTracker.tsx`, `homePresentation.ts`,
`HomeScreen.tsx`, su prueba, `UsersScreen.tsx`, `AccessRequestsScreen.tsx` y
`CaseDetailScreen.tsx`. Validaciones: `npm run verify` aprobado (165 pruebas,
Expo Doctor 21/21), `npm run test:coverage` aprobado,
`npm run lint -- --max-warnings=0` aprobado y `git diff --check` limpio.
Estado: En revisión; falta confirmar la geometría de las líneas y el diseño en
Android físico con las capturas de 360 dp. No hice commit, push, merge ni APK.
Para el otro agente: Claude, revisa estas correcciones; si no hay bloqueos,
Vincent podrá decidir sobre el commit y la nueva APK para la prueba visual.

### 2026-09-24 — D-003 V6 — Claude — pantalla de arranque decidida

Resumen: Vincent eligió la opción A para la pantalla de arranque: fondo claro, logo en una
tarjeta blanca, nombre en una línea, lema y barra fina de carga. Actualicé el punto 9.4
de `docs/VISUAL_SYSTEM.md`; V6 queda completa y lista para implementarse. El backend de la
regla del administrador tiene commit `f564f42` en `agent/claude/admin-cancel-rule`, local
y sin push.
Para el otro agente: Codex, sube y revisa `f564f42`, e implementa V6 completa (sección 9),
con el punto 13 en la opción A.

### 2026-09-24 — D-003 V6 y regla del administrador — Claude — especificación y backend

Resumen: Vincent eligió que el administrador acepte, rechace y asigne, pero que solo
cancele las solicitudes que él creó (opción 1).

- Backend en la rama local `agent/claude/admin-cancel-rule`, desde
  `agent/claude/pdf-fix-and-schedules`, sin commit todavía:
  - migración `20260924100000_restrict_admin_cancel.sql`: redefine
    `public.transition_case` idéntica a la original, salvo que se quita `is_admin` de la
    condición de `cancelar`;
  - prueba `supabase/tests/19_admin_cancel_test.sql`: el administrador no cancela una
    solicitud ajena, sigue aceptando y rechazando, el creador cancela y el administrador
    creador cancela la suya;
  - `docs/BUSINESS_RULES.md` (rol administrador y 5.3) actualizado. Documenta también que
    el administrador acepta, rechaza y asigna, algo que el código ya permitía pero las
    reglas no decían.
- Especificación: agregué la sección 9, «V6 — Ajustes finales», a `docs/VISUAL_SYSTEM.md`.
  Incluye filtros recortados, tarjeta en pantallas angostas, barra de acciones del
  detalle, logo inicial deformado al reabrir (la intro se muestra antes de que carguen las
  fuentes), permiso de cancelar en el cliente, explicación en el menú de acciones, azul
  solo para lo que se toca, menú «⋯» para activar y desactivar, botón flotante de crear en
  catálogos, tarjetas de catálogo, unidad y quetzales en recursos, e invitaciones con áreas
  filtradas por rol.
  Validaciones: todas las pruebas SQL locales pasan, incluida la 19. Prettier aplicado a
  `docs/VISUAL_SYSTEM.md`.
  Contrato C-003: `transition_case(..., 'cancelar')` para el administrador ahora responde
  «Solo quien creó la solicitud o el jefe de su área puede cancelarla», salvo que él la haya
  creado. Estado: propuesto, sin aplicar en remoto.
  Pendiente de Vincent: autorizar el commit del backend y, tras la revisión de Codex, la
  aplicación de la migración en remoto.
  Para el otro agente: Codex, revisa la migración 20260924100000 cuando se publique la rama.
  Implementa V6 (sección 9) en tu rama; el punto 5 alinea el cliente con esta regla.

### 2026-09-24 — D-003 V5 — Claude — revisión de correcciones

Resumen: verifiqué las correcciones de Codex a mi revisión de V5.

1. `ProgressTracker`: cada paso dibuja sus dos medias líneas (`leftHalf` y `rightHalf`)
   antes de su propio círculo; ya ninguna línea sale del contenedor de otro paso. Correcto.
2. Inicio: sobretítulo por variante («TU BANDEJA», «TUS TRABAJOS», «TUS SOLICITUDES»);
   las cápsulas solo aparecen si hay desglose y el resto va como `supportingText`.
   Correcto.
3. El resumen del progreso usa `statusMeta` («Actual: En espera»). Correcto.
4. Se quitaron el sobretítulo sobrante de Usuarios y los estilos sin uso. Correcto.
5. El título del detalle recupera `accessibilityRole="header"`. Correcto.
   Veredicto: V5 aprobada en revisión de código. Falta la prueba visual en Android (las
   capturas de 8.11), en especial las líneas del progreso.
   Pendiente de Vincent: mostrar o no el nombre de la empresa en el encabezado de Inicio.
   Para el otro agente: Codex, con autorización de Vincent, haz el commit (sin archivos que
   solo cambien finales de línea) y la APK de prueba.

### 2026-09-24 — D-003 V5 — Claude — revisión

Resumen: revisé el diff sin commit de `agent/codex/mvp-client` frente a `49d5b96`
(34 archivos, ignorando finales de línea) contra `docs/VISUAL_SYSTEM.md` sección 8.
Cumple casi toda la especificación:

- sin literales de fuente, radios ni colores, ni etiquetas creadas desde códigos;
- `ActivityIndicator` solo queda en `AuthLoadingScreen`;
- `plural` aplicado, con pruebas, y ceros ocultos;
- `actionMeta` con etiqueta y descripción; `priorityMeta` con bandera;
- Inicio con fecha, saludo con mayúscula, etiquetas y tarjetas horizontales con `id`;
- filtros de Solicitudes por conjunto y por estado, con accesos de Inicio como chips
  removibles;
- segmentos en una línea con cápsula;
- Acciones, Asignar (avatar, radio circular, botón fijo, vacío), Recursos utilizados
  migrada, Administrar con chips de aviso, Usuarios e Invitaciones con `Chip` y botones de
  texto, teclado en solicitudes de acceso, y Perfil y Completar nombre según 8.10.
  Veredicto: aprobada con cambios. Corregir 1 y 2 antes del commit y de la APK.
  Hallazgos:

1. [importante] `ProgressTracker`: la línea todavía puede cruzar los círculos. El
   `zIndex` solo ordena elementos dentro de cada paso, pero la línea del paso i+1 está
   en el contenedor siguiente, que se dibuja después del círculo i y lo cruza por la
   derecha. Solución: que cada paso dibuje sus dos medias líneas antes de su propio
   círculo (izquierda `left: 0, right: '50%'` si no es el primero; derecha
   `left: '50%', right: 0` si no es el último) y quitar la línea que sale del
   contenedor. Comprobarlo en Android.
2. [importante] Inicio: el sobretítulo «TU BANDEJA» y las etiquetas se aplican a todas
   las variantes. Para un técnico («Tienes 2 trabajos asignados») o un solicitante
   («3 solicitudes activas») aparece «TU BANDEJA» y la frase «Consulta tus tareas…» dentro
   de una cápsula. Solución: sobretítulo por variante («TU BANDEJA», «TUS TRABAJOS»,
   «TUS SOLICITUDES») y cápsulas solo en la bandeja; las demás muestran la frase como
   texto.
3. [sugerencia] Progreso: con `en_espera` el resumen dice «Actual: En ejecución» y la
   etiqueta de estado dice «En espera». Usa `statusMeta[status].label` para el estado
   actual.
4. [sugerencia] `UsersScreen` conserva el sobretítulo «ADMINISTRACIÓN» bajo la barra
   «Usuarios» (8.1.1); quítalo junto con el estilo `title`, que quedó sin uso. En
   `AccessRequestsScreen` también quedó `title` sin uso.
5. [sugerencia] En el detalle, el título de la solicitud perdió
   `accessibilityRole="header"`. Consérvalo para el lector de pantalla aunque el tamaño
   visual baje.
6. [sugerencia, para Vincent] Inicio ya no muestra el nombre de la empresa (sigue en
   Perfil). Se puede agregar al subtítulo si conviene tenerlo a la vista.
   Validaciones: revisión estática y búsquedas de los criterios 8.11. No ejecuté
   `npm run verify` (Codex lo reporta en verde con 164 pruebas). Falta la prueba visual
   en Android: las capturas de 360 dp de 8.11.
   Para el otro agente: Codex, corrige 1 y 2 (y, si puedes, 3 a 5). Después, con
   autorización de Vincent, commit y APK para las capturas de 8.11, que reviso al recibirlas.

### 2026-09-24 — D-003 V5 — Codex — entrega para revisión

Resumen: implementé el pulido V5 desde `49d5b96` en 34 archivos de cliente:
títulos sin duplicación, plurales y conteos cero, Inicio compacto con destinos por
`id`, filtros de Solicitudes por conjunto/estado, progreso legible, acciones con
metadatos, asignación, formularios, recursos, Administrar y Perfil. Las pruebas
nuevas cubren `plural`, los textos de Inicio con uno/cero y los conjuntos por rol.
Eliminé el archivo temporal vacío `.vs-check.md` de esta copia de trabajo.
Validaciones: `npm run verify` aprobado (164 pruebas, Expo Doctor 21/21),
`npm run lint -- --max-warnings=0` aprobado, `npm run test:coverage` aprobado y
`git diff --check` limpio. No hay Android conectado por ADB, por lo que no pude
tomar ni comprobar las capturas de 360 dp exigidas por 8.11. Es una revisión
visual pendiente, no una validación aprobada. No hice commit, push, merge ni
build de APK.
Estado: En revisión de código; pendiente prueba visual en Android físico.
Para el otro agente: Claude, revisa el diff de V5 contra `docs/VISUAL_SYSTEM.md`
sección 8, en especial la semántica de los nuevos filtros y la presentación de
Inicio. Vincent deberá autorizar otra APK para completar las capturas físicas.

### 2026-09-24 — D-003 V5 — Codex — inicio

Resumen: inicio el pulido V5 en `agent/codex/mvp-client` desde `49d5b96`,
siguiendo la sección 8 de `docs/VISUAL_SYSTEM.md`. Alcance: navegación visual
de títulos, componentes compartidos, Inicio, Solicitudes, Detalle, Acciones,
Asignar, formularios, Recursos, Administrar y Perfil, con pruebas. Eliminé el
archivo temporal vacío `.vs-check.md` que dejó la revisión de Claude.
No cambiaré backend, navegación principal, dependencias ni configuración nativa.
Estado: En curso. Sin commit, push, merge ni APK hasta autorización de Vincent.

### 2026-09-23 — D-003 V4 — Codex — commit y compilación Android autorizados

Resumen: Vincent autorizó el commit de V4 y la APK de revisión. Creé `49d5b96`
(`feat: complete MVP client visual redesign`) en `agent/codex/mvp-client` con
solo 49 archivos de cliente; no incluí migraciones, parches ni archivos de solo
CRLF. La rama quedó limpia. `npm run verify` pasó: 162 pruebas y Expo Doctor
21/21. Inicié EAS Build Android `preview` (APK) con la configuración y las
credenciales existentes; compilación `b172b588-096c-422b-b3f4-232768077035`.
Riesgos y pendientes: esperar el resultado de EAS y probar V4 en Android físico.
No hice push ni merge.
Para el otro agente: Claude, revisa el commit y la prueba visual cuando Vincent
confirme la APK.

### 2026-09-23 — D-003 V4 — Codex — respuesta a la revisión

Resumen: atendí los siete puntos de Claude. «Comprobar estado» vuelve a ser un
`Button` con `loading={busy}`; `EmptyState` usa una variante neutra de espera.
Centralicé `ROLE_ICONS`, desactivo la animación inicial también si la primera
carga viene vacía, y unifiqué `RequestState` y `ActionSheet` con la tipografía y
el botón comunes. `StepIndicator` permanece eliminado: Vincent autorizó
expresamente «y borra StepIndicator ya que no se usa en ninguna pantalla».
Archivos: `src/features/auth/types.ts`, `src/features/auth/screens/PendingInvitationScreen.tsx`,
`src/components/feedback/EmptyState.tsx`, `src/features/cases/screens/CasesListScreen.tsx`,
pantallas que muestran roles, `RequestState.tsx` y `ActionSheet.tsx`.
Validaciones: `npm run verify` pasa (162 pruebas y Expo Doctor 21/21);
`npm run lint -- --max-warnings=0` pasa. En Windows, `git status --short` no muestra
los 22 archivos de solo CRLF, ni los parches ni migraciones; no se tocaron ni
se incluirán en un commit.
Riesgos y pendientes: falta prueba con APK en Android físico. Sin commit, push,
merge ni despliegue; requieren autorización del responsable.
Para el otro agente: Claude, confirma el cierre de V4 con estos cambios.

### 2026-09-24 — T-904 — Claude — despliegue de `generate-report-pdf` con `80b725c`

Resumen: con autorización de Vincent desplegué `generate-report-pdf` con la sustitución
de flechas y guiones de `80b725c` (verify_jwt activo). El resto del código es idéntico a
lo ya desplegado. Supabase la registra como versión 9.
Validaciones: una llamada sin sesión desde la base responde 401 del gateway (la función
está activa y exige JWT). Las tareas programadas siguen sanas: 366 llamadas con HTTP 200
en las últimas 6 horas. Falta generar un PDF real con una solicitud aprobada, que depende
del flujo de reportes del cliente (T-907).
Para el otro agente: sin cambios de contrato.

### 2026-09-24 — D-003 V5 — Claude — especificación de pulido

Resumen: con las capturas del APK de V4, la propuesta de Inicio del responsable y una
revisión completa del código de `49d5b96`, agregué la sección 8 «V5 — Pulido» a
`docs/VISUAL_SYSTEM.md`. Incluye reglas generales (un título por pantalla, plurales,
etiquetas desde `actionMeta` y `priorityMeta`, estados de carga y error, mismo componente
para lo mismo, filas sin recorte, teclado y números `es-GT`) y cambios por pantalla. La
pantalla Recursos utilizados no se había migrado en V4.
Confirmé que `49d5b96` incluye las correcciones 1 a 3 de mi revisión de V4 y las
sugerencias 4 a 7.
Decisiones de Vincent (24/09/2026): conservar la fuente de D-003, mantener la prioridad
con borde y bandera, y reorganizar los filtros de Solicitudes según 8.3.
Archivos: `docs/VISUAL_SYSTEM.md` (sin commit, formateado con Prettier).
Para el otro agente: Codex, V5 está lista para implementarse. Quedó un archivo vacío `.vs-check.md` en tu worktree: bórralo, no lo
agregues al commit.

### 2026-09-23 — D-003 V4 — Claude — revisión

Resumen: revisé el diff sin commit de `agent/codex/mvp-client` frente a `ae7290e`,
ignorando finales de línea (44 archivos con cambios reales y 4 nuevos) contra
`docs/VISUAL_SYSTEM.md` 4.5, 5 y 6. Se cumplen los criterios automáticos: sin
`fontSize`, `fontWeight` ni `borderRadius` literales, y sin hexadecimales fuera del
logo de Google. Los íconos de catálogos, administración y roles coinciden con la
especificación. Los botones de ícono tienen 44 px, rol y etiqueta; los chips llegan a
44 con `hitSlop`. La animación de la lista se limita a 8 elementos en la primera carga
y todas las animaciones respetan la reducción de movimiento. La contraseña queda
alineada con Supabase (minúscula y símbolo ASCII, con pruebas).
Veredicto: aprobada con cambios. Corregir 1 a 3 antes del commit y de la APK.
Hallazgos:

1. [importante] Finales de línea. Además de los cambios reales, 22 archivos difieren
   solo por CRLF: `LICENSE`, `.editorconfig`, `.gitignore`, `.prettierignore`,
   `.env.example`, los parches de `patches/`, `scripts/generate_brand_assets.py` y dos
   migraciones publicadas (`20260911162741`, `20260911163134`). La rama de desarrollo
   no tiene `.gitattributes`, porque T-001 no está integrado. Antes del commit, revisa
   `git status` desde Windows; si aparecen, no los incluyas (agrega solo los archivos de
   V2 a V4). Así no se modifica una migración publicada.
2. [importante] `src/components/progress/StepIndicator.tsx` está borrado. Borrar
   archivos requiere autorización del responsable y esa autorización seguía pendiente.
   No lo incluyas en el commit hasta que Vincent lo confirme.
3. [importante] `PendingInvitationScreen`: «Comprobar estado» pasó a ser la acción del
   `EmptyState` y perdió `loading={busy}`, así que se puede pulsar varias veces mientras
   `retry()` corre. Agrega un estado de carga a la acción del `EmptyState` o conserva el
   `Button` con `loading`.
4. [sugerencia] El ícono de cada rol está duplicado: `ROLE_ICONS` en `ProfileScreen` y
   ternarios anidados en `UsersScreen`. Llévalo a `features/auth/types.ts` junto a
   `ROLE_LABELS` y úsalo también en los chips de rol de solicitudes de acceso e
   invitaciones.
5. [sugerencia] La solicitud pendiente usa la variante `allDone` (ícono de «listo») para
   un estado de espera. Conviene una variante neutra o un ícono de reloj.
6. [sugerencia] Si la primera carga de la lista está vacía, `animateInitialList` sigue
   en `true` y se animan las primeras solicitudes creadas después. Apágalo al terminar la
   primera carga, aunque venga vacía.
7. [sugerencia] En `RequestState` y `ActionSheet` el texto de botones y opciones pasó a
   `typography.body` (peso normal). En `RequestState` conviene usar `Button`, para que
   se vea igual que el resto de los botones.
   Validaciones: revisión estática y búsquedas con `grep`. No ejecuté `npm run verify`
   (Codex lo reporta en verde). Falta la prueba en Android con la APK.
   Para el otro agente: Codex, corrige 1 a 3. Si puedes, también 4 a 7, en esta misma
   entrega. Después, con autorización de Vincent, commit y `eas build -p android
--profile preview`.

### 2026-09-23 — D-003 V4 — Codex — implementación para revisión

Resumen: migré el resto de las pantallas administrativas, catálogos y acceso a
`ScreenContainer`, `Card`, `Chip`, `IconTile`, `EmptyState`, `Button` y la escala
tipográfica común.
La pantalla sin empresa muestra «Solicitud enviada a [empresa]». En la lista de
solicitudes se animan solo las primeras ocho entradas de la primera carga; el
encabezado y el progreso del detalle usan transición de 250 ms. Las animaciones
respetan la preferencia de reducir movimiento. Corregí además la validación de
contraseña para exigir minúscula y un símbolo ASCII de puntuación.
Archivos: cambios sin commit en `agent/codex/mvp-client`, principalmente
`src/features/`, `src/components/` y `src/navigation/`; sin backend ni `app.json`.
Validaciones: `npm run verify` correcto (162 pruebas, Expo Doctor 21/21);
`npm run test:coverage` correcto (96,2 % de líneas y 85,2 % de ramas).
La búsqueda en `src/features` y `src/navigation` no halla literales de fuente,
radios numéricos ni hexadecimales fuera del logo de Google y datos de pruebas.
Riesgos y pendientes: no hay dispositivo conectado por ADB; falta inspección
visual y de animaciones con una APK nueva en Android. No hice commit, merge, push
ni despliegue. La revisión de accesibilidad fue estática, no con lector de pantalla.
Para el otro agente: Claude, revisa el diff completo de V4 y la interacción de
pantallas pequeñas antes de solicitar la APK. T-906 a T-908 no se han empezado.

### 2026-09-23 — T-904 — Codex — revisión de `80b725c`

Resumen: aprobado en revisión estática. La sustitución de flechas y guiones fuera de
WinAnsi evita el signo `?` en el PDF sin cambiar autorización ni publicación. La
documentación de cron no contiene valores de secretos.
Archivos revisados: `supabase/functions/_shared/pdfText.ts`,
`supabase/functions/tests/pdf_text_test.ts`, `docs/EDGE_FUNCTIONS.md`.
Validaciones: extraje el commit en un directorio temporal aislado y ejecuté
`node --experimental-strip-types --test supabase/functions/tests/*.ts`: 21/21 pasan.
Riesgos y pendientes: no ejecuté `deno check` ni una generación autenticada de PDF.
El responsable autorizó el push y la rama `agent/claude/pdf-fix-and-schedules` quedó
publicada en `origin` con `80b725c`. Claude puede desplegar la función actualizada
solo con autorización de despliegue.
Para el otro agente: Claude, sin hallazgos bloqueantes ni importantes en `80b725c`.

### 2026-09-23 — T-904 · T-905 — Codex — prueba de humo sin credenciales

Resumen: desde el equipo Windows comprobé que los tres endpoints desplegados en
`bpwvtuofewwcgbewmwje` ya responden por HTTPS. Hice solo solicitudes POST sin
credenciales; no modifiqué datos ni ejecuté tareas programadas.
Validaciones: `send-push` → 401 `No autorizado`; `cleanup-photos` → 401
`No autorizado`; `generate-report-pdf` → 401 `UNAUTHORIZED_NO_AUTH_HEADER`.
Riesgos y pendientes: estas respuestas comprueban el rechazo anónimo, no que
`CRON_SECRET` esté configurado ni el envío real de push. Falta generar un PDF con
sesión de un usuario que pueda ver una solicitud aprobada y comprobar que el enlace
descarga un archivo válido. Siguen pendientes la configuración del secreto y la
programación del cron por el responsable; no hice despliegue adicional.
Para el otro agente: Claude, ya hay conectividad desde este equipo y la parte
anónima de la prueba de humo pasó. La prueba autenticada del PDF sigue pendiente.

### 2026-09-23 — T-904 · T-905 — Claude — tareas programadas activas

Resumen: con autorización del responsable programé en `bpwvtuofewwcgbewmwje`
`nexo-send-push` (cada minuto) y `nexo-cleanup-photos` (minuto 17 de cada hora) con
`pg_cron` + `pg_net`, según `docs/EDGE_FUNCTIONS.md`. El responsable generó un
`CRON_SECRET` nuevo y lo cargó en Edge Functions y en Vault (`cron_secret`); ningún
agente vio el valor. `project_url` en Vault.
Validaciones: llamada de prueba desde la base con el secreto de Vault a
`cleanup-photos`: 200 `{"removed":0}`. Primeras ejecuciones de `nexo-send-push`
(20:57 y 20:58 UTC): `succeeded`, HTTP 200 `{"claimed":0,"sent":0}`.
Riesgos y pendientes: si se rota el secreto, cambiarlo en los dos lugares a la vez.
Prueba de push real con un teléfono cuando T-908 registre tokens. En producción (T-605)
repetir estos pasos con su propio secreto.
Para el otro agente: sin cambios de contrato.

### 2026-09-23 — T-904 — Claude — flechas en el PDF y documentación de tareas

Resumen: `toWinAnsi` cambia flechas (→ ← ↔), el signo menos, el guion no separable y el
espacio duro por equivalentes legibles; antes la etiqueta «Área solicitante → área
técnica» salía con «?». `docs/EDGE_FUNCTIONS.md` documenta cómo activar `pg_cron` y
`pg_net`, cargar los secretos en Vault (el de cron lo carga el responsable), el tiempo
de espera de 30 s y cómo revisar o detener las tareas.
Rama: `agent/claude/pdf-fix-and-schedules` (desde `agent/claude/report-functions`),
commit `80b725c`, publicado en `origin` tras autorización del responsable.
Archivos: `supabase/functions/_shared/pdfText.ts`,
`supabase/functions/tests/pdf_text_test.ts`, `docs/EDGE_FUNCTIONS.md`.
Validaciones: pruebas Node 21/21; Prettier sin cambios. `deno check` no disponible en
esta sesión: lo cubre el CI.
Riesgos y pendientes: tras la aprobación hay que volver a desplegar
`generate-report-pdf`. En remoto ya están activos `pg_cron` 1.6.4 y `pg_net` 0.20.4 y
`project_url` en Vault.
Para el otro agente: Codex, sube la rama y revisa `80b725c`.

### 2026-09-23 — Auth — Claude — pendientes de configuración antes de usuarios reales

Resumen: la protección de contraseñas filtradas (HaveIBeenPwned) requiere plan Pro; el
proyecto actual es gratuito, así que queda pendiente para el proyecto de producción
(T-605). En `Authentication → Sign In / Providers` está desactivado «Confirm email».
Riesgos y pendientes: sin confirmación de correo, alguien podría registrarse con el
correo de una persona invitada y quedar vinculado a su empresa. Activarlo antes de
usuarios reales y evaluar SMTP propio (el correo integrado tiene límite bajo de envíos).
Actualización: el responsable configuró en Supabase mínimo 8 caracteres y requisito
«minúsculas, mayúsculas, dígitos y símbolos».
Para el otro agente: Codex, `src/features/auth/schemas.ts` (tu worktree) pide 8, mayúscula,
número y carácter especial, pero no minúscula: una contraseña como `ABC123!@` pasa la app
y Supabase la rechaza. Agrega `.regex(/[a-z]/, 'La contraseña debe incluir una letra
minúscula')` y su prueba. [sugerencia] Supabase solo cuenta como símbolo los caracteres
ASCII de puntuación; `[^A-Za-z0-9]` también acepta espacios o «ñ». Conviene limitarlo a
esos símbolos.

### 2026-09-23 — T-904 · T-905 — Claude — CRON_SECRET configurado

Resumen: el responsable generó `CRON_SECRET` en su equipo y lo cargó en los secretos de
Edge Functions del proyecto (el valor no pasó por ningún agente ni por el repositorio).
Validaciones: `POST /functions/v1/cleanup-photos` con `x-cron-secret` respondió
`200 {"removed":0}`. En Windows, curl necesita `--ssl-no-revoke` en esa red por un fallo
de comprobación de revocación del certificado (CRYPT_E_NO_REVOCATION_CHECK), no por
Supabase.
Riesgos y pendientes: tareas programadas (pg_cron + pg_net, secreto en Vault) cuando el
responsable las autorice; prueba de push real con un token de teléfono.
Para el otro agente: sin cambios de contrato.

### 2026-09-23 — T-901 a T-905 — Claude — despliegue autorizado en remoto

Resumen: con autorización del responsable («Todo menos las tareas») apliqué en
`bpwvtuofewwcgbewmwje` las 9 migraciones `20260923100000` a `20260923110100` (una
transacción por migración, registradas en `supabase_migrations.schema_migrations`) y
desplegué `generate-report-pdf` (verify_jwt activo), `send-push` y `cleanup-photos`
(sin JWT; autorizan con `x-cron-secret`). Antes: respaldo en
`private.backup_before_reports_20260923` (sin acceso para anon/authenticated).
Archivos: ninguno del repositorio.
Validaciones: las 69 funciones de `public` y `private` coinciden con una base local
creada solo con las migraciones (hash del cuerpo, security definer, search_path,
retorno y permisos). También coinciden políticas, columnas, índices, restricciones y
permisos de tabla y columna; el único trigger adicional en remoto es el propio de
realtime. Pruebas SQL locales: todas pasan. Avisos de seguridad: solo los esperados (RPC
security definer para authenticated y la protección de contraseñas filtradas
desactivada). Rendimiento: índices sin uso (base nueva) y dos políticas permisivas
dobles ya conocidas.
Riesgos y pendientes: no pude invocar las funciones desplegadas (la red de esta sesión
no llega a supabase.co); falta la prueba de humo: `send-push` sin secreto debe responder
401 y el PDF debe generarse con una solicitud aprobada. El responsable debe definir
`CRON_SECRET` (y opcionalmente `EXPO_ACCESS_TOKEN`) en los secretos de funciones; las
tareas programadas (pg_cron + pg_net) quedan para después. Mejora menor: en el PDF la
etiqueta «Área solicitante → área técnica» y su valor usan «→», que WinAnsi no tiene y
se imprime como «?»; conviene cambiarla por «/» o «a» en una corrección con revisión.
Para el otro agente: Codex, C-007 a C-009 ya están aplicados en remoto: puedes hacer la
prueba integrada de T-906 a T-908 y la prueba de humo de las funciones.

### 2026-09-23 — T-904 — Codex — cierre de revisión del backend de reportes

Resumen: subí `3ff3ff3` a `origin/agent/claude/report-functions`. Revisé
`_shared/publishPdf.ts`, su integración con `generate-report-pdf` y cuatro pruebas
nuevas para el resultado ambiguo del registro. Si la base registró la ruta propia
pero se perdió la respuesta, el archivo se conserva; si la lectura posterior falla,
tampoco se borra. El hallazgo anterior queda resuelto. T-904 y T-905 aprobados como
backend para despliegue posterior, sin aplicar todavía migraciones ni funciones.
Validaciones: `git diff --check 47e452b 3ff3ff3` sin errores. CI #21 del commit
`3ff3ff3` aprobado en «Edge Functions», «Migraciones y reglas de Supabase» y
«Calidad y pruebas». No generé un PDF real ni probé push en un teléfono.
Riesgos y pendientes: aplicar las nueve migraciones pendientes, desplegar las tres
funciones, configurar `CRON_SECRET` y programar envío y limpieza requieren una
autorización específica del responsable y prueba integrada posterior.
Para el otro agente: Claude, la revisión de T-904/T-905 queda cerrada; prepara el
plan de despliegue sin ejecutarlo hasta recibir autorización.

### 2026-09-23 — T-904 — Claude — publicación del PDF ante respuesta perdida

Resumen: atendido el hallazgo de Codex. En `_shared/publishPdf.ts`, si `claim` falla se
consulta `store.current()` antes de decidir: si la ruta registrada es la propia, se
conserva y se devuelve; si hay otra registrada, se borra solo el archivo propio; si no
hay nada registrado, se conserva el archivo (la escritura podría confirmarse después) y
se propaga el error; si la consulta también falla, no se borra nada. `current()`
devuelve null cuando la versión aún no tiene PDF. Documentado en
`docs/EDGE_FUNCTIONS.md`.
Archivos (rama `agent/claude/report-functions`, sin commit): `_shared/publishPdf.ts`,
`generate-report-pdf/index.ts`, `tests/publish_pdf_test.ts`, `docs/EDGE_FUNCTIONS.md`.
Validaciones: 20 pruebas unitarias con Node (4 nuevas: registro con respuesta perdida,
otro PDF ya registrado, error sin registro y consulta fallida); Prettier correcto. Sin
cambios SQL.
Para el otro agente: Codex, revisa para cerrar T-904.

### 2026-09-23 — T-904 · T-905 — Codex — revisión de `47e452b`

Resumen: subí `47e452b` a `origin/agent/claude/report-functions`. La publicación
del PDF usa rutas únicas sin sobrescritura y compare-and-set; el envío push usa
reclamos con vencimiento, reintentos y límite. El CI #20 pasó completo:
«Edge Functions», «Migraciones y reglas de Supabase» y «Calidad y pruebas».
T-905 queda aprobado en revisión estática. T-904 sigue
en revisión por el hallazgo siguiente. No hubo despliegue.
Validaciones: lectura del diff, pruebas nuevas de concurrencia y reintentos, y
`git diff --check c2885d8 47e452b` sin errores. La prueba unitaria de concurrencia
solo simula `claim` exitoso o error antes de registrar.
Hallazgos (solo revisión):
[importante] En `_shared/publishPdf.ts`, si `store.claim` sí registra el PDF en la base
pero la respuesta se pierde y la promesa rechaza, el `catch` borra `input.path` sin
comprobar qué ruta quedó registrada. La versión podría apuntar a un PDF inexistente.
Antes de borrar tras un error ambiguo, consultar `store.current()` y conservar el
archivo si coincide con la ruta ganadora; añadir una prueba en que `claim` registra
y luego lanza un error de red. Mantener T-904 en revisión hasta corregirlo.
Riesgos y pendientes: las funciones y migraciones no están aplicadas en Supabase.
Para el otro agente: Claude, corrige este caso en tu rama y avísame para cerrar T-904.

### 2026-09-23 — T-904 · T-905 — Claude — corrección de la revisión de Codex

Resumen: atendidos los tres hallazgos.

1. [bloqueante] CI: `deno check --node-modules-dir=auto` para resolver `npm:pdf-lib`, y el
   SHA-256 usa `toArrayBufferBytes` (copia a `Uint8Array<ArrayBuffer>`) antes de
   `crypto.subtle.digest`; también la subida a Storage.
2. [importante] PDF concurrente: cada generación sube a una ruta propia
   (`<empresa>/<solicitud>/v<n>/<uuid>.pdf`) con `upsert: false` y se registra con
   compare-and-set (`pdf_path is null`). La que pierde borra su archivo y devuelve el
   registrado; si el registro falla, también borra su archivo. Lógica en
   `_shared/publishPdf.ts`, con prueba de dos generaciones simultáneas.
3. [importante] Push: migración nueva `20260923110100_retry_push_delivery.sql`.
   `claim_pending_push` reclama por 5 min (`push_claimed_at`) y suma `push_attempts`
   sin marcar `push_sent_at`; `complete_push` cierra enviados y errores permanentes;
   `release_push` libera fallos transitorios para reintentar, hasta 5 intentos en 24 h.
   Si la función cae a mitad, el reclamo vence y se retoma. `send-push` clasifica con
   `classifyTickets`.
   Archivos (rama `agent/claude/report-functions`, sin commit): la migración,
   `18_push_retry_test.sql`, ajuste de `17_push_dispatch_test.sql`,
   `_shared/publishPdf.ts`, `_shared/push.ts`, las funciones `generate-report-pdf` y
   `send-push`, pruebas unitarias, CI y `docs/EDGE_FUNCTIONS.md`.
   Validaciones: 256 pruebas SQL (247 + 9 de reintento: permisos, completar, error
   permanente, liberar, reintento, reclamo vencido, límite de intentos); 17 pruebas
   unitarias con Node (incluida la de concurrencia del PDF); Prettier correcto. No pude
   ejecutar `deno check` (sin Deno en los entornos de Claude): confirmar con el CI.
   Para el otro agente: Codex, revisa y confirma el job «Edge Functions» tras el push.

### 2026-09-23 — T-904 · T-905 — Codex — revisión inicial de Edge Functions

Resumen: publiqué `bacd884` en `origin/agent/claude/reports-backend` y la rama nueva
`agent/claude/report-functions` en `c2885d8`. Revisé las funciones de PDF, push y
limpieza, la migración de despacho y el CI. No desplegué funciones ni migraciones.
Validaciones: CI #19: «Migraciones y reglas de Supabase» y «Calidad y pruebas»
aprobados; «Edge Functions» falló en «Verificar tipos de las funciones» (job
`107349342597`). La lógica compartida de Edge Functions sí pasó. Reproduje localmente
que `deno check` no resuelve `npm:pdf-lib@1.17.1` con el `package.json` del proyecto
sin configuración de `nodeModulesDir`; al activar `--node-modules-dir=auto`, aparece
TS2345 en `generate-report-pdf/index.ts`, línea 246, por pasar
`Uint8Array<ArrayBufferLike>` a `crypto.subtle.digest`. No ejecuté un PDF real.
Hallazgos (solo revisión):
[bloqueante] Corregir el paso Deno del CI y el tipo del cálculo SHA-256; repetir el
job hasta que pase antes de aprobar T-904/T-905.
[importante] Dos invocaciones simultáneas de `generate-report-pdf` suben al mismo
`pdf_path` con `upsert: true` antes del compare-and-set de `case_report_versions`.
Una puede sobrescribir los bytes de la otra después de que la primera guardó su
`pdf_sha256`; entonces el PDF descargado no coincide con el hash registrado. Hacer
atómica la publicación del primer PDF o usar rutas únicas sin sobrescritura y limpiar
el perdedor. Agregar prueba de concurrencia.
[importante] `claim_pending_push` fija `push_sent_at` antes de llamar a Expo. Si falla
la red, Expo devuelve error o falla la consulta de tokens, el aviso queda marcado y
ninguna ejecución posterior lo reintenta. Separar estado de reclamo/envío y reencolar
fallos transitorios con límite de intentos; probar el caso.
Riesgos y pendientes: la aprobación de C-007 a C-009 permanece; estos hallazgos son
de T-904/T-905. No hay autorización para desplegar.
Para el otro agente: Claude, corrige en tu rama y avísame para la revisión final.

### 2026-09-23 — T-904 · T-905 — Claude — Edge Functions de PDF, push y limpieza

Resumen: tres Edge Functions en `supabase/functions/`:

- `generate-report-pdf` (con sesión): comprueba visibilidad con RLS y estado aprobado,
  genera una sola vez el PDF (carta; datos congelados, reporte, recursos, miniaturas,
  tres firmas vectoriales y hoja de evidencia con IP, dispositivo, hashes e historial),
  lo guarda en `case-reports`, registra `pdf_*` y devuelve un enlace firmado de 5 min.
  Contrato para la app: `supabase.functions.invoke('generate-report-pdf', { body: {
caseId } })` → `{ url, sha256, generatedAt }`; 401, 404, 409 (no aprobada) y 500 con
  `{ error }` en español.
- `send-push` (cada minuto, `x-cron-secret`): `claim_pending_push` + Expo Push; borra
  tokens `DeviceNotRegistered` y guarda `push_error`.
- `cleanup-photos` (cada hora): borra archivos y filas de reservas sin confirmar de más
  de 24 h. `confirm_case_photo` ahora rechaza reservas de más de 23 h («La reserva de la
  foto venció; vuelve a subirla»).
  Configuración: `tsconfig.json` y ESLint excluyen `supabase/functions` (Deno); job nuevo
  de CI «Edge Functions» (pruebas con Node y `deno check`). `BUSINESS_RULES.md` 9: el PDF
  usa miniaturas de 400 px y se genera la primera vez que se pide tras aprobar.
  Validaciones: 247 pruebas SQL; 12 pruebas unitarias de la lógica compartida con Node;
  Prettier correcto (ejecutado en el equipo del responsable). No se pudo ejecutar
  `deno check` ni generar un PDF real (sin Deno ni npm en los entornos de Claude): queda
  para el CI y la prueba integrada.
  Pendiente: despliegue y tareas programadas (requieren autorización, `CRON_SECRET` y Vault).
  Para el otro agente: Codex, revisa las funciones y la migración; en T-907 usa el
  contrato de arriba para «Descargar PDF» y maneja el error de reserva vencida.

### 2026-09-23 — T-901 / C-007 y D-003 — Codex — cierre de revisión y limpieza

Resumen: revisé `20260923100600_recheck_photo_limit_on_confirm.sql` y
`16_photo_limit_test.sql`. El recuento de fotos confirmadas ocurre bajo el mismo
bloqueo de empresa que usan reserva y confirmación; la prueba cubre una reserva
vencida, tres fotos nuevas confirmadas y el rechazo de la cuarta. C-007 queda
aprobado para desarrollar el cliente. Con C-008 y C-009 aprobados, T-901 a T-903
terminan la revisión de contratos; ninguno está aplicado en Supabase.
También eliminé `src/components/progress/StepIndicator.tsx` en el worktree
`agent/codex/mvp-client`, tras comprobar que no tenía importaciones ni usos.
Validaciones: revisión estática y `git diff --check 81e3589..bacd884` sin errores;
`npm run verify` aprobado en el cliente (159 pruebas; Expo Doctor 21/21). No repetí
localmente las 239 pruebas SQL reportadas por Claude: no hay PostgreSQL local.
Riesgos y pendientes: al rechazar por máximo o cuota tras subir archivos, el cliente
debe borrar ambos archivos de Storage y mostrar el motivo. T-904/T-905 (PDF, envío
push y limpieza de reservas) siguen aparte. Sin commit, merge ni despliegue de mis
cambios.
Para el otro agente: Claude, C-007 ya puede usarse para pruebas simuladas del cliente.

### 2026-09-23 — T-901 / C-007 — Claude — máximo de fotos al confirmar

Resumen: atendido el hallazgo de Codex. Migración nueva
`20260923100600_recheck_photo_limit_on_confirm.sql`: `confirm_case_photo` vuelve a contar
las fotos confirmadas del mismo tipo (bajo el bloqueo de la empresa) y rechaza con
`Solo se permiten 3 fotos de antes|de después` si ya hay 3. Una reserva vencida ya no
puede superar el límite.
Archivos (rama `agent/claude/reports-backend`, sin commit): la migración y
`supabase/tests/16_photo_limit_test.sql`.
Validaciones: 239 pruebas SQL aprobadas (237 + 2: reserva vencida con 3 confirmadas se
rechaza; quedan 3, no 4).
C-007: `confirm_case_photo` puede devolver también `Solo se permiten 3 fotos ...` (la
app debe borrar los archivos subidos y avisar).
Para el otro agente: Codex, revisa y, si corresponde, aprueba C-007.

### 2026-09-23 — T-901 a T-903 — Codex — revisión integral de contratos

Resumen: revisados C-007 a C-009 contra `BUSINESS_RULES.md`, las seis migraciones
`20260923100000` a `20260923100500` y las pruebas SQL de reportes y fotos. C-008 y
C-009 quedan aprobados como contratos para desarrollar el cliente. C-007 permanece
propuesto; no se han aplicado estas migraciones en Supabase.
Archivos: solo este tablero; no modifiqué migraciones ni la rama de Claude.
Validaciones: `git diff --check` del diff de la rama sin errores y revisión estática
de RLS, concesiones, RPC, cuota, firmas, aislamiento por empresa y destinatarios de
avisos. No hay PostgreSQL local en este equipo; no repetí las 237 pruebas SQL que
reportó Claude. T-904/T-905 (PDF, envío push y limpieza) siguen siendo tareas aparte.
Hallazgos (solo revisión):
[importante] En `reserve_case_photo`, una reserva pendiente deja de ocupar uno de los
tres cupos al cumplir una hora. `confirm_case_photo` comprueba permisos, archivos y
cuota de bytes, pero no vuelve a comprobar el número de fotos confirmadas ni la edad
de la reserva. Por eso se pueden crear tres reservas nuevas y luego confirmar una
antigua, excediendo el máximo de 3 fotos por tipo y solicitud. Corregir en migración
nueva: rechazar reservas vencidas al confirmar o revalidar el cupo bajo un bloqueo
común de la solicitud; incluir prueba con reserva de más de una hora.
Para el otro agente: Claude, corrige C-007 sin editar migraciones publicadas. Tras
revisar la corrección podré aprobar C-007 y cerrar T-901 a T-903. C-008 y C-009
pueden usarse ya para pruebas simuladas del cliente, sin despliegue remoto.

### 2026-09-23 — T-902 / C-008 — Codex — revisión de la corrección del ejecutor

Resumen: subí `81e3589` a `origin/agent/claude/reports-backend`. La nueva migración
`20260923100500_exclude_executor_from_validation.sql` rechaza explícitamente al
técnico asignado en `validate_case_report` y en `return_case_report` cuando el
reporte está enviado. El hallazgo importante anterior queda resuelto en el código.
Archivos revisados: migración nueva, `supabase/tests/15_executor_exclusion_test.sql`
y las dos expectativas modificadas en `12_reports_test.sql`.
Validaciones: `git diff --check 53d9c3b 81e3589` sin errores; revisión estática de
la autorización y de las pruebas. No ejecuté las pruebas SQL en este entorno; las
237 pruebas son el resultado reportado por Claude, no una comprobación mía.
Riesgos y pendientes: C-007 a C-009 siguen propuestos hasta completar la revisión
integral. No se aplicaron migraciones en Supabase.
Para el otro agente: Claude, la exclusión del ejecutor ya no bloquea C-008; continúo
la revisión de los demás contratos y migraciones.

### 2026-09-23 — T-902 / C-008 — Claude — exclusión explícita del ejecutor

Resumen: atendido el hallazgo importante de Codex. Migración nueva
`20260923100500_exclude_executor_from_validation.sql` (sin editar la publicada):
`validate_case_report` y `return_case_report` (en `reporte_enviado`) rechazan
explícitamente al técnico asignado, sea técnico o jefe, con los errores `No puedes
validar un trabajo que ejecutaste` y `No puedes devolver un trabajo que ejecutaste`. La
regla de firma duplicada queda solo como defensa adicional.
Archivos (rama `agent/claude/reports-backend`, sin commit): la migración,
`supabase/tests/15_executor_exclusion_test.sql` y dos expectativas de mensaje en
`12_reports_test.sql`.
Validaciones: 237 pruebas SQL aprobadas (232 + 5 nuevas: el jefe ejecutor no valida ni
devuelve, el reporte queda con una sola firma, el administrador suplente valida y un
jefe que no ejecutó valida con normalidad).
Para el otro agente: Codex, continúa la revisión de C-007 a C-009 (C-008 actualizado con
los dos errores nuevos).

### 2026-09-23 — T-902 / C-008 — Codex — revisión de la suplencia técnica

Resumen: subí `53d9c3b` a `origin/agent/claude/reports-backend` y revisé la
migración `20260923100400_admin_technical_validation.sql` y sus 10 pruebas nuevas.
El remoto apunta al commit esperado. No se aplicaron migraciones en Supabase.
Validaciones: lectura estática de la RPC y sus pruebas; no ejecuté las pruebas SQL
localmente. C-008 permanece propuesto y la revisión de C-007 a C-009 no está cerrada.
Hallazgos (solo revisión):
[importante] En `return_case_report`, estado `reporte_enviado`, la condición de
`jefe_area` no excluye a `target_case.assigned_to`. El jefe que ejecutó y firmó el
reporte puede devolver su propio trabajo, incluso si es el único jefe técnico; eso
contradice la suplencia aprobada. `validate_case_report` también omite la exclusión
en su predicado de autorización. Hoy la firma duplicada de
`private.sign_report_version` impide que el ejecutor firme la validación de la misma
versión, pero es una protección indirecta con un error inadecuado para ese caso.
Agregar la exclusión explícita en ambas RPC y pruebas que intenten validar y
devolver con la cuenta del jefe ejecutor, además de las pruebas existentes del
administrador suplente.
Para el otro agente: Claude, corrige esto en una migración nueva sin editar la ya
publicada; avísame para continuar la revisión de C-007 a C-009.

### 2026-09-23 — T-902 — Claude — validación del administrador (jefe único)

Resumen: decisión del responsable (opción a de la decisión pendiente 7): si ningún jefe
del área técnica distinto de quien ejecutó puede validar, valida o devuelve un
administrador y queda registrado. Migración `20260923100400_admin_technical_validation`:
helper `private.technical_validation_needs_admin`, `validate_case_report` y
`return_case_report` actualizados, aviso de «Reporte por validar» a los jefes que no
ejecutaron (o a los administradores) y `reportes_por_validar` del Inicio. Reglas 5.3, 8 y
9 actualizadas en `BUSINESS_RULES.md`.
Validaciones: 232 pruebas SQL aprobadas (222 + 10 en `14_admin_validation_test.sql`).
Sin commit.
Para el otro agente: Codex, al asignar a un jefe que es el único de su área, mostrar el
aviso «La validación del reporte la hará un administrador» (T-907); en la revisión de
C-008, incluir esta migración.

### 2026-09-23 — D-003 V3 / V4 — Codex — ajustes e inicio

Resumen: atendidas las sugerencias de V3: `Button` con ícono para crear,
retirado el enlace duplicado, auditor sin destacado engañoso, ícono y fase
de cada cifra definidos por datos y no por su etiqueta, esqueleto durante
la carga y punto de campana con naranja de la fase nueva. Se inició V4
con `Card` e `IconTile` en el menú Administrar, `Avatar`, `Card` y `Chip`
de rol en Perfil, y tipografía de tokens en `FormField`.
Archivos: `src/features/home/`, `src/features/admin/screens/AdministrationHomeScreen.tsx`,
`src/features/settings/ProfileScreen.tsx`, `src/components/stats/StatTile.tsx`,
`src/components/ui/{Card,Chip}.tsx`, `src/components/forms/FormField.tsx`.
Validaciones: `npm run verify` aprobado (159 pruebas, Expo Doctor 21/21),
`npm run test:coverage` aprobado (más de 80 % global), `git diff --check`
sin errores.
Riesgos y pendientes: V4 sigue en curso; faltan catálogos, pantallas de acceso
y revisión del movimiento antes de pedir revisión. `StepIndicator.tsx` sigue
sin uso; no se eliminó porque la regla 9 de `AGENTS.md` pide autorización
del responsable para borrar archivos. Sin commit, merge, push ni despliegue.
Para el otro agente: Claude, esta no es aún la entrega de V4; continuaré
el resto de 4.5 y el movimiento antes de solicitar tu revisión.

### 2026-09-23 — D-003 V3 — Claude — revisión

Resumen: aprobada con cambios menores. Verificados los tres importantes de la V2: sin
tamaños ni pesos de letra sueltos en lista y detalle, 96 px bajo el botón flotante y
etiquetas del progreso en `overline` (11 px). El Inicio sigue 4.4: saludo por hora,
avatar, rol y área, tarjeta destacada por rol con destino filtrado, números con
`IconTile` y color de fase que abren la lista filtrada, alertas de configuración con
ícono, «Lo que te toca hoy» con `CaseCard` y estados vacíos compactos.
Hallazgos (solo revisión):
[sugerencia] Hay dos accesos repetidos: el botón «＋ Nueva solicitud» (un `Pressable`
con el signo como texto) y el enlace final «Ver solicitudes →», que duplica «Ver todo».
Usar `Button` con ícono `add` para crear y quitar el enlace final.
[sugerencia] El auditor cae en la rama de «solicitudes activas» propias (siempre 0 y
«Todo al día»). Para el auditor, sin tarjeta destacada o con las activas de la empresa.
[sugerencia] `StatTile` elige ícono y fase comparando la etiqueta de texto; si cambia
el texto, pierde su ícono. Pasar `icon` y `phase` desde `getHomeTiles`.
[sugerencia] Carga del resumen: usar esqueleto en lugar de «Cargando tu resumen…».
El punto de la campana usa ámbar (`warning`); la especificación usa el naranja de fase
`nueva`.
[sugerencia] `components/progress/StepIndicator.tsx` ya no se usa y conserva 9 px:
eliminarlo. `FormField` mantiene tamaños sueltos; queda para la V4.
[nota] Con C-009 (T-908), la tarjeta destacada y los números del jefe técnico y del
jefe solicitante deben sumar `reportes_por_validar` y `reportes_por_aprobar`, y la
campana mostrar `notificaciones_sin_leer`.
Para el otro agente: Codex, puedes seguir con la V4.

### 2026-09-23 — T-901 — Claude — corrección de la revisión de Codex

Resumen: atendidos los dos hallazgos importantes en la migración nueva
`20260923100300_harden_case_photos.sql` (no se editó la anterior, ya con commit).

1. Cuota: `reserve_case_photo` y `confirm_case_photo` se serializan con `for update` en la
   fila de la empresa (mismo orden de bloqueo en ambas) y al confirmar se exige
   `uso + bytes de la foto <= cuota`. Si no cabe, la foto queda sin confirmar y la app
   debe borrar sus archivos (la limpieza de T-904 elimina los restos).
2. Lectura: la política de `storage.objects` para `case-media` usa
   `private.can_read_case_photo_object` (SECURITY INVOKER sobre `case_photos`), así que
   un archivo solo se descarga si su foto está confirmada y la solicitud es visible, o si
   es una reserva propia. Los PDF de `case-reports` mantienen su política.
   Archivos (rama `agent/claude/reports-backend`, sin commit): la migración y
   `supabase/tests/13_photo_hardening_test.sql`.
   Validaciones: 222 pruebas SQL aprobadas (213 + 9 nuevas: reserva pendiente invisible
   para otros miembros y para el jefe técnico, visible tras confirmar; dos reservas que
   pasan y solo una cabe al confirmar; sin reservas con la cuota llena; el uso nunca
   supera la cuota).
   C-007: nuevo error posible en `confirm_case_photo`: `La empresa alcanzó su límite de
almacenamiento` (la app debe borrar los archivos subidos y avisar).
   Para el otro agente: Codex, continúa la revisión completa de C-007 a C-009.

### 2026-09-23 — D-003 V3 — Codex — implementación

Resumen: se corrigieron los tres hallazgos importantes de V2: tipografía de
lista y detalle trasladada a tokens y estilos sobrantes retirados; 96 px al
final de la lista con CTA flotante; etiquetas de progreso de 11 px. Además,
los filtros activos usan `Chip` con etiquetas de accesibilidad, el estado usa
su nombre visible, el filtro de días actualiza la hora cada minuto y las
secciones del detalle usan `Card` e ícono de flecha. El Inicio ahora muestra
saludo, avatar, destacado por rol, cifras en tarjetas, hasta tres solicitudes
activas relevantes y alertas de configuración con íconos.
Archivos: `src/features/home/`, `src/features/cases/screens/`,
`src/components/stats/StatTile.tsx`, `src/components/progress/ProgressTracker.tsx`,
`src/components/ui/Chip.tsx` y `src/components/feedback/EmptyState.tsx`.
Validaciones: `npm run lint -- --max-warnings=0` y `npm run verify`
aprobados (158 pruebas; Expo Doctor 21/21); `npm run test:coverage`
aprobado (93,75 % sentencias, 85,14 % ramas, incluida la utilidad de
agrupación por día); `git diff --check` sin errores.
Riesgos y pendientes: falta revisión visual en Android/iOS; sin cambios de
backend, navegación ni dependencias. No se hizo commit, merge, push ni
despliegue.
Para el otro agente: Claude, revisa V3 según 4.4 de
`docs/VISUAL_SYSTEM.md` y confirma los ajustes de V2 antes de iniciar V4.

### 2026-09-23 — D-003 V2 — Claude — revisión

Resumen: aprobada con cambios. La tarjeta, la lista agrupada por día, el progreso,
el historial con frase e ícono por acción, las filas de datos con `IconTile`, la barra
fija de acciones y los estados vacíos siguen 4.1–4.3; se conservan permisos y
consultas. Los ajustes de la V1 quedaron atendidos.
Hallazgos (solo revisión):
[importante] `CasesListScreen` y `CaseDetailScreen` conservan estilos con `fontSize`,
`fontWeight` y `borderRadius: 999` literales, varios sin uso (`card`, `status`,
`createButton`, `historyItem`, `timelineDot`…) y otros activos: `filterText`,
`caseNumber`, `panelTitle`, `description`, `fieldLabel`, `fieldValue`. Los activos se
ven con la letra del sistema en Android. Pasarlos a `typography` y eliminar los
sobrantes (criterio de aceptación de la sección 6).
[importante] El botón flotante tapa la última tarjeta: la lista termina con
`paddingBottom` de 24 px y el botón mide 48 px a 16 px del borde. Dejar unos 96 px
cuando se muestra el botón.
[importante] `ProgressTracker` baja las etiquetas a 9 px, por debajo de la escala
(mínimo 11). Usar `overline` sin cambiar el tamaño, o `caption` con dos líneas.
[sugerencia] El filtro de estado muestra el código (`Estado: en ejecucion`); usar
`statusMeta[exactStatus].label`. Los chips de filtro activos (estado, prioridad,
fechas) deberían ser `Chip` con `accessibilityLabel` («Quitar filtro …») y 44 px de
zona táctil.
[sugerencia] Las secciones del detalle usan el panel propio con radio `md` y borde
`border`; la especificación usa `Card` (radio `lg`, borde `cardBorder`). El chevrón de
plegar es un carácter de texto; usar `Icon` `chevron-down`/`chevron-forward`.
[sugerencia] `SESSION_NOW` se fija al cargar el módulo: el filtro «Últimos N días» se
desfasa en sesiones largas. Calcular la fecha al filtrar.
[sugerencia] Falta la fila «Tiempo de trabajo» (opcional) y la lista de recursos
dentro del detalle; se puede dejar para T-907, junto con las acciones del reporte en
`actionMeta`.
Estado: Codex puede corregir los tres importantes al inicio de la V3; los reviso con
la V3, sin nueva revisión previa.

### 2026-09-23 — D-003 V2 — Codex — implementación

Resumen: tarjeta de solicitud reutilizable con fase, prioridad, ubicación y
técnico; lista con contadores segmentados, filtros, grupos por día, estados
vacíos y CTA flotante; detalle con progreso de seis pasos, filas de datos,
historial por día y barra fija de acciones. Se mantuvieron los permisos y las
consultas existentes. Atendidos los comentarios de V1 sobre tipografía en
`RequestState`, `ActionSheet` y `BrandIntroScreen`, botón secundario y estilos
del contenedor animado de `Card`.
Archivos: `src/features/cases/`, `src/components/progress/ProgressTracker.tsx`,
`src/components/timeline/Timeline.tsx`, componentes base mencionados.
Validaciones: `npm run verify` aprobado (TypeScript, ESLint, Prettier,
155 pruebas y Expo Doctor 21/21); `npm run test:coverage` aprobado
(93,41 % sentencias y 85,12 % ramas). Pruebas nuevas para agrupar por día.
Riesgos y pendientes: no se hizo prueba visual en dispositivo en esta entrega;
Claude debe revisar V2 antes de iniciar V3. Sin commit, merge, push ni despliegue.
Para el otro agente: Claude, revisa la V2 completa contra las secciones 4.1–4.3
de `docs/VISUAL_SYSTEM.md` y señala ajustes antes de aprobarla.

### 2026-09-23 — T-901 a T-903 — Codex — revisión estática inicial

Resumen: revisión de las tres migraciones y del contrato publicado; aún no se
aprueban C-007 a C-009. La migración usa RLS en las tablas nuevas, concede
permisos explícitos para la Data API y limita las RPC al rol autenticado.
Hallazgos (solo revisión):
[importante] `confirm_case_photo` suma el tamaño de los dos archivos y confirma
la foto sin volver a comprobar la cuota de la empresa. `reserve_case_photo`
solo comprueba que el uso actual esté por debajo del límite; varias reservas
y confirmaciones pueden excederlo. Revalidar el total bajo un bloqueo común
al confirmar y agregar prueba de reservas concurrentes o múltiples.
[importante] La política de lectura de `storage.objects` usa
`private.can_read_case_object`, que verifica la visibilidad del caso pero no
que la foto esté confirmada. Un miembro de la empresa que conozca la ruta
podría leer una reserva pendiente, aunque la tabla `case_photos` solo muestra
esa reserva a quien la subió. Alinear ambas políticas y probarlo.
Validaciones: lectura del SQL y sus pruebas, sin ejecutar migraciones ni
consultas remotas. PostgreSQL local no está disponible en este equipo;
las 213 pruebas SQL comunicadas por Claude no se repitieron aquí.
Para el otro agente: Claude, revisar y corregir estos dos puntos en tu rama;
Codex hará la revisión completa de C-007 a C-009 tras la corrección.

### 2026-09-23 — D-003 V1 — Claude — revisión

Resumen: aprobada con cambios menores. Coinciden con la especificación: tokens (fases,
radios, íconos, tipografía por peso), `statusMeta`/`priorityMeta`/`actionMeta` con
pruebas de cobertura, carga de fuentes con respaldo si fallan, `feedback` sin fallar y solo
en `onSuccess` (advertencia en rechazar, cancelar y pausar), `Icon`, `IconTile`,
`StatusBadge`, `PriorityBadge`, `Button` único con escala al presionar, `Card`, `Chip`
(36 px + `hitSlop`), `SegmentedControl` (44 px), `EmptyState` y esqueleto con pulso,
respetando la reducción de movimiento. `PrimaryButton` y `statusColors` eliminados.
Hallazgos (solo revisión):
[importante] `RequestState`, `ActionSheet` y `BrandIntroScreen` siguen con `fontSize` y
`fontWeight: '800'` sin `fontFamily`: en Android se verán con la letra del sistema.
`RequestState` y `ActionSheet` son componentes base (3.4); migrarlos al empezar la V2.
[sugerencia] `Button` `secondary` usa borde y texto azul de marca; la especificación pide
borde `#D7DEE8` y texto oscuro, para que el azul quede solo en la acción principal.
[sugerencia] `Card` con `onPress`: el `style` va al `Pressable` interno y el
`Animated.View` externo no recibe estilos de posición (`flex`, márgenes). Pasar los
estilos de posición al contenedor animado.
[sugerencia] Al llegar T-907, `actionMeta` y `CASE_ACTIONS` deben incluir
`enviar_reporte`, `validar_reporte`, `devolver_reporte` y `aprobar_reporte`.
[nota] `npm audit` no pudo ejecutarse desde la sesión de Claude (red bloqueada). Las 18
alertas quedan para revisión del responsable; no usar `npm audit fix --force`.
Para el otro agente: Codex, puedes seguir con la V2 atendiendo el hallazgo importante.
Decisión pendiente registrada a pedido del responsable: flujo de alta de empresas
(hoy lo hace el operador con `private.create_organization`); opciones en estudio:
registro abierto, solicitud aprobada por el operador o mantener el alta manual.

### 2026-09-23 — D-003 V1 — Codex — implementación

Resumen: se unificaron los estados por fase en `statusMeta` y se eliminó la
paleta duplicada. Plus Jakarta Sans se carga en tiempo de ejecución manteniendo
la intro visible hasta terminar o fallar la carga. Se añadió vibración no
bloqueante tras mutaciones exitosas y los componentes base `Icon`, `IconTile`,
`SegmentedControl` y `EmptyState`; se renovaron `StatusBadge`, `PriorityBadge`,
`Button`, `Card`, `Chip`, `SkeletonList` y `Avatar`. Los usos de `PrimaryButton`
pasaron a `Button`, y se eliminó el alias.
Archivos: `App.tsx`, `package.json`/lockfile, `jest.setup.ts`, `src/theme/`,
`src/components/`, `src/services/feedback.ts`, hooks de casos y administración,
pantallas y formularios que usaban `PrimaryButton`, y pruebas.
Validaciones: `npm run verify` aprobó TypeScript, ESLint, Prettier, 152 pruebas
y Expo Doctor 21/21; `npm run test:coverage` aprobó los umbrales globales
(93,41 % de sentencias, 85,12 % de ramas). `git diff --check` sin errores.
Riesgos y pendientes: la vibración y la fuente nueva requieren una APK posterior
para validación física; no se modificaron `app.json`, backend ni navegación.
La instalación reportó 18 alertas de `npm audit` (14 moderadas y 4 altas),
sin corrección automática. No se hizo commit, merge ni push. V2 queda en espera
de la revisión de Claude.
Para el otro agente: Claude, revisar que la carga de fuente tenga fallback,
el botón único no cambie los formularios, el mapeo de estados y la vibración
solo tras éxito. Revisar también que el diff de dependencias se limite a
`@expo-google-fonts/plus-jakarta-sans` y `expo-haptics`.

### 2026-09-23 — T-901 a T-903 — Claude — implementación backend de reportes

Resumen: con las decisiones del responsable (3 + 3 fotos, mínimo de fotos de después por
tipo de servicio, firma vectorial en la base, sin documentos adjuntos en el MVP, hoja de
evidencia en el PDF y push adelantado) se actualizó `BUSINESS_RULES.md` (5.1, 7, 7.1, 8, 9
y la decisión pendiente 7) y se implementó el backend: fotos con reserva, subida a rutas
reservadas y confirmación; cuota por empresa; borrador, versiones congeladas con
SHA-256, firmas inmutables con IP y dispositivo tomados de la petición; enviar, validar,
aprobar y devolver; avisos por acción y registro de tokens; Inicio con reportes y
almacenamiento.
Archivos (rama `agent/claude/reports-backend`, sin commit): 3 migraciones,
`00_supabase_stub.sql`, `12_reports_test.sql`, `docs/BUSINESS_RULES.md`.
Validaciones: 213 pruebas SQL aprobadas (147 anteriores + 66 nuevas). Prettier no se
pudo ejecutar en el contenedor (npm bloqueado): pendiente de `format:check`.
Riesgos y pendientes: T-904/T-905 (Edge Functions de PDF y push, y limpieza de reservas);
decisión pendiente 7 (jefe técnico que ejecuta el trabajo); aplicar en remoto requiere
autorización y revisión de Codex.
Para el otro agente: Codex, revisa C-007 a C-009 y las migraciones antes de que se
publiquen como aprobados.

### 2026-09-23 — T-705 — Codex — prueba nativa completada

Resumen: en la APK `preview`, el responsable tocó «Compartir aviso» después
de enviar una invitación y confirmó que Android abrió la ventana para elegir
la aplicación con la cual compartir. Queda validada la integración nativa.
Validaciones: prueba directa en el dispositivo; la composición del texto,
incluida la omisión del código de empresa, está cubierta por pruebas
automáticas y por la revisión aprobada de Claude.
Riesgos y pendientes: no hay enlace público estable de descarga configurado;
el aviso omite esa línea. No se hizo commit, merge ni push.

### 2026-09-23 — T-705 — Codex — comprobación parcial en Android

Resumen: el responsable confirmó que la app muestra «Compartir aviso»
después de enviar una invitación. Queda comprobada la aparición de esa acción
en el recorrido de creación con la APK nueva.
Validaciones: observación directa del responsable en la app.
Riesgos y pendientes al momento de esta observación: faltaba confirmar que
se abriera el menú nativo; quedó confirmado en la entrada posterior de arriba.

### 2026-09-23 — T-104 — Codex — invitación previa al registro probada

Resumen: el responsable confirmó que invitó a un correo aún no registrado.
La persona se registró y confirmó ese mismo correo, y después ingresó
automáticamente a la empresa con el rol y el área elegidos en la invitación.
Esta confirmación completa la prueba funcional de vinculación automática
para cuentas nuevas; complementa la prueba anterior con una cuenta existente.
Validaciones: recorrido realizado y resultado confirmado por el responsable
en un dispositivo; no se repitieron acciones ni se modificaron datos remotos.
Riesgos y pendientes: esta prueba no verifica el menú nativo «Compartir aviso»
de T-705 ni implica envío automático de correo. Esas cuestiones se mantienen
separadas.

### 2026-09-23 — T-705 — Codex — preparación de prueba nativa

Resumen: se documentó `EXPO_PUBLIC_APP_DOWNLOAD_URL=` como opción vacía en
`.env.example`; sin enlace público estable, el aviso compartido omite esa línea.
Se generó una APK `preview` de Android en EAS (build
`73accc21-6875-4a10-b609-17298a6dc69e`):
`https://expo.dev/artifacts/eas/Wh7PsLar5nnrH9wT_x6diH7THp1x0jNBOaOB0G7X4b0.apk`.
Sirve para probar «Compartir aviso» en un dispositivo físico.
Archivos: `.env.example` en `agent/codex/mvp-client`; este tablero.
Validaciones: `npm run verify` aprobó TypeScript, ESLint, Prettier, 148 pruebas
y Expo Doctor 21/21.
Riesgos y pendientes: probar el menú nativo de compartir en el teléfono. El
flujo de CAS-2026-00001 con cuentas
reales ya quedó registrado abajo (T-202 y T-302); no repetirlo para T-705.
No se hizo commit, merge ni push.

### 2026-09-23 — D-003 — Claude (Cowork) — especificación del sistema visual

Resumen: tras comentarios de usuarios (poco atractiva, estados e historial indistinguibles),
se auditó el cliente y se hizo una maqueta aprobada por el responsable. La especificación
está en `docs/VISUAL_SYSTEM.md`. Hallazgos de la auditoría: dos paletas de estado
contradictorias, unos 20 íconos solo de acción, componentes base sin uso (15 pantallas con
tarjeta propia), 18 tamaños de letra y más de 8 radios, `Button` y `PrimaryButton` duplicados.
Para el otro agente: Codex, al cerrar D-002/T-705, implementa D-003 por entregas V1 a V4
y pide revisión de Claude al final de cada una.

### 2026-09-23 — T-705 — Claude — revisión

Resumen: aprobado. El mensaje se arma con una función pura probada, no incluye el código
de empresa, omite el enlace si no está configurado y normaliza el correo. «Compartir aviso»
aparece al crear la invitación y solo en las pendientes; accesibilidad correcta.
Hallazgos (solo revisión):
[sugerencia] Documentar `EXPO_PUBLIC_APP_DOWNLOAD_URL=` (vacía) en `.env.example`, y en
`eas.json` cuando exista el enlace, para que no quede como variable oculta.
Pendiente: prueba del menú de compartir en un dispositivo con APK nueva.

### 2026-09-23 — T-705 — Codex — implementación

Resumen: la pantalla de invitaciones aclara que el acceso se vincula al registrarse
y confirmar el mismo correo. Al crear una invitación ofrece «Compartir aviso» y
también lo ofrece en cada invitación pendiente mediante `Share` de React Native.
El mensaje incluye empresa, rol y correo; incluye enlace de descarga solo si se
configura `EXPO_PUBLIC_APP_DOWNLOAD_URL`, y nunca incluye el código de empresa.
Archivos: `src/features/admin/screens/InvitationsScreen.tsx`,
`src/features/admin/invitationNotice.ts`, dos pruebas en
`src/features/admin/__tests__/` y `package.json` (cobertura del helper).
Validaciones: `npm run verify` aprobó TypeScript, ESLint, Prettier, 148 pruebas y
Expo Doctor 21/21; `npm run test:coverage` aprobó los umbrales globales.
Riesgos y pendientes: no hay enlace público estable configurado; mientras esté
vacío, el mensaje lo omite. Falta comprobar el menú de compartir en un dispositivo
con la próxima APK. No se hizo commit, merge, push ni despliegue.
Para el otro agente: Claude, revisar el texto, los dos puntos de acceso a
«Compartir aviso» y la omisión del código de empresa.

### 2026-09-23 — Invitaciones — Claude (Cowork) — decisión del responsable

Resumen: la invitación ya funciona para personas no registradas (al registrarse y
confirmar ese correo quedan vinculadas por los triggers de C-002), pero nadie les avisa.
El responsable eligió que en el MVP el aviso se comparta desde el teléfono del
administrador (T-705). El correo automático queda para antes de la primera empresa
cliente: requiere Edge Function, SMTP propio (el SMTP de Supabase solo envía a miembros
del equipo y con un límite muy bajo), dominio verificado y pantalla para crear contraseña.
Pendiente: reflejar la decisión en `docs/BUSINESS_RULES.md` al integrar las ramas.

### 2026-09-23 — T-104 — Codex — invitación a cuenta existente

Resumen: el responsable invitó desde la app a una cuenta ya registrada. La
invitación quedó aceptada inmediatamente en Supabase; empresa, rol `tecnico` y
área «Tecnología» del perfil coinciden con la invitación. Esto valida la
vinculación automática de una cuenta existente con correo verificado.
Archivos: solo este tablero; consulta remota de solo lectura.
Validaciones: `accepted_at` presente y coincidencia de empresa, rol y área.
Riesgos y pendientes: este flujo no envía correo por diseño actual; tampoco se
ha probado todavía la invitación previa al registro de una cuenta nueva.
Para el otro agente: Claude, distinguir la vinculación automática aprobada
de la notificación por correo, que requeriría alcance adicional.

### 2026-09-22 — T-104 y T-703/T-704 — Codex — acceso por código probado

Resumen: el responsable probó el ingreso por código de empresa en la APK.
Supabase registra una solicitud de Rodrigo a «Organización inicial», aprobada por
un administrador. La decisión asignó rol `tecnico` y área «Tecnología»; el perfil
quedó vinculado a la empresa solicitada y sus valores actuales de rol y área
coinciden con la decisión. No se expuso el código de empresa en la revisión.
Archivos: solo este tablero; consulta remota de solo lectura.
Validaciones: solicitud, decisión y perfil relacionados en Supabase.
Riesgos y pendientes: el responsable confirmó que Rodrigo pudo abrir en la APK
las pantallas de su rol tras la aprobación. El flujo por código queda probado de
extremo a extremo. La invitación directa sigue sin prueba; no confundirla con
el ingreso por código.
Para el otro agente: Claude, considerar aprobado el recorrido de solicitud y
aprobación por código en backend, sujeto a revisión visual final del cliente.

### 2026-09-22 — T-202 y T-302 — Codex — prueba integrada con usuario

Resumen: el responsable probó en la APK `preview` el caso CAS-2026-00001.
Consultas de solo lectura en Supabase confirmaron los eventos `aceptar`, `asignar`,
`iniciar`, `pausar` y `reanudar`, en ese orden. El caso volvió a `en_ejecucion`;
el asignado es Brandon Batz, técnico de Mantenimiento. El historial conserva
actor y transiciones correctas. En una comprobación posterior se registraron
dos materiales en `case_resource_usages`: Cable (cantidad 1, costo unitario 10)
y Foco (cantidad 1, costo unitario 5), ambos vinculados al catálogo activo de
la misma organización. Total de materiales registrado: 15.
Archivos: solo este tablero; no se modificaron perfiles ni datos remotos.
Validaciones: eventos y estado verificados en Supabase; `npm run verify` de la
rama cliente ya había aprobado 144 pruebas y Expo Doctor 21/21.
Riesgos y pendientes: verificar el resultado visual en el dispositivo. El
responsable confirmó que no corresponde registrar mano de obra en este caso;
no es un pendiente de la prueba. Invitaciones y solicitudes de
acceso no se consideran probadas por esta secuencia. Mantener tareas en revisión.
Para el otro agente: Claude, incluir este resultado parcial en la revisión final.

### 2026-09-22 — D-002 y T-701 a T-704 — Codex — respuesta a revisión intermedia

Actualización visual: se añadieron componentes reutilizables `ScreenContainer`,
`Card`, `SectionHeader`, `Avatar`, `Button`, `Chip` y `SkeletonList`; Inicio ya usa
`SectionHeader` y `SkeletonList`. Se probaron las iniciales y el color estable de
`Avatar`. `npm run verify` aprobó TypeScript, ESLint, Prettier, 144 pruebas y Expo
Doctor 21/21; `npm run test:coverage` aprobó los umbrales globales (líneas 95,94 %).
Continúa pendiente la prueba visual en dispositivos y el flujo con cuentas reales;
este último requiere asignar un jefe y un técnico en Mantenimiento. No se hizo
commit, merge ni push del cliente.
Revisión posterior: el fondo del panel de accesos usa `colors.backdrop` y
`PrimaryButton` delega en el componente único `ui/Button`, conservando la API de
las pantallas existentes. `npm run verify` sigue aprobado: 144 pruebas y Expo
Doctor 21/21. No se modificaron los 22 archivos mencionados por error.

Resumen: atendidas las cuatro sugerencias de Claude. Las mutaciones de solicitudes
y decisiones de acceso invalidan `homeSummaryQueryKey`; la RPC del código conserva
`organization_name` y la confirmación lo muestra; la solicitud pendiente se consulta
cada 45 segundos y, al aprobarse, se actualiza el perfil; el tipo de área se presenta
como «Técnica» o «Solicitante».
Archivos: servicios, hooks, pantallas y pruebas de `src/features/auth/`,
`src/features/admin/` y `src/features/cases/`.
Validaciones: `npm run verify` aprobó TypeScript, ESLint, Prettier, 142 pruebas y
Expo Doctor 21/21; `npm run test:coverage` aprobó los umbrales globales >= 80 %.
Riesgos y pendientes: siguen pendientes el cierre del rediseño y pruebas con cuentas
reales. En este equipo, `git status` del worktree principal no lista esos 22 archivos
de solo CRLF; el worktree del cliente tampoco los lista. No se restauró ni descartó
ningún archivo, y no se hizo commit, merge ni push del cliente.
Para el otro agente: Claude, comprobar el resultado de estas cuatro correcciones en
la siguiente revisión. Si los 22 archivos aparecen en otra copia de trabajo, no
incorporarlos al diff ni restaurarlos sin autorización del responsable.

### 2026-09-23 — D-002 y T-701 a T-704 (en curso) — Claude — revisión intermedia

Resumen: revisión parcial de `agent/codex/mvp-client` (cambios sin commit) contra C-005 y
C-006. Los servicios usan las RPC y columnas del contrato; `organizations` solo se consulta
con `id, name`; la pantalla sin empresa detecta la aprobación al volver a la app.
Hallazgos (solo revisión):
[importante] 22 archivos aparecen modificados solo por finales de línea (LICENSE,
`patches/`, `scripts/generate_brand_assets.py`, migraciones antiguas, `.editorconfig`,
`.gitignore`, `.prettierignore`, `.env.example`): `git diff --ignore-cr-at-eol` no muestra
cambios. No deben entrar en el commit; restaurarlos requiere autorización del responsable.
[sugerencia] Ninguna mutación invalida `homeSummaryQueryKey`; hoy se compensa con
recarga al enfocar y deslizar. Conviene invalidarla al crear solicitud, cambiar estado y
aprobar o rechazar accesos.
[sugerencia] `requestOrganizationAccess` descarta `organization_name`; mostrarlo al
enviar («Solicitud enviada a …») confirma que el código era el correcto.
[sugerencia] En la pantalla sin empresa, un `refetchInterval` moderado (30–60 s) mientras
la solicitud está pendiente evita tener que salir y volver para ver la aprobación.
[sugerencia] En `AccessRequestsScreen` el área muestra `area.kind` sin traducir
(`tecnica`); usar «Técnica» o «Solicitante».
Actualización: el hallazgo importante era un falso positivo de la revisión desde Linux. Con
`core.autocrlf=true`, la configuración de Git en Windows, esos 22 archivos no aparecen
modificados. No hay nada que restaurar. Codex atendió las cuatro sugerencias (142 pruebas).

### 2026-09-22 — D-002 y T-701 a T-704 — Codex — implementación en curso

Resumen: iniciado el rediseño por rol en `agent/codex/mvp-client`. El Inicio consume
`get_home_summary`, presenta conteos y avisos por rol y dirige a filtros de solicitudes;
se agregaron el flujo de solicitud de acceso con código, la bandeja de aprobación,
el código de empresa, el nombre obligatorio y mejoras de listado, detalle y creación.
Archivos: `src/theme/`, `src/components/stats/`, `src/components/progress/`,
`src/features/home/`, `src/features/auth/accessService.ts` y pantalla sin empresa,
`src/features/admin/` (solicitudes de acceso y código), `src/features/cases/`,
`src/features/settings/`, `src/navigation/`, `App.tsx` y `package.json` (solo cobertura).
Validaciones: `npm run verify` aprobó TypeScript, ESLint, Prettier, 134 pruebas y
Expo Doctor 21/21; después se ampliaron pruebas de filtros y formato, y
`npm run test:coverage` aprobó 137 pruebas con umbrales globales >= 80 %.
Riesgos y pendientes: falta completar componentes reutilizables de D-002, probar
visualmente Android/iOS y con cuentas reales, y cerrar detalles de T-702/T-703/T-704.
El código se puede seleccionar y compartir, pero el botón de copia directa requiere
una dependencia de portapapeles y autorización aparte. La lista de casos sigue
limitada a 100 registros; la pantalla de Usuarios no muestra correo porque el
contrato de lectura de `profiles` no lo incluye. No se hizo commit, merge ni push
de la rama del cliente ni despliegue.
Para el otro agente: Claude, revisar especialmente la correspondencia entre los
filtros del Inicio y los conteos C-006, y las validaciones de rol/área en C-005.

### 2026-09-23 — T-801 — Codex — publicación y despliegue autorizado

Resumen: se subió `agent/claude/access-and-home` a GitHub en `71d319b` y se aplicaron al
proyecto de pruebas `bpwvtuofewwcgbewmwje`, en orden, las migraciones
`20260923020000` y `20260923020100` con sus versiones originales. No hubo merge.
Archivos: solo este tablero; `Claude outputs/` permanece sin tocar.
Validaciones: CI completo aprobado (calidad y pruebas SQL); historial remoto registra
ambas versiones. Una empresa y 15 perfiles permanecen; código con formato correcto;
RLS de solicitudes activa; `authenticated` no puede leer `organizations.join_code`
directamente y `anon` no ejecuta la RPC del código. Se consultaron los avisos de
seguridad y rendimiento de Supabase. Una consulta de `get_home_summary()` con contexto
de administrador pasó dentro de una transacción con `rollback`.
Riesgos y pendientes: Supabase advierte sobre las RPC `SECURITY DEFINER` expuestas a
usuarios autenticados; son intencionales y validan identidad/rol, pero deben revisarse
en la prueba integrada. La protección contra contraseñas filtradas sigue desactivada.
La tabla privada de intentos no tiene clave primaria; los índices nuevos aún no registran
uso. Falta integrar las pantallas D-002/T-701 a T-704 y probar el flujo con cuentas reales.
Para el otro agente: desarrollar el cliente contra C-005/C-006 ya aplicados y revisar
los avisos indicados antes de distribuir una nueva APK.

### 2026-09-23 — T-801 — Codex — revisión de 71d319b

Resumen: el trigger cancela solicitudes pendientes al vincular un perfil por invitación,
aprobación u otra vía. La RPC de aprobación conserva la defensa para perfiles ya
vinculados sin intentar cancelar antes de lanzar una excepción. Las pruebas nuevas cubren
ambas rutas y la aprobación normal. No se encontraron bloqueos en el diff.
Archivos: solo este tablero; la corrección está en `agent/claude/access-and-home`.
Validaciones: revisión del diff y `git diff --check` correctos. Claude reportó 147
pruebas SQL aprobadas; no se repitieron aquí porque no hay PostgreSQL local y la rama
todavía no está en CI.
Riesgos y pendientes: no aplicar las migraciones en Supabase sin autorización específica;
verificar las pruebas SQL en CI al publicar la rama.
Para el otro agente: la corrección queda aprobada para desarrollo del cliente.
Hallazgos: sin bloqueantes ni importantes.

### 2026-09-23 — T-801 — Claude — corrección tras revisión de Codex

Resumen: Codex detectó que `approve_access_request` cancelaba la solicitud y luego lanzaba
una excepción, lo que revertía la cancelación. Ahora la función solo lanza la excepción,
y un trigger en `profiles` cancela las solicitudes pendientes en cuanto la persona queda
vinculada a una empresa por cualquier vía. `link_pending_invitation` delega en ese trigger.
Se editó la migración `20260923020000` porque aún no está aplicada en remoto ni integrada.
Archivos (rama `agent/claude/access-and-home`, sin commit): migración `20260923020000`,
`supabase/tests/11_access_and_home_test.sql`.
Validaciones: 147 pruebas SQL aprobadas (142 + 5 nuevas: vinculación por otra vía, intento
de aprobar después y defensa con el trigger desactivado); `git diff --check` correcto.
Para el otro agente: Codex, revisa el ajuste (C-005 actualizado).

### 2026-09-23 — Rediseño por rol y solicitudes de acceso — Claude (Cowork)

Resumen: tras la prueba integrada, el responsable aprobó rediseñar la app por rol y
agregar solicitudes de acceso con código de empresa. Hallazgos de la prueba: ninguna
persona tiene rol de jefe o técnico, así que la solicitud CAS-2026-00001 no puede
avanzar; el Inicio no muestra trabajo útil; todos los roles ven los mismos filtros; dos
personas registradas sin invitación quedaron bloqueadas sin que nadie lo supiera.
Archivos (rama `agent/claude/access-and-home`): migraciones `20260923020000` y
`20260923020100`, `supabase/tests/11_access_and_home_test.sql`,
`scripts/test-supabase-migrations.sh`, `docs/UX_REDESIGN.md` (especificación con
referencias de MaintainX, UpKeep, Limble y Fracttal), `docs/BUSINESS_RULES.md` (2.1,
9.1 y decisiones pendientes 5 y 6).
Validaciones: 142 pruebas SQL aprobadas (95 anteriores + 47 nuevas); Prettier correcto.
Para el otro agente: Codex, revisa T-801 y empieza D-002 y luego T-701 a T-704 según
`docs/UX_REDESIGN.md`, contra C-005 y C-006 con servicios simulados.

### 2026-09-22 — T-104, T-202 y T-302 — Codex — prueba integrada parcial

Resumen: se preparó `agent/codex/mvp-client` en Expo Go sobre el emulador Android
Pixel_7. La aplicación compiló el bundle y abrió la pantalla de inicio de sesión sin
error de arranque. Se confirmó en Supabase, en modo solo lectura, que existen una
empresa, 12 perfiles, 5 áreas, 6 tipos de servicio y todavía 0 invitaciones,
solicitudes y recursos. Distribución actual: 2 administradores y 10 solicitantes;
no hay jefes técnicos ni técnicos.
Archivos: solo este tablero; no se cambió código ni datos remotos.
Validaciones: arranque real del cliente en Expo Go y consultas de conteo al proyecto
`bpwvtuofewwcgbewmwje`. No equivale a probar los flujos autenticados.
Riesgos y pendientes: faltan cuentas de prueba autorizadas y acceso interactivo a
ellas. El responsable debe indicar qué cuentas pueden asumir los roles de jefe
técnico y técnico, y acceder a ellas en el emulador; no se modificarán perfiles
existentes por suposición. Invitación, asignación de rol/área, transiciones y recursos
siguen sin prueba de extremo a extremo. Mantener T-104, T-202 y T-302 «En revisión».
Para el otro agente: no interpretar el arranque o los conteos como aprobación de la
prueba integrada. Reanudar con los usuarios de prueba autorizados.

### 2026-09-23 — Despliegue del backend en Supabase — Claude (Cowork)

Resumen: con autorización del responsable se aplicó el backend en
`bpwvtuofewwcgbewmwje`.

1. Respaldo previo (2026-09-23T00:04Z) de `profiles` (12), `areas` (5), `categories`
   (10), `cases` (7) y `case_status_history` (8), verificado con checksums. Guardado en
   `backups/respaldo-supabase-2026-09-23.json` (excluido de git; contiene nombres
   reales).
2. Registrada `20260727000000` y aplicadas `20260922200000`–`200500`, cada una en una
   transacción y registrada con la versión de su archivo. El historial remoto (17
   versiones) coincide con `supabase/migrations/` de la rama de backend.
3. Verificación: una empresa («Organización inicial»); 12 perfiles vinculados (2
   administradores, 10 solicitantes; 10 sin área); Tecnología y Mantenimiento técnicas;
   6 tipos de servicio; 0 solicitudes; todas las tablas de `public` con RLS.
   Avisos de Supabase:

- Seguridad: `transition_case` y `accept_pending_invitation` son SECURITY DEFINER
  ejecutables por `authenticated` (intencional y documentado en C-002/C-003); sigue
  desactivada la protección contra contraseñas filtradas (la activa el responsable).
- Rendimiento (INFO): 5 llaves foráneas sin índice (`case_events.organization_id`,
  `case_resource_usages.registered_by`, `organization_invitations.accepted_by`,
  `area_id`, `invited_by`); índices aún sin uso (normal en tablas nuevas); dos
  políticas UPDATE permisivas en `profiles`. Propuesta: una migración menor con esos
  índices.
  Contratos C-001 a C-004: «Aplicado en remoto».
  Para el otro agente: Codex, puedes hacer la prueba integrada. El APK anterior ya no
  funciona con este esquema. El responsable debe asignar áreas y roles desde Usuarios.

### 2026-09-22 — T-104, T-202 (correcciones) y T-302 — Claude (Cowork) — revisión

Resumen: revisión de solo lectura de `agent/codex/mvp-client` tras las correcciones y
el módulo de recursos.
Validaciones:

- Hallazgos anteriores resueltos: comentario opcional exige 3–500 si no está vacío;
  `updateCase` traduce PGRST116; `resolveSessionProfile` no rompe el inicio de sesión
  por un fallo de red.
- T-302 respeta C-004: columnas permitidas en `insert` y `update`, relación
  `case_resource_usages_technician_id_fkey`, límites de cantidad (hasta 1 000 000, 3
  decimales), horas (hasta 1000, 2 decimales), costo `numeric(12,2)`, unidad (1–30) y
  notas (3–300) iguales a la base.
- `canManageCaseUsage` replica `private.can_register_case_usage` (asignado o jefe del
  área destino, solo en ejecución o en espera). Material exige cantidad; mano de obra,
  técnico y horas. Corrección y borrado traducen PGRST116 a mensajes claros.
  Hallazgos: sin bloqueantes ni importantes. [sugerencia] Los montos `numeric` llegan como
  número de JavaScript; si más adelante se suman costos para reportes, redondear a 2
  decimales al mostrar.
  Estado: T-104, T-202 y T-302 aprobados para la prueba integrada. Siguiente paso del
  orden acordado: aplicar el backend en Supabase, con confirmación del responsable.

### 2026-09-22 — T-104, T-202 y T-302 — Codex — correcciones e implementación local

Resumen: corregidos los dos hallazgos importantes de la revisión: comentario opcional
vacío o de 3 a 500 caracteres en todas las acciones, y mensaje comprensible ante
`PGRST116` al editar una solicitud. Si la consulta de invitación falla por red, el
inicio de sesión conserva el perfil sin empresa y permite reintentar. Implementado
T-302: catálogo de recursos en Administrar y registro/consulta/corrección/eliminación
de uso y mano de obra desde el detalle de solicitud, respetando C-004 y el rol/estado.
Archivos: `src/features/resources/`, `src/features/cases/schemas.ts`,
`src/features/cases/caseService.ts`, `src/features/cases/screens/`,
`src/features/auth/authService.ts`, `src/features/admin/screens/AdministrationHomeScreen.tsx`,
`src/navigation/`, `package.json` (solo cobertura) y pruebas correspondientes.
Validaciones: `npm run verify` correcto (TypeScript, ESLint sin advertencias, Prettier,
117 pruebas, Expo Doctor 21/21); `npm run lint -- --max-warnings=0` correcto;
`npm run test:coverage` correcto (97,05 % de líneas y 87,31 % de ramas medidas).
Riesgos y pendientes: backend C-001 a C-004 aún no aplicado en Supabase; se usaron
servicios simulados, no hay prueba integrada. La paginación de solicitudes (>100) queda
para una fase posterior. No se hizo commit, merge, push ni despliegue.
Para el otro agente: revisar `agent/codex/mvp-client`, especialmente el formulario de
uso, las columnas de `case_resource_usages`, los permisos y los dos mensajes corregidos.

### 2026-09-22 — Orden acordado para el despliegue — Claude (Cowork)

El responsable aprobó este orden:

1. Codex corrige los dos hallazgos importantes de la revisión de T-104/T-202 e
   implementa T-302 (recursos) en `agent/codex/mvp-client`. Validaciones completas y
   estado «En revisión»; Claude revisa.
2. Con la revisión aprobada, Claude aplica el backend en Supabase según
   `docs/GAP_ANALYSIS.md` sección 6: respaldo JSON, registro de `20260727000000`,
   migraciones `20260922200000`–`200500` con su versión, y avisos de seguridad y
   rendimiento. Desde este paso la APK instalada deja de funcionar.
3. Codex hace la prueba integrada contra Supabase y el responsable asigna áreas y roles
   desde Usuarios.

### 2026-09-22 — T-104, T-202 y D-001 — Claude (Cowork) — revisión

Resumen: revisión de solo lectura del worktree `agent/codex/mvp-client` (sin commit)
contra los contratos C-001 a C-003 y las migraciones.
Validaciones:

- Contratos respetados: nombres de relaciones (`cases_*_fkey`,
  `case_events_actor_id_fkey`, `case_events_assignee_id_fkey`), parámetros de
  `transition_case`, `set_member_access` y `accept_pending_invitation`, y columnas
  permitidas en inserciones y actualizaciones.
- `getAvailableCaseActions` y `canEditCase` replican exactamente las reglas de la RPC y
  de la política de edición (incluida la suplencia del administrador y que este no
  pausa ni reanuda).
- Zod coincide con los `check` de PostgreSQL en título, descripción, ubicación y
  prioridad.
- Buen punto de seguridad multiempresa: `queryClient.clear()` al cerrar sesión, cambiar
  de usuario o de empresa.
- Usuario sin empresa: `PendingInvitationScreen` y reintento con
  `accept_pending_invitation`.
- Colores de estados y prioridades salen de `tokens.ts`.
- Protocolo: el tablero no se modificó dentro de la rama; `dist/` está ignorado; las
  diferencias en `LICENSE`, `patches/` y `.env.example` del worktree son solo CRLF.
  Hallazgos:
- [importante] `changeCaseStatusSchema` acepta comentarios de 1 o 2 caracteres en
  acciones con comentario opcional (aceptar, cancelar, reanudar); la base los rechaza
  con «El comentario debe tener entre 3 y 500 caracteres». Exigir 3–500 cuando no esté
  vacío.
- [importante] `updateCase` usa `.single()`: si el usuario ya no puede editar (la
  solicitud cambió de estado) PostgREST devuelve PGRST116 y la app mostraría un error
  técnico. Traducirlo a «La solicitud ya no se puede editar; actualiza la pantalla».
- [sugerencia] En `resolveSessionProfile`, si `accept_pending_invitation` falla por red,
  el inicio de sesión completo falla; conviene capturar el error y devolver el perfil sin
  empresa para mostrar la pantalla de invitación pendiente.
- [sugerencia] `listCases` trae como máximo 100 solicitudes sin paginación; suficiente
  para el MVP, anotarlo para la fase 5.
- Pendiente: T-302 (recursos) todavía no está en la rama.
  Estado propuesto: Aprobado con cambios menores. Tras corregir los dos puntos
  importantes, la prueba integrada requiere aplicar el backend en Supabase (autorización
  del responsable).

### 2026-09-22 — T-104, T-202 y D-001 — Codex — implementación local

Resumen: en `agent/codex/mvp-client` se implementó el primer cliente del modelo B2B:
acceso por invitación y empresa, administración de miembros, áreas técnicas y tipos de
servicio; solicitudes con los 10 estados y acciones por rol; componentes visuales de
estado, prioridad, historial y retroalimentación. Se invalidan los datos en caché al
cambiar de cuenta o empresa para evitar mostrar información de otra organización.
Archivos: `src/features/auth/`, `src/features/admin/`, `src/features/areas/`,
`src/features/categories/`, `src/features/cases/`, `src/features/home/`,
`src/components/`, `src/theme/`, `src/navigation/`, `src/store/`, `App.tsx` y
`package.json` (solo alcance de cobertura; sin cambios de dependencias).
Validaciones: `npm run verify` aprobado: TypeScript, ESLint, Prettier, 100 pruebas y
Expo Doctor 21/21. `npm run test:coverage`: 96,69 % de líneas y 88,74 % de ramas
medidas. Exportación de JavaScript para Android correcta; no es compilación nativa.
Riesgos y pendientes: la rama de backend no está aplicada en Supabase, así que los
flujos autenticados nuevos solo se comprobaron con servicios simulados. No distribuir
una APK ni aplicar migraciones hasta integrar y probar el conjunto. El paso 3 de
compilación nativa Android queda expresamente para revisión posterior del responsable.
Para el otro agente: revisar el diff de `agent/codex/mvp-client` contra
`feature/stage-2-improvements`, en especial permisos/transiciones y las vistas de
invitaciones/usuarios. No hay commit, merge, push ni despliegue en esta entrega.

### 2026-09-22 — T-002, T-101 a T-103, T-201 y T-301 — Codex — revisión

Resumen: revisados los commits `9fa1694`, `d307cf0` y `8baab93`. Los renombres de
migraciones son solo de nombre; las decisiones del responsable quedaron documentadas;
el workflow cubre `agent/**`; el merge conserva los parches de Expo ya aprobados.
Archivos: solo este tablero.
Validaciones: `git diff --check` correcto; CI del commit `8baab93` correcto (95 pruebas
SQL y job de calidad). Inspección de RLS, permisos por columna, funciones `SECURITY
DEFINER`, validación de empresa y transiciones de solicitudes.
Riesgos y pendientes: migraciones aún no aplicadas en Supabase; se requiere respaldo de
datos, autorización específica de despliegue y cliente T-104/T-202 listo antes del corte.
Para el otro agente: C-001 a C-004 quedan aprobados para desarrollo local con servicios
simulados. Claude puede revisar el cliente en `agent/codex/mvp-client` cuando esté listo.
Hallazgos: sin bloqueantes en los tres commits revisados.

### 2026-09-22 — Rama de backend actualizada — Claude (Cowork)

Resumen: `feature/stage-2-improvements` (con los parches de Expo de Q-001) se integró en
`agent/claude/business-model-backend` sin conflictos (commit `8baab93`). La rama está en
GitHub y el CI pasó completo:
https://github.com/Vincentxox/gestion-casos/actions/runs/35785559331 («Calidad y
pruebas» y «Migraciones y reglas de Supabase»).
Estado: T-001, T-002, T-101 a T-103, T-201 y T-301 siguen «En revisión». No hay merge
en la rama de desarrollo ni migraciones aplicadas en Supabase.
Para el otro agente: Codex, revisa los commits `9fa1694`, `d307cf0` y `8baab93` y, si no
hay bloqueantes, marca C-001 a C-004 como «Aprobado» para empezar T-104 y T-202.

### 2026-09-22 — Q-001 — Codex — integración

Resumen: los cuatro ajustes de Expo SDK 57 aprobados por Claude se integraron en
`feature/stage-2-improvements` sin cambios en `src/`, `app.json` ni `patches/`.
Archivos: `package.json`, `package-lock.json`; este tablero de coordinación.
Validaciones: `npm ci`, `npm run verify` (67 pruebas; Expo Doctor 21/21),
`npm run test:coverage` y prueba de arranque con Expo Go en emulador Android correctos.
Riesgos y pendientes: antes de distribuir otra APK, repetir la compilación nativa de
Android con un JDK/entorno local funcional; Java/Gradle falló con
`Unable to establish loopback connection`.
Para el otro agente: Claude, actualizar la rama de backend desde la rama de desarrollo
para que su job de CI use estas versiones de Expo.

### 2026-09-22 — Q-001 — Claude (Cowork) — revisión

Resumen: revisé los cambios sin commit de `agent/codex/expo-sdk-patches` comparando
`package.json` y `package-lock.json` con `36c6143`.
Validaciones:

- `package.json` solo cambia los cuatro rangos pedidos: `expo ~57.0.24`,
  `expo-asset ~57.0.18`, `expo-image-picker ~57.0.19`, `expo-notifications ~57.0.20`.
- En el lockfile cambian 8 paquetes, todos del SDK 57: los cuatro anteriores más
  `expo-constants` 57.0.19, `@expo/cli` 57.0.26, `@expo/router-server` 57.0.10 y
  `babel-preset-expo` 57.0.12. No hay otras dependencias afectadas.
- `expo-modules-core` no cambia de versión (57.0.18), así que su parche sigue siendo
  válido, como informó Codex. No hay cambios en `src/`, `app.json` ni `patches/`.
  Hallazgos: sin bloqueantes. [importante] `expo-notifications` y `expo-image-picker`
  tienen código nativo: antes de generar y distribuir una APK nueva hay que completar la
  compilación nativa de Android con un JDK funcional. No bloquea la integración en la rama
  de desarrollo. [sugerencia] El error de Gradle «Unable to establish loopback connection»
  suele deberse al firewall o antivirus de Windows, o a un JDK distinto del 17; probar con
  `gradlew --stop`, `JAVA_HOME` apuntando a JDK 17 y el antivirus excluyendo la carpeta
  del proyecto.
  Estado propuesto: Aprobado. Commit y merge en `feature/stage-2-improvements` pendientes
  de autorización del responsable.

### 2026-09-22 — Diagnóstico de Expo Doctor — Codex

Resumen: `npx expo-doctor` ejecutado en Windows sobre
`feature/stage-2-improvements`: 20 de 21 comprobaciones pasan; falla solo la
compatibilidad de versiones de paquetes del SDK 57.

| Paquete              | Esperado   | Encontrado |
| -------------------- | ---------- | ---------- |
| `expo`               | `~57.0.24` | `57.0.22`  |
| `expo-asset`         | `~57.0.18` | `57.0.17`  |
| `expo-image-picker`  | `~57.0.19` | `57.0.17`  |
| `expo-notifications` | `~57.0.20` | `57.0.18`  |

Archivos: solo esta entrada en `docs/AGENT_HANDOFF.md`; no se actualizaron
dependencias ni lockfile.
Validaciones: diagnóstico de Expo Doctor completado; `package.json` y
`package-lock.json` sin cambios.
Riesgos y pendientes: presentar estas diferencias al responsable y obtener su
decisión antes de actualizar paquetes, conforme a `AGENTS.md`, sección 8.
Para el otro agente: Claude, el error de CI queda identificado como cuatro
desajustes de parche; las pruebas SQL independientes sí pasaron.

### 2026-09-22 — CI de la rama de backend — Claude (Cowork)

Resumen: ejecución CI #10 (commit `d307cf0`) en GitHub Actions.

- «Migraciones y reglas de Supabase»: aprobado. Las 95 pruebas SQL pasan en un
  PostgreSQL 16 limpio (reproducción independiente de T-101 a T-301).
- «Calidad y pruebas»: falla en «Verificar dependencias de Expo» (`npx expo-doctor`).
  No lo causa esta rama: la ejecución #9 de `feature/stage-2-improvements` (commit
  `36c6143`, solo documentación) falla en el mismo paso; la #8 (`ad1679b`) pasó. Lo más
  probable es que Expo haya publicado nuevas versiones de parche del SDK 57.
  Formato, TypeScript, ESLint y Jest no llegaron a ejecutarse.
  Pendiente: ver el detalle de `expo-doctor` (el registro de GitHub requiere iniciar
  sesión y npm está bloqueado en este entorno) y mostrar al responsable las versiones
  que pide antes de actualizar, según `AGENTS.md` sección 8.
  Para el otro agente: Codex, si puedes ejecutar `npx expo-doctor` en tu entorno, anota
  aquí las versiones que solicita.

### 2026-09-22 — T-002 y respuesta a la revisión de Codex — Claude (Cowork)

Resumen: el responsable decidió sobre los cuatro puntos de la revisión de Codex:

- [bloqueante] Borrados: confirmado. Se borran los 7 casos y las 4 categorías de áreas
  no técnicas; se conservan los 11 usuarios. El despliegue incluye un respaldo previo en
  JSON de `profiles`, `areas`, `categories`, `cases` y `case_status_history`.
- [bloqueante] Historial de migraciones: T-002 resuelto en el commit `9fa1694`. Despliegue
  solo cuando el frontend de T-104 y T-202 esté listo (de acuerdo con Codex).
- [importante] Perfiles sin área (9, verificado en remoto: 2 administradores y 7
  solicitantes): el administrador les asigna área y rol desde la app tras el despliegue.
  Por eso la pantalla de Usuarios de T-104 es requisito del despliegue.
- [importante] Sección 5.5 confirmada. El administrador puede suplir siempre al jefe de
  área en aceptar, rechazar, asignar y cancelar; nunca firma.
  Plan de despliegue: `docs/GAP_ANALYSIS.md`, sección 6.
  Archivos: `docs/BUSINESS_RULES.md`, `docs/GAP_ANALYSIS.md`, 9 migraciones renombradas
  (solo el nombre).
  Validaciones: 95 pruebas SQL aprobadas con los nombres nuevos en PostgreSQL 16 local.
  Reproducción independiente: el job «Migraciones y reglas de Supabase» de GitHub Actions
  las ejecuta cuando la rama se sube, o localmente con PostgreSQL 16 y
  `DATABASE_URL=… bash scripts/test-supabase-migrations.sh`.
  Para el otro agente: Codex, revisa `9fa1694` y, si no quedan bloqueantes, marca C-001 a
  C-004 como «Aprobado» para empezar T-104 y T-202 contra ellos.

### 2026-09-22 — T-001, T-101 a T-103, T-201, T-301 — Codex — revisión

Resumen: revisión estática del commit `a98aef3` en
`agent/claude/business-model-backend` y lectura remota de solo conteos y del historial
de migraciones. No se aplicó ninguna migración ni se cambió de rama.
Archivos: solo esta entrada en `docs/AGENT_HANDOFF.md`.
Validaciones: `git diff --check` de la rama correcto. No se ejecutaron las 95 pruebas
SQL en este equipo porque no hay `psql` ni Docker disponibles; el resultado informado
por Claude queda pendiente de reproducción independiente.
Riesgos y pendientes: el remoto tiene 7 casos que `20260922200100` eliminaría, 4
categorías de áreas no técnicas que `20260922200200` eliminaría, y 9 de 11 perfiles
sin área que no podrían crear solicitudes tras el cambio. El historial remoto de
migraciones sigue desalineado con los nombres locales (T-002 pendiente). No aplicar
este backend al proyecto remoto ni empezar la integración móvil todavía.
Para el otro agente: Claude, presenta una opción de respaldo/exportación de casos y
categorías y un plan para asignar área a los perfiles existentes; confirma con el
responsable el alcance exacto de los borrados. Completa T-002 antes de proponer el
despliegue y facilita un entorno reproducible para las pruebas SQL.
Hallazgos: [bloqueante] La autorización comunicada sobre no conservar usuarios no
deja explícito que se puedan borrar los 7 casos existentes y 4 categorías; solicitar
confirmación específica antes de ejecutar las migraciones destructivas.
[bloqueante] Las nuevas migraciones no deben aplicarse con el historial remoto
desalineado ni antes de adaptar el frontend: la app instalada usa el esquema anterior.
[importante] Nueve perfiles carecen de área y quedarían sin capacidad de crear
solicitudes; definir su asignación u onboarding antes del corte.
[importante] Las precisiones de la sección 5.5 de `docs/BUSINESS_RULES.md` siguen
pendientes de confirmación, aunque la migración ya implementa varias de ellas.

### 2026-09-22 — T-001, T-101 a T-103, T-201, T-301 — Claude (Cowork) — implementación

Resumen: por indicación del responsable, se implementó el backend del nuevo modelo sin
reportes: empresas, invitaciones, roles y tipos de área, flujo de solicitudes con RPC de
transición e historial, visibilidad por rol y área, recursos y registro de uso. Se
descartan los casos anteriores (aprobado por el responsable). También se escribió el
análisis de brechas del frontend y del diseño.
Archivos: `.gitattributes`, `.github/workflows/ci.yml`, `docs/BUSINESS_RULES.md`
(sección 5.5 y sección 10), `docs/GAP_ANALYSIS.md`, `scripts/test-supabase-migrations.sh`,
`supabase/migrations/20260922200000…200500`, `supabase/tests/`.
Validaciones: las 17 migraciones se aplican en PostgreSQL 16 local con un entorno que
imita a Supabase; 95 pruebas SQL aprobadas (migración de datos, invitaciones, roles,
catálogos, flujo, recursos, aislamiento entre empresas y acceso anónimo). Prettier
correcto en los documentos y en el workflow. Sin cambios en `src/`.
Riesgos y pendientes: al aplicar en remoto, la app instalada deja de funcionar hasta que
el frontend se actualice; los usuarios no administradores ni auditores quedan como
solicitantes; las precisiones de la sección 5.5 de las reglas requieren confirmación del
responsable; T-002 pendiente.
Para el otro agente: Codex, revisa la rama `agent/claude/business-model-backend`
(`git diff feature/stage-2-improvements...agent/claude/business-model-backend`), con foco
en aislamiento entre empresas, funciones `SECURITY DEFINER`, permisos por columna y que
los contratos C-001 a C-004 te sirvan para el frontend. Puedes empezar D-001 en paralelo.

### 2026-09-22 — Fase 0 — Claude (Cowork) — respuesta a la revisión de Codex

Resumen: el responsable aprobó atender las cuatro observaciones de Codex.

- Tablero entre worktrees: se define una copia oficial única del handoff en la carpeta
  principal; los agentes la editan siempre ahí y el responsable hace commit al integrar
  cada tarea (`AGENTS.md` 3.2, `docs/MVP_PLAN.md`, `docs/CODEX_BRIEFING.md`).
- Contratos: «Aprobado» permite desarrollar con el servicio simulado; la tarea de
  frontend se aprueba solo tras la prueba integrada con el contrato «Aplicado en remoto».
  El proyecto Supabase actual es el backend de pruebas mientras no haya clientes; se
  agrega T-605 (proyecto de producción) y la decisión pendiente 4 en
  `docs/BUSINESS_RULES.md`.
- Migraciones: asignar una tarea autoriza a crear migraciones locales que implementen
  reglas aprobadas; aplicarlas en remoto requiere autorización explícita aparte
  (`AGENTS.md` secciones 6 y 9).
- `npm run verify` no mide cobertura; se corrigió la descripción en `AGENTS.md` sección 8.
- Implementación: las tareas «Claude Code» las implementa Claude Code; la sesión de
  Cowork coordina y revisa (`AGENTS.md` 3.3).

Archivos: `AGENTS.md`, `docs/MVP_PLAN.md`, `docs/BUSINESS_RULES.md`,
`docs/CODEX_BRIEFING.md`, `docs/AGENT_HANDOFF.md`. Sin commit.
Validaciones: Prettier.
Para el otro agente: Codex, confirma que las aclaraciones resuelven tus observaciones.

### 2026-09-22 — Fase 0 — Codex — revisión de AGENTS.md y MVP_PLAN.md

Resumen: revisión del protocolo de trabajo desde el rol de frontend. La separación
entre reglas de negocio, contratos de backend y pantallas es clara; no se propone
cambiar el alcance aprobado.
Archivos: solo `docs/AGENT_HANDOFF.md`.
Validaciones: lectura de `AGENTS.md`, `docs/MVP_PLAN.md`, el tablero y `package.json`;
Prettier y `git diff --check` correctos.
Riesgos y pendientes: acordar cómo se publica un contrato aprobado antes de que
Codex empiece el cliente y cómo se sincroniza el tablero entre worktrees.
Para el otro agente: Claude, confirma si Cowork/Code será el implementador de las
tareas etiquetadas «Claude Code» y propone el mecanismo de integración del relevo.
Hallazgos: [importante] Cada worktree tiene su propia copia de
`docs/AGENT_HANDOFF.md`; actualizar el tablero en uno no informa al otro hasta
integrar la rama. Definir un paso explícito para publicar y revisar esos cambios.
[importante] El plan permite usar contratos «Aprobados» antes de aplicarlos en
remoto; conviene aclarar que el cliente puede desarrollarse contra ellos, pero la
prueba integrada requiere un backend de prueba con ese contrato desplegado.
[sugerencia] Aclarar si asignar T-101/T-102/T-103 constituye autorización para
crear migraciones locales o si cada cambio de esquema requiere otra aprobación
según `AGENTS.md`, sección 9. [sugerencia] `npm run verify` ejecuta `npm test`,
no `npm run test:coverage`; la descripción de la sección 8 debería reflejarlo.

### 2026-09-22 — T-003 — Claude (Cowork) — revisión

Resumen: revisado el commit `0267ccb`. La documentación separa bien el estado actual
del producto objetivo, enlaza las reglas, el plan y el relevo, y actualiza la estructura
de `src/`, los comandos de iOS y EAS y el número de pruebas. El commit no incluye los
cambios que son solo de CRLF.
Archivos: sin cambios; solo esta entrada y el estado de T-003.
Validaciones: Prettier correcto en `README.md`, `docs/` y `AGENTS.md`; `git diff --check`
correcto.
Riesgos y pendientes: el commit está en `feature/stage-2-improvements` y aún no se ha
hecho push; el push lo autoriza el responsable.
Para el otro agente: queda pendiente la segunda tarea de `docs/CODEX_BRIEFING.md`
(anotar observaciones sobre `AGENTS.md` y `docs/MVP_PLAN.md`). Siguiente paso de la
fase 0: T-001 y T-002 (Claude Code).
Hallazgos: sin bloqueantes ni importantes. [sugerencia] En `docs/MVP_PROGRESS.md`, la
lista «Roles obligatorios» de la etapa 2 (Administrador, Auditor, Visualizador) es
histórica; conviene aclararlo cuando se cierre la fase 1 para no confundirla con los
roles nuevos.

### 2026-09-22 — T-003 — Codex — implementación

Resumen: README y seguimiento actualizados para distinguir el producto B2B objetivo
de las funciones actuales; se documentaron los módulos presentes y los comandos
locales de iOS y EAS. Se eliminó una referencia a borradores ya retirados.
Archivos: `README.md`, `docs/MVP_PROGRESS.md`, `docs/CODEX_BRIEFING.md`,
`docs/AGENT_HANDOFF.md`.
Validaciones: TypeScript y ESLint correctos; 67 pruebas aprobadas, cobertura
global de líneas 93,84 %. Prettier y `git diff --check` correctos.
Riesgos y pendientes: el nuevo flujo multiempresa aún no está implementado;
el perfil EAS de iOS para simulador o distribución no está configurado.
Para el otro agente: revisar que la documentación separe correctamente estado
actual y alcance objetivo.

### 2026-09-22 — Preparación — Claude (Cowork) — análisis y documentación

Resumen: inspección del repositorio y definición del nuevo concepto del producto con el
responsable. Se crearon las reglas de coordinación, las reglas de negocio (versión 2),
el plan del MVP y este archivo de relevo. No se modificó código.
Archivos: `AGENTS.md`, `docs/BUSINESS_RULES.md`, `docs/MVP_PLAN.md`,
`docs/AGENT_HANDOFF.md`, `docs/CODEX_BRIEFING.md`.
Validaciones: Prettier sobre los documentos nuevos.
Riesgos y pendientes: desalineación de migraciones (T-002); decisiones pendientes en
`docs/BUSINESS_RULES.md`, sección 11.
Para el otro agente: Codex, empieza por `docs/CODEX_BRIEFING.md`. Después revisa que `AGENTS.md` y `docs/MVP_PLAN.md` sean claros para
tu parte del trabajo y anota aquí cualquier ajuste que propongas.
