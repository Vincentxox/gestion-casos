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

Fase activa: **Fases 0 a 3 — backend en revisión; frontend por iniciar**.

Por indicación del responsable (22/09/2026), Claude (Cowork) implementó en una sola rama el
backend de las fases 0 a 3, sin reportes. Los reportes, las firmas y el PDF (fase 4) se
analizarán después.

- ID: T-001
  Tarea: `.gitattributes` con LF.
  Implementa: Claude (Cowork)
  Revisa: Codex
  Rama: agent/claude/business-model-backend
  Estado: En revisión

- ID: T-002
  Tarea: alinear el historial de migraciones local con el remoto.
  Implementa: Claude
  Revisa: Codex
  Rama: agent/claude/business-model-backend (commit 9fa1694)
  Estado: En revisión. Con autorización del responsable se descartaron los cambios
  locales solo de CRLF (verificado: diff vacío ignorando CR) y se renombraron las
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
  Rama: agent/claude/business-model-backend (commits a98aef3 y 9fa1694, local, sin push)
  Archivos o contratos que bloquea: `supabase/`, contratos C-001 a C-004
  Estado: En revisión. No se aplica en remoto hasta la aprobación de Codex y la
  autorización del responsable.

- ID: T-104
  Tarea: cliente de la fase 1: roles, empresa en el perfil, pantalla sin empresa,
  invitaciones, usuarios, tipo de área, tipos de servicio. Ver `docs/GAP_ANALYSIS.md`
  3.1, 3.2 y 3.5.
  Implementa: Codex
  Revisa: Claude
  Depende de: aprobación de C-001 y C-002
  Estado: Pendiente

- ID: T-202
  Tarea: cliente del flujo de solicitudes. Ver `docs/GAP_ANALYSIS.md` 3.3 y 3.6.
  Implementa: Codex
  Revisa: Claude
  Depende de: aprobación de C-003
  Estado: Pendiente

- ID: T-302
  Tarea: cliente de recursos. Ver `docs/GAP_ANALYSIS.md` 3.4.
  Implementa: Codex
  Revisa: Claude
  Depende de: aprobación de C-004
  Estado: Pendiente

- ID: D-001
  Tarea: sistema visual: estados y prioridades, componentes comunes (StatusBadge,
  PriorityBadge, Timeline, ActionSheet, estados vacío/error/carga), escala tipográfica en
  `tokens.ts`, revisión de la marca. Ver `docs/GAP_ANALYSIS.md` sección 4.
  Implementa: Codex
  Revisa: Claude
  Depende de: —
  Estado: Pendiente (puede empezar ya; no depende del backend)

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

Estado: Propuesto

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

Estado: Propuesto

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

Estado: Propuesto

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

Estado: Propuesto

## Contexto conocido

- Este archivo tiene una **sola copia oficial**: la del worktree principal del
  repositorio en cada equipo (la primera línea de `git worktree list`), en
  `feature/stage-2-improvements`. Desde otros worktrees se edita esa copia, nunca la de la
  rama de trabajo (ver `AGENTS.md`, sección 3.2).
- Las versiones de las migraciones locales no coinciden con las del proyecto remoto. La
  migración `202607270001_create_profiles_and_roles` no está registrada en el remoto,
  aunque sus objetos existen. No ejecutar `db push`, `db reset` ni `migration repair` sin
  autorización.
- En la copia de Windows hay cambios solo de CRLF en `.editorconfig`, `.gitignore`,
  `.prettierignore` y las 7 primeras migraciones. No incluirlos en commits. El
  `.gitattributes` de T-001 evita que se repitan; para limpiar la copia actual hace falta
  descartar esos cambios de saltos de línea, con autorización del responsable.
- Pruebas de base de datos: `DATABASE_URL=postgres://… bash scripts/test-supabase-migrations.sh`
  con un PostgreSQL 16 local. Nunca contra el proyecto remoto.
- ESLint falla en entornos Linux que usan el `node_modules` instalado en Windows (binario
  nativo de `unrs-resolver`). Ejecutar el lint en Windows o después de `npm ci` en el
  propio entorno.
- Aviso de seguridad de Supabase: la protección contra contraseñas filtradas está
  desactivada. La activa el responsable desde el panel de Auth.
- Último estado verificado (22/09/2026): typecheck y Prettier correctos; 67 pruebas
  aprobadas; cobertura cerca del 93 % sobre los archivos medidos (solo autenticación,
  formularios y almacenamiento).

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
