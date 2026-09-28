# Plan de implementación del MVP — Nexo Casos

Versión 1 · 22 de septiembre de 2026.

Implementa las reglas de `docs/BUSINESS_RULES.md` (versión 2). Lo ejecutan Claude Code y
Codex según el protocolo de `AGENTS.md`. El estado de cada tarea vive en
`docs/AGENT_HANDOFF.md`.

## Reparto por defecto

- **Claude Code**: backend (migraciones, RLS, RPC, Storage, Edge Functions) y revisión del
  frontend.
- **Codex**: frontend (servicios del cliente, hooks, pantallas, componentes, pruebas de UI)
  y revisión del backend.
- El responsable puede reasignar cualquier tarea en el tablero.

## Reglas del plan

- Las fases van en orden. Una fase empieza cuando la anterior está **integrada**.
- Dentro de una fase, la tarea de backend se revisa primero. Cuando se aprueba, publica su
  **contrato** en el handoff: tablas, columnas, RPC con parámetros, errores esperados y
  permisos. El frontend trabaja contra ese contrato.
- Ninguna migración se aplica al proyecto remoto sin autorización del responsable. Antes
  de aplicarla, el revisor debe haberla aprobado.
- Asignar una tarea autoriza a crear sus migraciones **locales**. Aplicarlas en remoto es
  una autorización aparte (ver `AGENTS.md`, sección 6).
- **Backend de pruebas**: mientras no haya empresas cliente, el proyecto
  `bpwvtuofewwcgbewmwje` es el entorno de desarrollo y pruebas. El frontend desarrolla
  contra contratos «Aprobados», pero una tarea de frontend solo se aprueba después de la
  prueba integrada contra el contrato «Aplicado en remoto».
- El tablero de `docs/AGENT_HANDOFF.md` tiene una sola copia oficial, en la carpeta
  principal (ver `AGENTS.md`, sección 3.2).
- Cada tarea termina con pruebas y las validaciones de `AGENTS.md`, sección 8.

## Fase 0 — Base de trabajo

- **T-001 · Finales de línea** (Claude Code; revisa Codex): agregar `.gitattributes` con
  LF para texto y comprobar que los cambios solo de CRLF desaparecen.
- **T-002 · Historial de migraciones** (Claude Code; revisa Codex): proponer cómo alinear
  las versiones locales con las del proyecto remoto (renombrar archivos locales o
  `migration repair`). Requiere decisión del responsable antes de ejecutar.
- **T-003 · Documentación** (Codex; revisa Claude Code): actualizar `README.md` y
  `docs/MVP_PROGRESS.md` con el nuevo concepto, las fases y los comandos de iOS y EAS.

## Fase 1 — Multiempresa, áreas y roles

- **T-101 · Empresas** (Claude Code): crear la tabla `organizations`, agregar
  `organization_id` a las tablas de negocio, migrar los datos a una empresa inicial, crear
  el helper `private.current_organization_id()` y reescribir las políticas RLS para aislar
  por empresa.
- **T-102 · Invitaciones** (Claude Code): tabla de invitaciones con correo, rol y área, y
  vinculación automática al registrarse con un correo verificado. Usuarios sin empresa no
  ven datos.
- **T-103 · Roles y tipos de área** (Claude Code): roles `administrador`, `jefe_area`,
  `tecnico`, `solicitante` y `auditor` (`visualizador` pasa a `solicitante`); tipo de área
  `solicitante` o `tecnica`; RPC para cambiar el rol, que impide dejar la empresa sin
  administrador.
- **T-104 · Cliente de la fase 1** (Codex): tipos y matriz de permisos nuevos; perfil con
  empresa; pantalla para usuarios sin empresa; administración de usuarios con rol, área e
  invitaciones; tipo de área en el módulo de áreas.

## Fase 2 — Flujo de solicitudes

- **T-201 · Backend del flujo** (Claude Code):
  - estados nuevos y mapeo de datos existentes;
  - RPC única de transición con validación por rol y estado;
  - `category_id`, área solicitante y área destino;
  - historial ampliado (rol, motivo, reasignaciones);
  - visibilidad por rol;
  - vista o RPC de nombres de perfiles.
- **T-202 · Cliente del flujo** (Codex):
  - formulario con tipo de servicio;
  - listas «Mis solicitudes», «Mi área» y «Bandeja técnica»;
  - detalle con nombres y línea de tiempo;
  - acciones visibles según estado y rol;
  - pantallas de aceptar o rechazar, asignar, pausar y cancelar.

## Fase 3 — Recursos

- **T-301 · Backend de recursos** (Claude Code): catálogo y registro de uso, con las reglas
  de estado y de rol de la sección 6.
- **T-302 · Cliente de recursos** (Codex): catálogo en Administrar y registro de uso
  dentro del caso.

## Fase 4 — Reporte, firma y PDF

- **T-401 · Backend del reporte** (Claude Code):
  - reportes versionados;
  - RPC de firma con hash SHA-256 calculado en el servidor;
  - orden obligatorio de firmas;
  - buckets privados de Storage por empresa para fotos y trazos, con sus políticas.
- **T-402 · Cliente del reporte** (Codex): formulario del reporte, fotos de antes y
  después, captura del trazo de firma, pantallas de validar, devolver y dar conformidad.
  La biblioteca para capturar el trazo requiere aprobación del responsable.
- **T-403 · PDF** (Claude Code): Edge Function que genera el PDF al aprobar el caso y lo
  guarda en Storage; descarga desde el detalle.

## Fase 5 — Notificaciones e indicadores

- **T-501 · Notificaciones** (Claude Code en backend; Codex en cliente): registro del
  token del dispositivo y envío en cada transición.
- **T-502 · Tiempos y panel** (Claude Code en backend; Codex en cliente): configuración de
  tiempos por prioridad, indicador de casos vencidos y panel de inicio con indicadores.

## Fase 6 — Estabilización y entrega

- **T-601**: revisión completa de seguridad RLS entre empresas, con pruebas SQL de
  aislamiento.
- **T-602**: pruebas de flujo completo en Android e iOS, con un usuario de cada rol.
- **T-603**: perfiles `development` y `production` en `eas.json`, firma de producción de
  Android y distribución de iOS.
- **T-604**: limpieza de dependencias sin uso y documentación de instalación y uso.
- **T-605**: crear el proyecto de Supabase de producción, aplicar allí las migraciones
  aprobadas, configurar Auth (Google, correo, protección contra contraseñas filtradas) y
  separar las variables de entorno por perfil de EAS. Debe completarse antes de la
  primera empresa cliente.
