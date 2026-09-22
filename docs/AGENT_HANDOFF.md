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

Fase activa: **Fase 0 — Base de trabajo**.

- ID: T-001
  Tarea: `.gitattributes` con LF y verificación de que desaparecen los cambios solo de CRLF.
  Implementa: Claude Code
  Revisa: Codex
  Rama: agent/claude/line-endings
  Archivos o contratos que bloquea: `.gitattributes`
  Depende de: —
  Estado: Pendiente

- ID: T-002
  Tarea: propuesta para alinear el historial de migraciones local con el remoto.
  Implementa: Claude Code
  Revisa: Codex
  Rama: agent/claude/migration-history
  Archivos o contratos que bloquea: `supabase/migrations/`
  Depende de: —
  Estado: Pendiente (la ejecución requiere decisión del responsable)

- ID: T-003
  Tarea: actualizar `README.md` y `docs/MVP_PROGRESS.md` con el nuevo concepto y el plan.
  Implementa: Codex
  Revisa: Claude Code
  Rama: feature/stage-2-improvements (por instrucción del responsable)
  Archivos o contratos que bloquea: `README.md`, `docs/MVP_PROGRESS.md`
  Depende de: —
  Estado: Aprobado (commit 0267ccb, pendiente de push)

Siguientes (no empezar hasta integrar la fase 0): T-101, T-102, T-103 y T-104. Ver
`docs/MVP_PLAN.md`.

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

Aún no hay contratos publicados.

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
  `.prettierignore` y las 7 primeras migraciones. No incluirlos en commits (los resuelve
  T-001).
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
