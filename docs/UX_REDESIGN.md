# Rediseño por rol — Nexo Casos

Versión 1 · 23 de septiembre de 2026 · Autor: Claude (Cowork) · Aprobado por el
responsable.

Especificación para Codex. Resuelve los problemas vistos en la prueba integrada del
22/09/2026: el Inicio no dice nada útil, todos los roles ven los mismos filtros, no hay
avisos de configuración incompleta y quien se registra sin invitación queda bloqueado
sin que nadie lo sepa. Los reportes, firmas y PDF siguen fuera de alcance.

Contratos: C-001 a C-004 (aplicados) y C-005, C-006 (nuevos, en
`agent/claude/access-and-home`).

## 1. Principios

1. **Cada rol ve su trabajo, no la app entera.** Lo primero que ve una persona es lo
   que tiene que hacer hoy.
2. **Una acción principal por pantalla**, visible sin desplazarse. Las secundarias van
   en un menú.
3. **Nunca una pantalla vacía sin explicación.** Todo estado vacío dice por qué está
   vacío y qué hacer.
4. **Los números llevan a algún sitio.** Cada contador es tocable y abre la lista
   filtrada correspondiente.
5. **La app no oculta problemas de configuración.** Si el flujo no puede avanzar (por
   ejemplo, un área técnica sin técnicos), se avisa a quien puede arreglarlo.

## 2. Navegación por rol

Pestañas inferiores (máximo 4). La pestaña Administrar solo existe para el
administrador.

- **Solicitante:** Inicio · Mis solicitudes · Perfil.
- **Técnico:** Inicio · Mis trabajos · Solicitudes del área · Perfil.
- **Jefe de área técnica:** Inicio · Bandeja · Solicitudes · Perfil.
- **Jefe de área solicitante:** Inicio · Solicitudes del área · Perfil.
- **Administrador:** Inicio · Solicitudes · Administrar (con contador de pendientes) ·
  Perfil.
- **Auditor:** Inicio · Solicitudes · Perfil.

La pestaña de solicitudes usa la misma pantalla con un filtro inicial distinto según el
rol (sección 4.1). El botón «Nueva solicitud» se muestra a todos los roles que pueden
crear (todos menos el auditor) y que tienen área.

## 3. Inicio por rol

Fuente de datos: `get_home_summary()` (contrato C-006). Se recarga al enfocar la
pestaña y con «deslizar para actualizar». Estructura común:

- Encabezado: saludo con el nombre, empresa y una línea con rol y área («Técnico ·
  Mantenimiento»). Sin el botón de engranaje flotante actual.
- Bloque «Lo que requiere tu atención»: tarjetas de conteo tocables (`StatTile`).
- Acceso rápido principal según el rol.
- Nada de textos genéricos como «Tu espacio de trabajo».

### 3.1 Solicitante (y jefe de área solicitante)

- Botón principal grande: **Nueva solicitud**.
- Tarjetas: «En curso» (`mine.solicitudes_activas`); para el jefe, además «Activas en
  mi área» (`cases.activas`).
- Lista corta de sus 3 solicitudes más recientes con estado y fecha.
- Si no tiene área (`has_area = false`): aviso «Tu administrador aún no te asignó un
  área. Sin área no puedes crear solicitudes.» y ocultar el botón.

### 3.2 Técnico

- Tarjetas: «Por iniciar» (`mine.trabajos_por_iniciar`), «En ejecución»
  (`mine.trabajos_en_ejecucion`), «En espera» (`mine.trabajos_en_espera`).
- Lista «Mis trabajos» ordenada por prioridad y fecha.
- Estado vacío: «No tienes trabajos asignados. Cuando el jefe de tu área te asigne una
  solicitud, aparecerá aquí.»

### 3.3 Jefe de área técnica

- Tarjetas destacadas: «Por aceptar» (`inbox.por_aceptar`) y «Sin asignar»
  (`inbox.sin_asignar`), con color de alerta si son mayores que 0.
- Tarjetas secundarias: «En ejecución», «En espera», «Alta prioridad activas».
- Acceso rápido: «Ir a la bandeja».

### 3.4 Administrador

- Si hay alertas de configuración, primero un bloque **«Completa la configuración»** con
  una fila por problema y un botón que lleva a la pantalla que lo resuelve:
  - `admin.areas_tecnicas_sin_jefe` → «Mantenimiento no tiene jefe de área» → Usuarios.
  - `admin.areas_tecnicas_sin_tecnico` → «… no tiene técnicos» → Usuarios.
  - `admin.usuarios_sin_area` → «N usuarios sin área» → Usuarios filtrado.
  - `admin.usuarios_sin_nombre` → «N usuarios sin nombre» (informativo).
  - `admin.solicitudes_acceso_pendientes` → «N personas pidieron acceso» → Solicitudes
    de acceso.
  - `admin.tipos_servicio_activos = 0` o `admin.recursos_activos = 0` → catálogos.
- Después, tarjetas de operación: «Por aceptar», «Sin asignar», «En ejecución», «En
  espera», «Cerradas en 30 días».
- Si no hay alertas, el bloque desaparece.

### 3.5 Auditor

- Mismas tarjetas de operación que el administrador, sin alertas de configuración ni
  acciones.

## 4. Solicitudes

### 4.1 Listado

- Filtros de alcance solo cuando aplican al rol:
  - Solicitante: sin filtro de alcance (ve lo suyo y lo de su área).
  - Técnico: «Mis trabajos» (predeterminado) · «Mi área».
  - Jefe técnico: «Bandeja» (por aceptar y sin asignar, predeterminado) · «Mi área» ·
    «En curso».
  - Jefe solicitante: «Mi área» (predeterminado) · «Mías».
  - Administrador y auditor: «Todas» (predeterminado) · «Por aceptar» · «Sin asignar».
- Filtro de estado en un control segmentado: Pendientes · En curso · Cerradas.
- Búsqueda por número, título o ubicación (se conserva).
- Tarjeta de solicitud (`CaseCard`):
  - número y fecha relativa («hace 2 h»);
  - `StatusBadge` y `PriorityBadge`;
  - título en una línea, ubicación en otra;
  - «Recursos Humanos → Mantenimiento» y el técnico asignado, si lo hay;
  - sin repetir la descripción completa.
- Orden: prioridad alta primero dentro de «Pendientes»; más recientes primero en el
  resto.
- Estados vacíos distintos por filtro («No hay solicitudes por aceptar. ¡Todo al día!»).

### 4.2 Detalle

- Cabecera con número, título, `StatusBadge`, `PriorityBadge` y un indicador de pasos
  del flujo (Solicitado → Aceptado → Asignado → En ejecución → Reporte → Aprobado).
- Secciones plegables: Resumen (descripción, ubicación, tipo de servicio), Personas
  (solicitante, área solicitante, área destino, técnico asignado), Recursos utilizados,
  Historial (`Timeline`).
- **Barra de acción fija abajo** con la acción principal según
  `getAvailableCaseActions` (por ejemplo «Aceptar» para el jefe, «Iniciar trabajo» para
  el técnico). Las demás acciones (rechazar, pausar, cancelar, editar) en `ActionSheet`.
- Si el flujo está bloqueado por configuración (por ejemplo, el área destino no tiene
  técnicos), el administrador ve un aviso en el detalle.

### 4.3 Crear

- Paso único con secciones: «¿Qué necesitas?» (tipo de servicio agrupado por área
  técnica), «Detalles» (título, descripción, ubicación) y «Prioridad» (chips con una
  línea explicativa: Alta = detiene la operación).
- Botón fijo «Enviar solicitud». Al terminar, abrir el detalle con un aviso («Solicitud
  CAS-2026-00002 enviada»).

## 5. Administrar

Pantalla central con tarjetas y contadores:

- **Solicitudes de acceso** (contador de pendientes, destacado si > 0).
- **Usuarios** (contador de sin área).
- **Invitaciones** (pendientes).
- **Áreas**, **Tipos de servicio**, **Recursos**.
- **Empresa**: nombre y código de acceso.

### 5.1 Solicitudes de acceso (C-005)

- Lista de pendientes: nombre (o correo si no hay nombre), correo, fecha relativa.
- Al tocar una: hoja con «Aprobar» (selector de rol y área en el mismo paso, con las
  mismas validaciones que Usuarios) y «Rechazar» (motivo opcional de 3 a 300
  caracteres).
- Pestaña «Resueltas» con aprobadas y rechazadas recientes.

### 5.2 Empresa

- Nombre editable.
- Código de acceso grande y legible (`XXXX-XXXX`) con botones **Copiar** y
  **Compartir** (texto: «Únete a <empresa> en Nexo Casos con el código XXXX-XXXX») y
  **Regenerar** (con confirmación: «El código anterior dejará de funcionar»).

### 5.3 Usuarios

- Buscador y filtros: Todos · Sin área · por rol.
- Fila: avatar con iniciales, nombre, rol y área. «Usuario sin nombre» se muestra en
  cursiva con el correo si se conoce.
- Edición en una hoja: rol y área juntos. Al elegir «Técnico» solo se ofrecen áreas
  técnicas; «Jefe de área» exige área. Errores del servidor mostrados tal cual (C-001).

## 6. Sin empresa (C-002, C-005)

Pantalla de bienvenida con dos caminos:

1. **«Tengo un código de empresa»**: campo con formato `XXXX-XXXX` (acepta minúsculas y
   sin guion) → `request_organization_access`. Mensajes para `codigo_invalido` («El
   código no es válido. Pídelo al administrador de tu empresa.») y
   `demasiados_intentos` («Demasiados intentos. Vuelve a intentarlo en una hora.»).
2. **«Me enviaron una invitación»**: botón «Comprobar invitación»
   (`accept_pending_invitation`) y recordatorio de usar el mismo correo.

Si hay una solicitud (`get_my_access_request`): tarjeta de estado — Pendiente (con
«Cancelar solicitud»), Rechazada (motivo y opción de volver a solicitar). Botón «Cerrar
sesión» siempre visible. Al aprobarse, al reintentar o al volver a la app, se entra
directamente.

## 7. Perfil

- Nombre (editable), correo, empresa, rol y área (solo lectura), versión de la app y
  cerrar sesión.
- **Nombre obligatorio:** si `fullName` está vacío al iniciar sesión, mostrar una hoja
  «Completa tu nombre» antes de continuar (actualiza `profiles.full_name`). El registro
  también debe exigirlo.

## 8. Sistema visual (D-002)

Componentes en `src/components/` y tokens en `src/theme/tokens.ts`:

- **Tokens:** escala tipográfica (`display`, `title`, `subtitle`, `body`, `caption`,
  `overline`), pesos, espaciado de 4 en 4, radios, sombras (`elevation.sm/md`) y colores
  semánticos por estado y prioridad. Ningún color suelto en pantallas.
- **Componentes base:** `ScreenContainer` (safe area, fondo, padding), `AppHeader`,
  `Card`, `SectionHeader`, `ListItem`, `Avatar` (iniciales con color estable por
  persona), `Button` (primario, secundario, peligro, texto; estados de carga y
  deshabilitado), `SegmentedControl`, `Chip`, `StatTile`, `StatusBadge`,
  `PriorityBadge`, `StepIndicator`, `Timeline`, `ActionSheet`, `ConfirmDialog`,
  `EmptyState`, `ErrorState`, `SkeletonList` (reemplaza los spinners en listas),
  `Toast` para confirmaciones.
- **Formato:** fechas relativas en español («hace 5 min», «ayer»), números con
  separador de miles, montos con 2 decimales.
- **Íconos:** Ionicons, un solo estilo (outline) y tamaño consistente.
- **Accesibilidad:** áreas táctiles de 44×44, contraste AA, `accessibilityLabel` en
  contadores («3 solicitudes por aceptar»).
- Sin dependencias nuevas: todo con React Native, Reanimated (ya instalado) y
  componentes propios.

## 9. Tareas para Codex

En la rama `agent/codex/mvp-client` (o una nueva basada en ella):

- **D-002 · Sistema visual y componentes** (sección 8). Primero, porque el resto lo usa.
- **T-701 · Navegación e Inicio por rol** (secciones 2 y 3) con `get_home_summary`.
- **T-702 · Solicitudes** (sección 4): listado por rol, tarjeta, detalle con barra de
  acción y creación.
- **T-703 · Administrar** (sección 5): centro con contadores, solicitudes de acceso,
  empresa y código, usuarios con filtros.
- **T-704 · Sin empresa y perfil** (secciones 6 y 7).

Cada tarea con pruebas de sus servicios, hooks y lógica de presentación (por ejemplo,
qué tarjetas muestra el Inicio para cada rol). Revisa Claude.

## 10. Referencias del mercado y mejoras recomendadas

Revisión del 23/09/2026 de productos de gestión de mantenimiento (MaintainX, UpKeep,
Limble, Fracttal One). Lo que ya coincide con nuestro diseño: portal de solicitudes,
seguimiento del estado por el solicitante, asignación a técnicos, registro de recursos y
tiempos, historial y panel para supervisores.

### 10.1 Incluidas en este rediseño

- **Pocos toques y áreas táctiles grandes** para técnicos en campo (Limble): barra de
  acción fija y una acción principal por pantalla (secciones 1 y 4.2).
- **Cerrar el ciclo con el solicitante** (MaintainX): el solicitante ve en su Inicio el
  estado de cada solicitud y la línea de tiempo con cada paso.
- **Tiempos del flujo** (MaintainX, Limble): el panel usa las fechas que ya guarda la
  base (`accepted_at`, `started_at`, `closed_at`) para mostrar tiempos de respuesta en
  una siguiente iteración.

### 10.2 Propuestas para decidir (cambian reglas o alcance)

1. **Prioridad decidida por el área técnica** (MaintainX recomienda no dejar que el
   solicitante elija la prioridad porque todo termina siendo «urgente»): el solicitante
   indica el impacto («¿detiene la operación?», «¿hay riesgo de seguridad?») y el jefe
   técnico fija la prioridad al aceptar. Hoy el solicitante la elige.
2. **Fotos al crear la solicitud y en el trabajo** (MaintainX, UpKeep, Fracttal): antes
   y después del trabajo. Ya es la decisión pendiente 3; se recomienda incluirla en el
   MVP junto con Storage (fase 4).
3. **Notificaciones push** en cada cambio de estado para el siguiente responsable y el
   solicitante (MaintainX, Limble). Planificado en la fase 5; recomendado adelantarlo
   porque es lo que más percibe el usuario.
4. **Comentarios en la solicitud** entre solicitante y área técnica (UpKeep): hilo
   simple dentro del detalle.
5. **Listas de verificación por tipo de servicio** (UpKeep): pasos que el técnico marca
   y que alimentan el reporte de cierre (fase 4).
6. **Códigos QR por ubicación o equipo** para crear solicitudes con un escaneo
   (MaintainX, Limble). Requiere el registro de activos; posterior al MVP.
7. **Modo sin conexión** para técnicos (Limble). Complejo; posterior al MVP.

### Fuentes

- MaintainX, guía de portales de solicitudes:
  https://www.getmaintainx.com/blog/guide-to-managing-maintenance-work-requests
- MaintainX, portales de solicitud: https://help.getmaintainx.com/set-up-a-request-portal
- UpKeep, listas de verificación: https://upkeep.com/maintenance-checklists/
- Limble, apps móviles de órdenes de trabajo:
  https://limble.com/learn/maintenance-operations-best-mobile-work-order-management-software
- Fracttal One, portal de solicitudes:
  https://www.fracttal.com/es/blog/mejora-en-el-portal-de-solicitudes
