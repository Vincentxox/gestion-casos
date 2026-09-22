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
  Estado: En revisión

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
Estado: Propuesto | Aprobado | Aplicado en remoto
```

Aún no hay contratos publicados.

## Contexto conocido

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
