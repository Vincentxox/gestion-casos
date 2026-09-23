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
  Estado: Pendiente

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
