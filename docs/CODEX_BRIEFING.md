# Instrucciones para Codex — Nueva propuesta de Nexo Casos

Fecha: 22 de septiembre de 2026 · Preparado por Claude (Cowork) con el responsable del
proyecto (Vincent).

Codex: este documento te pone al día sobre el cambio de rumbo del producto y sobre tu
papel en el equipo. Léelo completo antes de hacer cualquier cambio. Si algo de aquí
contradice `AGENTS.md`, manda `AGENTS.md`.

## 1. Qué cambió

Nexo Casos deja de ser un gestor de casos genérico. Ahora es un **producto B2B
multiempresa de solicitudes de mantenimiento con cierre firmado**:

1. Un **solicitante** de cualquier área pide un trabajo al área técnica.
2. El **jefe del área técnica** acepta o rechaza la solicitud y asigna un **técnico**.
3. El técnico ejecuta el trabajo y registra los **recursos** que usa: materiales,
   herramientas, equipos y horas.
4. El técnico llena y **firma** el reporte de cierre. En ese momento el contenido se
   congela.
5. El jefe técnico lo **valida** con su firma o lo devuelve con observaciones.
6. El jefe del área solicitante da la **conformidad** con su firma o lo devuelve. Con esa
   firma el caso queda **aprobado** y se genera un PDF como evidencia.

Cada empresa ve solo sus datos, y los usuarios entran por invitación.

La definición completa y obligatoria está en `docs/BUSINESS_RULES.md`. Lee en especial:

- sección 4 (roles);
- sección 5.2 (estados);
- sección 5.3 (transiciones permitidas y quién puede hacerlas);
- sección 5.4 (visibilidad);
- secciones 6 a 8 (recursos, reporte y firma).

## 2. Qué leer, en este orden

1. `AGENTS.md`: reglas de coordinación, frontend, backend, calidad y decisiones que
   requieren al responsable.
2. `docs/BUSINESS_RULES.md`: qué debe hacer la app.
3. `docs/MVP_PLAN.md`: fases y reparto de tareas.
4. `docs/AGENT_HANDOFF.md`: tablero, contratos publicados y registro de relevos.

## 3. Tu papel

- **Implementas el frontend**: servicios del cliente, hooks de TanStack Query, esquemas
  Zod, tipos, pantallas, componentes y pruebas.
- **Revisas el backend** que implementa Claude Code: migraciones, RLS, RPC, Storage y Edge
  Functions.
- Claude Code hace lo inverso: implementa el backend y revisa tu frontend.
- El responsable asigna, autoriza commits, push y merges, y decide las reglas de negocio.

## 4. Cómo trabajamos juntos

- **Rama y carpeta propias.** Trabaja en un worktree separado para no pisar la copia
  donde trabaja Claude Code:

  ```bash
  git worktree add ../gestion-casos-codex -b agent/codex/<tema> feature/stage-2-improvements
  ```

- **Antes de empezar**, revisa el tablero en `docs/AGENT_HANDOFF.md`. Toma solo tareas
  asignadas a Codex que no estén bloqueadas, y cambia su estado a «En curso».
- **Tablero único.** Edita siempre la copia oficial del tablero, en el worktree principal
  (la primera línea de `git worktree list`), nunca la de tu rama. Léela
  de nuevo justo antes de editarla y cambia solo tu tarea o tu entrada.
- **Solo contratos publicados.** Una pantalla solo usa tablas, columnas y RPC que estén
  en la sección «Contratos» del handoff con estado «Aprobado» o «Aplicado en remoto». Si
  necesitas algo que no existe, pídelo en el handoff. No crees migraciones por tu cuenta.
  Con un contrato «Aprobado» desarrollas y pruebas con el servicio simulado; la tarea
  solo pasa a «Aprobado» después de la prueba integrada con el contrato «Aplicado en
  remoto».
- **Al terminar**, agrega una entrada al registro del handoff con este contenido:
  - resumen;
  - archivos modificados;
  - validaciones;
  - riesgos;
  - qué debe revisar Claude Code.

  Luego pasa la tarea a «En revisión».

- **Al revisar el backend**, clasifica cada hallazgo como bloqueante, importante o
  sugerencia. Presta atención especial a:
  - que ningún usuario pueda leer o escribir datos de otra empresa;
  - que el estado del caso solo cambie mediante la RPC de transición;
  - que las firmas, las versiones firmadas y el historial no se puedan editar ni borrar;
  - que los límites de las validaciones sean los mismos en PostgreSQL y en Zod.
- **Desacuerdos**: deja tu propuesta en el handoff y decide el responsable.
- **Sin autorización del responsable no hagas**:
  - commit, push, merge o rebase;
  - agregar dependencias;
  - cambiar `app.json`, `eas.json`, OAuth o la navegación principal.

## 5. Tus primeras tareas (fase 0)

1. **T-003 · Documentación.** Actualiza `README.md` y `docs/MVP_PROGRESS.md`:
   - el nuevo concepto del producto;
   - el enlace a los documentos de reglas y plan;
   - la estructura actual de `src/`, que ahora incluye `admin`, `areas`, `categories`,
     `home` y `settings`;
   - los comandos de iOS (`npx expo run:ios`) y de EAS;
   - el estado real de las pruebas (67 pruebas aprobadas).

   En `MVP_PROGRESS.md`, marca como completada la administración básica de usuarios y
   catálogos, y agrega las fases de `docs/MVP_PLAN.md`.

2. **Revisión de los documentos.** Lee `AGENTS.md` y `docs/MVP_PLAN.md` desde tu rol y
   anota en el handoff lo que sea ambiguo o difícil de cumplir para el frontend.
3. **Revisión de T-001** (Claude Code) cuando pase a «En revisión».

## 6. Qué te tocará en el frontend (para planificar)

Estas tareas no se empiezan hasta que su fase esté activa y el contrato esté aprobado.

- **Fase 1 · T-104**:
  - nuevos roles en `src/features/auth/types.ts` y en la matriz de
    `src/features/auth/permissions.ts`, con `visualizador` convertido en `solicitante`;
  - la empresa en el perfil y una pantalla para usuarios sin empresa;
  - en Administrar: cambio de rol, invitaciones y tipo de área (solicitante o técnica).
- **Fase 2 · T-202**, rediseño del módulo `src/features/cases/`:
  - el formulario usa `category_id` (tipo de servicio) en lugar del nombre;
  - las listas pasan a ser «Mis solicitudes», «Mi área» y «Bandeja técnica»;
  - el detalle muestra los nombres del creador y del técnico, y una línea de tiempo;
  - las acciones visibles dependen del estado y el rol, según la sección 5.3;
  - pantallas para aceptar o rechazar, asignar, pausar, reanudar y cancelar;
  - `ChangeCaseStatusScreen` se sustituye por acciones específicas de cada transición.
- **Fase 3 · T-302**: catálogo de recursos en Administrar y registro de uso dentro del
  caso.
- **Fase 4 · T-402**:
  - formulario del reporte, con recursos precargados y fotos de antes y después
    (`expo-image-picker` ya está instalado);
  - captura del trazo de firma (la biblioteca requiere aprobación);
  - pantallas para validar, devolver y dar conformidad;
  - descarga del PDF.
- **Fase 5**: registro de notificaciones (`expo-notifications` ya está instalado) y el
  panel de indicadores en Inicio.

## 7. Reglas de frontend que no se negocian

- Las pantallas no llaman a Supabase: usan hooks del módulo, y los hooks usan el servicio.
- Los permisos en pantalla (`hasPermission`, `usePermission`, `PermissionGate`) son solo
  para la experiencia de usuario. La seguridad real está en RLS y RPC. Si la matriz del
  cliente no coincide con el backend, repórtalo.
- Toda pantalla con datos remotos muestra carga, error con reintento y vacío.
- Mantén safe area, `KeyboardFormScrollView` en los formularios, accesibilidad básica,
  tokens de `src/theme/tokens.ts` y textos en español neutro.
- Todo comportamiento nuevo lleva pruebas. Agrega los servicios, esquemas y utilidades
  nuevos a `jest.collectCoverageFrom` y mantén la cobertura global en 80 % o más.

## 8. Validaciones antes de entregar

```bash
npm run format:check
npm run typecheck
npm run lint -- --max-warnings=0
npm run test:coverage
```

Ejecuta `npx expo-doctor` si tocas dependencias o configuración. Si un comando no puede
ejecutarse en tu entorno, dilo; no lo reportes como aprobado.

## 9. Situación conocida del repositorio

- En la copia de Windows hay cambios solo de CRLF en `.editorconfig`, `.gitignore`,
  `.prettierignore` y en las 7 primeras migraciones. No los incluyas en commits; los
  resuelve T-001.
- Las versiones de las migraciones locales no coinciden con las remotas (T-002). No
  ejecutes comandos de Supabase que apliquen, reinicien o reparen migraciones.
- Los borradores de `Claude outputs/` se retiraron; las versiones vigentes están en
  `docs/`.
- Estado verificado el 22/09/2026: typecheck y Prettier correctos; 67 pruebas aprobadas.
