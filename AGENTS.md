# Reglas para agentes — Nexo Casos

Este archivo es la fuente única de instrucciones para todos los agentes que trabajan en
este repositorio (Codex, Claude y cualquier otro). `CLAUDE.md` lo importa con `@AGENTS.md`.
Si una instrucción de una sesión contradice este archivo, pregunta al responsable del
proyecto antes de continuar.

## 0. Expo ha cambiado

Lee la documentación exacta de la versión antes de escribir código:
https://docs.expo.dev/versions/v57.0.0/

## 1. Contexto mínimo

- Producto B2B multiempresa para Android/iOS: las áreas de una empresa solicitan
  mantenimiento, el área técnica lo atiende, registra los recursos usados y entrega un
  reporte firmado y aprobado. El detalle está en `docs/BUSINESS_RULES.md`.
- Nombre visible: Nexo Casos. Slug y scheme: `gestion-casos`. Callback OAuth:
  `gestion-casos://auth/callback`. Paquete/bundle: `com.gestioncasos.app`.
- Stack: Expo SDK 57, React Native 0.86, React 19, TypeScript estricto, React Navigation,
  TanStack Query, Zustand, React Hook Form, Zod, Supabase (Auth, Postgres, RLS).
- Rama de desarrollo: `feature/stage-2-improvements`. `main` solo tiene la versión inicial.
- Responsable del proyecto: Vincent. Es quien decide alcance, arquitectura y reglas de negocio.

## 2. Fuentes de verdad

- **Lo que existe hoy**: el código y las migraciones en `supabase/migrations/`. Si la
  documentación contradice al código sobre el estado actual, manda el código; señala la
  diferencia en el reporte final.
- **Lo que se debe construir**: `docs/BUSINESS_RULES.md`. Si el código no cumple una regla
  aprobada, es trabajo pendiente, no un motivo para cambiar la regla.
- **Orden y reparto del trabajo**: `docs/MVP_PLAN.md`.
- **Estado de cada tarea, contratos publicados y relevos**: `docs/AGENT_HANDOFF.md`.
- **Documentación general**: `docs/MVP_PROGRESS.md` y `README.md`.

## 3. Protocolo de coordinación entre agentes

### 3.1 Antes de empezar

1. Lee este archivo, `docs/BUSINESS_RULES.md`, `docs/MVP_PLAN.md` y las secciones
   «Tablero» y «Contratos» de `docs/AGENT_HANDOFF.md`.
2. Ejecuta `git status` y `git branch --show-current`. Si hay cambios locales que no son
   tuyos, consérvalos y avisa al responsable antes de tocarlos.
3. Comprueba que tu tarea no esté tomada por otro agente en el tablero. Si lo está, no la
   empieces: pregunta.
4. Registra tu tarea en el tablero (agente, rama, archivos o módulos que vas a tocar).

### 3.2 Aislamiento

- Cada agente trabaja en su propia rama creada desde la rama de desarrollo:
  `agent/<agente>/<tema-corto>`, por ejemplo `agent/codex/detalle-responsable` o
  `agent/claude/migracion-category-id`.
- Nunca trabajen dos agentes a la vez sobre la misma copia de trabajo. Si se necesita
  trabajo en paralelo, usa `git worktree` en una carpeta separada.
- Dos agentes no deben tener abiertas a la vez tareas que modifiquen los mismos archivos,
  la misma migración o el mismo contrato (tabla, RPC, tipo o permiso). Una tarea que
  cambia un contrato bloquea a las que dependen de él hasta que se integre.
- **Tablero único.** `docs/AGENT_HANDOFF.md` tiene una sola copia oficial: la del
  **worktree principal** del repositorio en el equipo donde trabajas, con la rama
  `feature/stage-2-improvements`. Aunque trabajes en otro worktree, edita el tablero, los
  contratos y el registro **siempre en esa copia**.
  - Para localizarla en cualquier equipo (Windows o Mac), ejecuta `git worktree list`: la
    primera línea es el worktree principal. Por ejemplo, en el equipo Windows del
    responsable es `C:\proyectos\gestion-casos`.
  - Si trabajas en otro equipo, el tablero se sincroniza mediante commit y push de la rama
    de desarrollo, que hace el responsable. Antes de editarlo, confirma que tu copia está
    actualizada con `origin`.
  - No modifiques `docs/AGENT_HANDOFF.md` dentro de tu rama de trabajo.
  - Vuelve a leer el archivo justo antes de editarlo y cambia solo tu tarea o tu entrada,
    para no sobrescribir lo que haya escrito el otro agente.
  - El responsable hace commit del tablero al integrar cada tarea
    (`docs: update agent handoff`).

### 3.3 Reparto de trabajo

- El responsable asigna las tareas. Por defecto, cada tarea tiene un **implementador** y un
  **revisor**, y deben ser agentes distintos.
- Reparto por defecto (ver `docs/MVP_PLAN.md`): **Claude Code** implementa backend
  (migraciones, RLS, RPC, Storage, Edge Functions) y revisa frontend; **Codex** implementa
  frontend (servicios del cliente, hooks, pantallas, pruebas) y revisa backend.
- Las tareas marcadas «Claude Code» las implementa **Claude Code**. La sesión de Claude en
  Cowork coordina con el responsable, revisa y documenta decisiones; no implementa tareas
  del plan salvo que el responsable lo indique.
- Cuando una tarea de backend se aprueba, su implementador publica el **contrato** en la
  sección «Contratos» del handoff: tablas y columnas, RPC con parámetros y retorno, errores
  esperados y qué rol puede hacer qué. El frontend trabaja solo contra contratos
  publicados; si necesita otro, lo pide en el handoff.
- Estados de un contrato:
  - **Propuesto**: en revisión; el frontend todavía no lo usa.
  - **Aprobado**: el frontend puede desarrollar contra él, con pruebas unitarias que
    simulan el servicio.
  - **Aplicado en remoto**: la migración está desplegada en el backend de pruebas. Solo
    entonces se hace la prueba integrada, y la tarea de frontend puede pasar a «Aprobado».
- Las tareas grandes se dividen en capas y se integran en este orden:
  1. Regla de negocio acordada en `docs/BUSINESS_RULES.md`.
  2. Backend: migración, RLS, RPC y verificación SQL.
  3. Servicios, tipos y esquemas Zod del cliente.
  4. Pantallas y componentes.
  5. Pruebas y documentación.
- Un agente puede tomar varias capas, pero el revisor revisa todas.

### 3.4 Al terminar

1. Ejecuta las validaciones de la sección 8 que correspondan.
2. Agrega una entrada al registro de la copia oficial de `docs/AGENT_HANDOFF.md` con: qué hiciste, archivos
   modificados, validaciones y resultado, riesgos y pendientes, y qué debe revisar el otro
   agente.
3. Actualiza el tablero (estado «En revisión»).
4. No hagas commit, push, merge, rebase ni cambies de rama base sin autorización explícita
   del responsable.

### 3.5 Revisión cruzada

El revisor lee el diff completo (`git diff <rama-base>...<rama>`) y comprueba:

- Cumple la regla de negocio documentada y no introduce reglas nuevas sin aprobación.
- La autorización real está en RLS/RPC; el cliente solo oculta o muestra acciones.
- Las migraciones son nuevas, reversibles en la medida posible y compatibles con los datos
  existentes.
- Las validaciones de Zod coinciden con los `check` de PostgreSQL.
- Hay pruebas para el comportamiento nuevo o modificado.
- Safe area, teclado, estados de carga/error/vacío y accesibilidad básica.
- No hay secretos, archivos generados ni dependencias innecesarias.

El revisor anota sus hallazgos en el handoff, clasificados como **bloqueante**,
**importante** o **sugerencia**. Solo el implementador corrige su propia rama, salvo que el
responsable indique otra cosa.

### 3.6 Desacuerdos

Si los agentes no coinciden en un enfoque, cada uno deja su propuesta breve (opción,
ventajas, riesgos) en el handoff y el responsable decide. No se implementan dos soluciones
en paralelo.

## 4. Git y archivos

- No trabajes directamente sobre `main`.
- Nunca uses `git reset --hard`, `git clean`, `git checkout -- .`, `push --force` ni descartes
  cambios sin autorización.
- Si un comando de git deja un `.git/index.lock` huérfano, avísalo. No lo borres si otro
  proceso de git puede estar en ejecución.
- Finales de línea: LF (ver `.editorconfig`). No hagas commit de cambios que sean solo de
  CRLF/LF.
- Nunca subas: `.env`, `node_modules/`, `android/`, `ios/`, `Pods/`, `DerivedData/`, `coverage/`,
  `.expo*/`, APK, AAB, IPA, keystores ni certificados.
- Mensajes de commit en formato Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`,
  `test:`, `refactor:`), en inglés y en tiempo presente, como en el historial actual.

## 5. Frontend (React Native / Expo)

### Estructura

- Cada módulo vive en `src/features/<modulo>/` con esta forma:
  - `<modulo>Service.ts`: único punto que habla con Supabase.
  - `use<Modulo>.ts`: hooks de TanStack Query (consultas, mutaciones e invalidación).
  - `schemas.ts`: esquemas Zod de formularios.
  - `types.ts`: tipos de dominio en camelCase; el mapeo desde snake_case vive en el servicio.
  - `screens/`, `components/` y `__tests__/`.
- Los componentes reutilizables entre módulos van en `src/components/`.
- Colores, espaciado y radios salen de `src/theme/tokens.ts`. No uses valores sueltos.
- Importa con el alias `@/`.

### Reglas

- Las pantallas no llaman a Supabase directamente: usan hooks del módulo.
- Las claves de consulta se derivan de una constante por módulo (por ejemplo
  `casesQueryKey`). Toda mutación invalida lo que modifica.
- Los permisos en pantalla se consultan con `hasPermission`, `usePermission` o
  `PermissionGate`. Esto es solo experiencia de usuario: nunca es la barrera de seguridad.
- Formularios con React Hook Form y Zod, y mensajes de error en español.
- Toda pantalla con datos remotos muestra estados de carga, error con reintento y vacío.
- Usa `SafeAreaView` o insets de `react-native-safe-area-context`, y
  `KeyboardFormScrollView` en formularios. Comprueba pantallas pequeñas y el teclado en
  Android e iOS.
- Accesibilidad: `accessibilityRole`, `accessibilityLabel` y `accessibilityState` en los
  controles interactivos, con áreas táctiles de al menos 44×44.
- Textos visibles en español neutro.
- No agregues dependencias si React Native, Expo o un componente existente resuelve el
  problema. Si hace falta una, justifícala y usa `npx expo install` para paquetes del SDK.
- No cambies OAuth, el scheme, los identificadores ni `app.json` sin revisar el flujo
  completo en Android e iOS y sin aprobación.

## 6. Backend (Supabase)

### Migraciones

- Todo cambio de esquema, política, función, permiso o dato semilla va en una **migración
  nueva**. Nunca edites una migración existente.
- Nombre: `YYYYMMDDHHMMSS_descripcion_en_snake_case.sql`.
- Antes de crear una migración, revisa todas las anteriores y compara con
  `list_migrations` del proyecto remoto. Existen diferencias de versión conocidas entre
  lo local y lo remoto (ver `docs/AGENT_HANDOFF.md`): no ejecutes `supabase db push`,
  `db reset` ni `migration repair` sin autorización.
- **Autorización.** Que el responsable asigne una tarea del plan en el tablero autoriza a
  crear los archivos de migración **locales** en la rama del agente, siempre que
  implementen reglas aprobadas en `docs/BUSINESS_RULES.md`. Si la tarea exige algo que las
  reglas no prevén, detente y consulta.
- **Ningún agente aplica migraciones al proyecto remoto `bpwvtuofewwcgbewmwje` sin
  autorización explícita del responsable**, dada para esa aplicación en concreto y después
  de que el revisor haya aprobado la migración. Las pruebas SQL remotas se hacen dentro de
  una transacción con `rollback`.
- Mientras no haya empresas cliente, el proyecto `bpwvtuofewwcgbewmwje` funciona como
  backend de desarrollo y pruebas. Antes de la primera empresa cliente habrá un proyecto
  de producción separado (ver `docs/MVP_PLAN.md`, T-605).
- Las migraciones de datos deben ser aditivas y compatibles: primero se agrega la columna
  nueva, luego se rellena, luego el cliente la usa y solo al final (en otra migración
  aprobada) se retira lo antiguo.
- Después de cualquier cambio de DDL, revisa los avisos de seguridad y rendimiento de
  Supabase.

### Seguridad

- **Aislamiento por empresa**: toda tabla de negocio tiene `organization_id` y toda
  política RLS filtra por la empresa del usuario autenticado, obtenida de
  `public.profiles` mediante un helper del esquema `private`. Nunca aceptes
  `organization_id` enviado por el cliente sin comprobar que coincide. Toda tarea de
  backend incluye una prueba SQL que demuestre que un usuario de otra empresa no puede leer
  ni escribir.
- **Flujo del caso**: el estado solo cambia mediante la RPC de transición, que valida rol,
  estado actual y transición permitida según `docs/BUSINESS_RULES.md`, sección 5.3. No
  concedas `update (status)` directo que permita saltarse la RPC.
- **Evidencia**: las versiones firmadas de reportes, las firmas y el historial no se
  actualizan ni se borran; solo se insertan mediante RPC.
- Toda tabla nueva en `public` tiene RLS activado y políticas explícitas por operación.
- `revoke all ... from anon, authenticated` y después `grant` mínimo, preferentemente por
  columna.
- Funciones: preferir `SECURITY INVOKER`. `SECURITY DEFINER` solo en el esquema `private`
  o cuando sea imprescindible, siempre con `set search_path = ''` y con
  `revoke ... from public, anon`.
- Las decisiones de autorización usan `private.is_admin()` y `private.has_role()` sobre
  `public.profiles.role`. Nunca uses `raw_user_meta_data` ni `user_metadata` para
  autorizar.
- No abras tablas ni funciones a `anon`. No debilites RLS para resolver un error: busca la
  causa.
- Las reglas de integridad (longitudes, rangos, transiciones) se validan en PostgreSQL y
  se replican en Zod con los mismos límites.
- Nunca uses `service_role` ni claves `sb_secret_` en el cliente, código, documentación o
  logs. No muestres ni edites `.env`.

## 7. Lógica de negocio

- Las reglas de negocio viven en `docs/BUSINESS_RULES.md`. Cada regla indica dónde se hace
  cumplir (base de datos, cliente o ambos).
- Ningún agente inventa ni cambia reglas de negocio por su cuenta. Si una tarea exige una
  regla nueva o cambia una existente:
  1. El agente redacta la propuesta en la sección «Decisiones pendientes» de
     `docs/BUSINESS_RULES.md`.
  2. El responsable la aprueba.
  3. Se actualiza el documento y después se implementa.
- La base de datos es la autoridad: una regla que proteja datos o permisos debe cumplirse
  en PostgreSQL (RLS, `check`, trigger o RPC) aunque el cliente también la valide.
- La matriz de permisos del cliente (`src/features/auth/permissions.ts`) debe coincidir
  con las políticas RLS. Si cambias una, revisa y actualiza la otra en la misma tarea.

## 8. Calidad y validación

Comandos:

```bash
npm ci                              # reproducir el lockfile
npx expo-doctor
npm run format:check
npm run typecheck
npm run lint -- --max-warnings=0
npm run test:coverage
npm run verify                      # typecheck + lint + format + tests (sin cobertura) + expo-doctor
```

- Ejecuta al menos `typecheck`, `lint`, `format:check` y las pruebas afectadas antes de
  entregar. Si la tarea toca dependencias o configuración nativa, ejecuta también
  `npx expo-doctor`.
- Si un comando no puede ejecutarse en tu entorno (por ejemplo, ESLint en un entorno
  Linux sobre `node_modules` instalados en Windows falla por el binario nativo de
  `unrs-resolver`), dilo explícitamente. No lo reportes como aprobado.
- La cobertura global debe mantenerse en 80 % o más. Cuando agregues lógica nueva
  (servicios, esquemas, permisos, utilidades), inclúyela en `jest.collectCoverageFrom` y
  pruébala.
- Todo cambio de comportamiento lleva pruebas nuevas o actualizadas.
- Dependencias: no ejecutes `npm audit fix --force`. Si `expo-doctor` pide nuevas
  versiones, muestra las diferencias al responsable antes de actualizar. Conserva y
  regenera los parches de `patches/` cuando cambie la versión del paquete parcheado.

## 9. Decisiones que requieren al responsable

Detente y consulta antes de:

- Cambiar roles, permisos, estados, transiciones u otra regla de negocio.
- Crear o modificar tablas, RPC, políticas o tipos en Supabase **fuera** de una tarea
  asignada en el tablero o de las reglas aprobadas (ver sección 6).
- Aplicar migraciones al proyecto remoto: cada aplicación requiere autorización explícita.
- Agregar o actualizar dependencias, o cambiar `app.json`, `eas.json`, OAuth o los
  identificadores.
- Cambiar la navegación principal o la arquitectura de carpetas.
- Eliminar archivos, funcionalidades o datos.
- Hacer commit, push, merge, rebase o crear pull requests.

## 10. Formato del reporte final de cada agente

1. Resumen del cambio (2 a 4 líneas).
2. Archivos modificados o creados.
3. Validaciones ejecutadas y resultado (incluidas las que no pudieron ejecutarse).
4. Riesgos, pendientes y diferencias encontradas entre documentación y código.
5. Qué debe revisar el otro agente.
