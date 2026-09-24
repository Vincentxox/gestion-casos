# Reglas de negocio — Nexo Casos

Versión 2 · 22 de septiembre de 2026 · Aprobada por el responsable del proyecto (Vincent).

Este documento define **qué debe hacer la aplicación**. La sección 10 describe el estado
actual del código para que la migración hacia estas reglas sea segura. Ningún agente cambia
una regla sin aprobación (ver `AGENTS.md`, sección 7).

## 1. Concepto del producto

> **Nexo Casos**: las áreas de una empresa solicitan mantenimiento, el área técnica lo
> atiende, registra los recursos que usó y entrega un reporte firmado y aprobado que queda
> como evidencia.

- Producto B2B que se ofrece directamente a empresas.
- El diferenciador es el **cierre con evidencia**: qué se hizo, con qué recursos, en cuánto
  tiempo, quién lo firmó y quién lo aprobó.
- El flujo es **lineal**: cada paso tiene un único rol responsable y la base de datos impide
  saltarse pasos.

## 2. Empresas (multiempresa)

- Una sola instalación sirve a varias empresas. Todas las tablas de negocio tienen
  `organization_id`.
- Un usuario pertenece a **una sola empresa**. Toda consulta y escritura queda limitada
  por RLS a la empresa del usuario autenticado. Ningún usuario ve datos de otra empresa.
- La empresa del usuario se obtiene siempre de `public.profiles`, que solo modifica el
  servidor. Nunca se toma de metadatos editables por el usuario ni de parámetros del
  cliente.
- Ingreso de usuarios: por **invitación**. El administrador de la empresa registra el
  correo y el rol inicial. Cuando esa persona se registra (correo o Google) con el mismo
  correo verificado, queda vinculada a la empresa. Un usuario registrado sin invitación
  queda **sin empresa** y no ve ningún dato hasta ser vinculado.
- Los datos existentes se migran a una empresa inicial.

### 2.1 Solicitudes de acceso con código de empresa

Aprobado por el responsable el 23/09/2026.

- Cada empresa tiene un código de acceso (`XXXX-XXXX`) que solo ven y regeneran sus
  administradores. Al regenerarlo, el anterior deja de funcionar.
- Una persona registrada sin empresa ingresa el código y crea una solicitud de acceso.
  Solo la ven los administradores de esa empresa; nunca se muestra a otras empresas.
- Una persona tiene como máximo una solicitud pendiente. Puede cancelarla y, si la
  rechazan, volver a solicitar.
- El administrador la aprueba eligiendo rol y área (mismas validaciones que Usuarios) o la
  rechaza con motivo opcional. Al aprobar, la persona entra de inmediato.
- Se exige correo confirmado. Tras 10 códigos inválidos en una hora se bloquean los
  intentos.
- Si la persona acepta una invitación, su solicitud pendiente se cancela.
- Toda persona debe tener nombre; la app lo pide si está vacío.

## 3. Áreas

- Cada área pertenece a una empresa y tiene un tipo:
  - **solicitante**: áreas que piden trabajos (Administración, Recursos Humanos, etc.).
  - **técnica**: áreas que atienden trabajos (Mantenimiento, Tecnología, etc.).
- El MVP funciona con **una área técnica activa por empresa**, pero el modelo admite
  varias. Un área técnica también puede crear solicitudes.
- Cada usuario tiene como máximo un área. Solo se asignan áreas activas de su empresa.
- Las áreas no se eliminan; se desactivan.

## 4. Roles

El rol vive en `public.profiles.role` y solo lo cambia un administrador mediante RPC.

- **administrador**: administrador de la empresa. Configura áreas, tipos de servicio,
  recursos, usuarios e invitaciones. Puede ver todo en su empresa. Puede aceptar, rechazar
  y asignar solicitudes en lugar del jefe del área técnica, pero solo cancela las que él
  mismo creó. Solo sustituye firmas en los casos de 5.3 y 7.
- **jefe_area**: responsable de su área.
  - En un área **técnica**: acepta o rechaza solicitudes, asigna técnicos, valida el
    reporte (firma de validación técnica) o lo devuelve.
  - En un área **solicitante**: da la conformidad final del reporte (firma de
    conformidad) o lo devuelve.
- **tecnico**: pertenece a un área técnica. Ejecuta el trabajo asignado, registra
  recursos, redacta y firma el reporte.
- **solicitante**: pertenece a cualquier área. Crea solicitudes y da seguimiento a las de
  su área. Es el rol por defecto de un usuario invitado.
- **auditor**: solo lectura de todo lo de su empresa, incluidos reportes e indicadores.

Equivalencias con el código actual: `visualizador` pasa a `solicitante`. El rol
«personal» del que se habló antes corresponde a `tecnico`.

## 5. Solicitud (caso)

### 5.1 Datos

- Número legible único por empresa (`CAS-<año>-<secuencia o código>`).
- Título, descripción, ubicación y prioridad (`alta`, `media`, `baja`).
- **Tipo de servicio** (`category_id`): obligatorio. Pertenece a un área técnica y define
  el área destino.
- **Área solicitante**: se toma del área del creador al momento de crear. No se edita.
- **Área destino**: el área técnica del tipo de servicio.
- Creador, técnico asignado y fechas de cada cambio de estado.
- Fotos del trabajo: ver sección 7.1.

### 5.2 Estados

- `solicitado`: creado, pendiente de revisión por el área técnica.
- `aceptado`: el jefe técnico lo aceptó.
- `rechazado` (final): el jefe técnico lo rechazó, con motivo obligatorio.
- `cancelado` (final): el solicitante lo retiró antes de ser aceptado.
- `asignado`: tiene técnico responsable.
- `en_ejecucion`: el técnico está trabajando.
- `en_espera`: pausado por falta de recursos, acceso o información. El motivo es
  obligatorio.
- `reporte_enviado`: el técnico firmó el reporte y espera validación técnica.
- `validado`: el jefe técnico firmó la validación y se espera la conformidad del área
  solicitante.
- `aprobado` (final): el jefe del área solicitante firmó la conformidad. El caso queda
  cerrado.

### 5.3 Transiciones permitidas

Cada transición se hace mediante una sola RPC en la base de datos. Cualquier transición
que no esté en esta lista se rechaza.

- `solicitado → aceptado`: jefe del área técnica destino o administrador.
- `solicitado → rechazado`: jefe del área técnica destino o administrador. Motivo
  obligatorio.
- `solicitado → cancelado`: el creador o el jefe del área solicitante. El administrador
  no cancela solicitudes ajenas: cancelar es retirar la solicitud y le corresponde a quien
  la pidió (decisión del responsable, 24/09/2026).
- `aceptado → asignado`: jefe técnico o administrador, que elige un técnico del área
  destino.
- `asignado → asignado` (reasignación): jefe técnico o administrador. Queda en el
  historial.
- `asignado → en_ejecucion`: técnico asignado.
- `en_ejecucion → en_espera` y `en_espera → en_ejecucion`: técnico asignado o jefe
  técnico. Motivo obligatorio al pausar.
- `en_ejecucion → reporte_enviado`: técnico asignado, al firmar el reporte.
- `reporte_enviado → validado`: jefe técnico, al firmar la validación. Si ningún jefe del
  área técnica distinto de quien ejecutó el trabajo puede validar (por ejemplo, el único
  jefe ejecutó), valida un administrador y queda registrado.
- `reporte_enviado → en_ejecucion` (devuelto): jefe técnico. Observaciones obligatorias.
- `validado → aprobado`: jefe del área solicitante, al firmar la conformidad.
- `validado → en_ejecucion` (devuelto): jefe del área solicitante. Observaciones
  obligatorias.

Reglas comunes:

- Toda transición registra en el historial: estado anterior y nuevo, usuario, rol,
  comentario y fecha del servidor.
- El administrador **no** puede forzar transiciones que requieren firma. Solo firma como
  suplente en dos casos, que quedan registrados: la validación técnica cuando el único
  jefe técnico ejecutó el trabajo y la conformidad cuando el área solicitante no tiene
  jefe.
- Si el área solicitante no tiene jefe asignado, la conformidad la da el administrador.
  Esta excepción queda registrada.

### 5.4 Visibilidad

- Solicitante: casos de su área.
- Técnico: casos de su área técnica, sin importar a quién estén asignados.
- Jefe de área: casos donde su área es la solicitante o la destino.
- Administrador y auditor: todos los casos de su empresa.
- Todos pueden ver los nombres del creador, el técnico y los firmantes de los casos que
  pueden leer, mediante una vista o RPC que expone solo `id`, nombre y área.

### 5.5 Precisiones de implementación

Precisadas al implementar la base de datos y confirmadas por el responsable el
22/09/2026:

1. El **administrador** puede suplir **siempre** al jefe del área técnica en aceptar,
   rechazar y asignar, y al jefe del área solicitante en cancelar. La acción queda en el
   historial con su rol. Nunca puede firmar.
2. Se puede asignar a un **técnico o a un jefe** del área destino.
3. La **reasignación** solo se permite mientras la solicitud está en `asignado`. Para
   reasignar un trabajo en ejecución habría que ampliar la regla.
4. **Edición de datos**: el creador edita título, descripción, ubicación, prioridad y
   tipo de servicio solo mientras la solicitud está en `solicitado`. El jefe del área
   destino y el administrador pueden editarlos mientras no esté cerrada. El tipo de
   servicio solo cambia en `solicitado`.
5. El **auditor** no crea solicitudes. Para crear una solicitud, el usuario necesita un
   área asignada.
6. **Visibilidad**: además de lo indicado en 5.4, cada persona ve siempre las solicitudes
   que creó. Los perfiles (nombre, rol y área) son visibles para todos los miembros de la
   misma empresa, sin necesidad de una vista aparte.
7. **Numeración**: `CAS-<año>-<secuencia de 5 dígitos>`, consecutiva por empresa y año.
8. **Invitaciones**:
   - un correo puede tener una invitación pendiente por empresa;
   - si varias empresas lo invitan, se acepta la más antigua;
   - no se revela si el correo ya pertenece a otra empresa.
9. **Alta de empresas**: la hace el operador de la plataforma con
   `private.create_organization(nombre, correo_del_administrador)` desde el SQL editor.

## 6. Recursos

### 6.1 Catálogo

Lo administra el administrador. Cada recurso pertenece a la empresa y tiene:

- Tipo: `material` (consumible), `herramienta` o `equipo` (se usan, no se consumen).
- Nombre, unidad de medida (para materiales), costo unitario opcional y estado activo.

Fuera del alcance del MVP: control de inventario y existencias.

### 6.2 Registro de uso

- Lo registran el técnico asignado o el jefe técnico mientras el caso está en
  `en_ejecucion` o `en_espera`.
- Materiales: cantidad (> 0) y unidad. Herramientas y equipos: horas de uso opcionales.
- Mano de obra: técnico y horas trabajadas.
- Los registros se pueden corregir hasta que se firma el reporte. Después solo cambian si
  el reporte es devuelto.

## 7. Reporte de cierre

Decisiones del responsable del 23/09/2026 incorporadas en las secciones 7 a 9.

- Contenido: diagnóstico, trabajo realizado, causa, observaciones, fechas del caso
  (creación, aceptación, inicio y envío), recursos usados (tomados automáticamente del
  registro de uso) y fotos de antes y después.
- El técnico asignado o el jefe técnico lo redactan como borrador mientras el caso está
  en `en_ejecucion` o `en_espera`.
- **Antes de firmar, la app muestra el reporte completo para revisarlo.** Nada se firma
  a ciegas.
- **Requisitos para enviar** (se validan en la base de datos): diagnóstico y trabajo
  realizado con al menos 10 caracteres cada uno, y la cantidad mínima de fotos de
  después que exija el tipo de servicio.
- Solo el técnico asignado envía el reporte, y lo hace al firmarlo.
- **Al firmar, el contenido se congela** en una versión inmutable con su hash. Si el
  reporte es devuelto, la versión queda marcada como devuelta con sus firmas, el caso
  vuelve a `en_ejecucion` y el siguiente envío crea una versión nueva.
- Solo existe una versión vigente por caso.

### 7.1 Fotos y almacenamiento

- Hasta **3 fotos de antes y 3 de después** por caso. Los documentos adjuntos quedan
  fuera del MVP.
- **Mínimo de fotos de después por tipo de servicio**: lo configura el administrador en
  cada tipo de servicio (de 0 a 3; por defecto 0).
- Las suben el técnico asignado o el jefe técnico. Las de antes, mientras el caso está
  en `asignado`, `en_ejecucion` o `en_espera`; las de después, en `en_ejecucion` o
  `en_espera`. Al firmar el reporte quedan congeladas.
- La app las comprime antes de subirlas: foto de 1600 px en su lado mayor y miniatura
  de 400 px, en JPEG. Al recomprimir se eliminan los metadatos (incluida la ubicación).
- Se guardan en un bucket **privado** con un límite de 2 MB por archivo y solo JPEG o
  WebP. El acceso se controla con RLS según la visibilidad del caso.
- Cada empresa tiene una cuota de almacenamiento (1 GB por defecto). El administrador
  ve el uso en su Inicio y recibe una alerta al pasar del 80 %. Al llegar al 100 % no se
  aceptan fotos nuevas.

## 8. Firma electrónica

Tipo en el MVP: **firma electrónica simple con evidencia**. La ley de Guatemala
(Decreto 47-2008) la considera adecuada para aprobaciones internas; su uso ante
terceros requiere firma avanzada con certificado, fuera del MVP.

Cada firma guarda:

- Usuario autenticado, rol y tipo de firma (`ejecucion`, `validacion_tecnica`,
  `conformidad`).
- Fecha y hora **del servidor**.
- Hash SHA-256 del contenido exacto de la versión firmada, calculado en el servidor, y
  un hash propio de la firma.
- **El trazo dibujado en pantalla como vector** (datos de trazado SVG, máximo 20 KB) en
  la misma fila de la firma, sin usar Storage.
- El texto de consentimiento que aceptó: «Confirmo que revisé este reporte y estoy de
  acuerdo con su contenido».
- La dirección IP y el dispositivo (agente de usuario), tomados por el servidor de la
  petición, no enviados por la app.

Reglas:

- Cada versión requiere, en orden, las firmas de ejecución (técnico asignado),
  validación técnica (jefe del área técnica; si el único jefe ejecutó el trabajo, el
  administrador) y conformidad (jefe del área solicitante; si esa área no tiene jefe, el
  administrador). Las suplencias quedan registradas.
- Una firma no se edita ni se borra.
- Una misma persona no puede firmar dos veces la misma versión.
- La confirmación con huella o rostro del teléfono queda para después del MVP.
- La validez legal de la firma debe revisarla un abogado antes de ofrecerla a clientes.

## 9. PDF, notificaciones e indicadores

- **PDF**: se genera una sola vez en el servidor (Edge Function), la primera vez que
  alguien lo pide después de aprobado el caso, y se guarda en Storage privado. Incrusta
  las miniaturas de las fotos (400 px) para quedar liviano (unos 300–600 KB); las
  originales siguen disponibles en la app. Incluye el reporte, los recursos, las tres firmas con su trazo y una
  **hoja de evidencia**: por firma, nombre, rol, fecha y hora, IP y dispositivo; el hash
  de la versión; la secuencia de eventos del caso y un código de verificación. Lo pueden
  descargar quienes pueden leer el caso, mediante un enlace firmado de pocos minutos.
  Mientras el caso está abierto, el reporte es una pantalla de la app, no un PDF.
- **Notificaciones** (adelantadas al MVP el 23/09/2026): cada acción del flujo crea un
  aviso para los responsables del siguiente paso, nunca para quien hizo la acción. Los
  avisos se ven en la app (campana del Inicio) y se envían como notificación push a los
  teléfonos registrados. Destinatarios: nueva solicitud → jefes del área técnica;
  reporte enviado → jefes del área técnica que no lo ejecutaron (si no hay, los
  administradores); aceptada, rechazada y aprobada → creador; asignada, reasignada y
  devuelta → técnico asignado; reporte validado → jefes del área solicitante (o
  administradores si no hay jefe); pausa → jefes del área técnica; cancelada → jefes del
  área técnica.
- **Indicador del reporte**: tiempo entre el envío del reporte y la aprobación final.
- **Tiempos por prioridad**: la empresa configura, por prioridad, el tiempo máximo para
  aceptar y para resolver. El caso muestra si está vencido.
- **Panel**: casos por estado, por área y por prioridad; tiempo promedio de aceptación y
  de resolución; casos vencidos y costo de recursos por área.

### 9.1 Inicio por rol

Aprobado por el responsable el 23/09/2026. Cada rol ve en su Inicio su trabajo pendiente
(ver `docs/UX_REDESIGN.md`, sección 3). El administrador recibe alertas de configuración:
áreas técnicas sin jefe o sin técnicos, usuarios sin área o sin nombre, solicitudes de
acceso pendientes y catálogos vacíos. Los conteos respetan la visibilidad de cada rol.

## 10. Estado del código antes del nuevo modelo

> Esta sección describe el punto de partida. El nuevo modelo de base de datos está en la
> rama `agent/claude/business-model-backend`; ver `docs/GAP_ANALYSIS.md`.

- Roles actuales: `administrador`, `auditor` y `visualizador`, globales y sin empresa.
- Estados actuales: `abierto`, `en_progreso` y `cerrado`, con cualquier transición
  permitida; solo el administrador los cambia.
- `cases.category` guarda el **nombre** de la categoría como texto; no hay `category_id`,
  área solicitante ni área destino.
- Todos los usuarios autenticados leen todos los casos. Solo el administrador lee otros
  perfiles, por eso el detalle no muestra nombres.
- Las áreas no tienen tipo y un perfil tiene como máximo una.
- No hay recursos, reportes, firmas, Storage, notificaciones ni indicadores.

Tratamiento de los datos existentes (confirmado por el responsable el 22/09/2026):

- Los 7 casos y su historial anteriores se descartan. Se conservan los 11 usuarios.
- Los perfiles sin área (9 al 22/09/2026) no se asignan en la migración: el
  administrador les asigna área y rol desde la app. Mientras tanto no pueden crear
  solicitudes.
- Usuarios, perfiles, áreas y tipos de servicio de áreas técnicas pasan a la empresa
  «Organización inicial». `visualizador` pasa a `solicitante`.
- Tecnología y Mantenimiento quedan como áreas técnicas; las demás, como solicitantes.
  Los 4 tipos de servicio de áreas solicitantes se eliminan.

## 11. Decisiones pendientes

1. Confirmar con un abogado la validez de la firma simple.
2. Definir los tiempos por prioridad por defecto de una empresa nueva.
3. Definir si el solicitante puede adjuntar fotos al crear la solicitud en el MVP o
   después (hoy solo las suben el técnico asignado y el jefe técnico).
4. Entornos: el proyecto de Supabase actual sirve como desarrollo y pruebas. Antes de la
   primera empresa cliente se creará un proyecto de producción separado (T-605). Queda
   por definir si el proyecto actual se conserva como entorno de desarrollo permanente.
5. Prioridad decidida por el área técnica en lugar del solicitante (ver
   `docs/UX_REDESIGN.md`, sección 10.2).
6. Comentarios en la solicitud (las notificaciones push se adelantaron al MVP el
   23/09/2026).
7. ~~Jefe técnico que ejecuta el trabajo.~~ Resuelta el 23/09/2026: valida el
   administrador, dejando constancia (5.3 y 8).
