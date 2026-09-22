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
  recursos, usuarios e invitaciones. Puede ver todo en su empresa. No sustituye las firmas
  de otros roles.
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
- Fotos iniciales opcionales (privadas, en Storage).

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

- `solicitado → aceptado`: jefe del área técnica destino.
- `solicitado → rechazado`: jefe del área técnica destino. Motivo obligatorio.
- `solicitado → cancelado`: el creador o el jefe del área solicitante.
- `aceptado → asignado`: jefe técnico, que elige un técnico de su área.
- `asignado → asignado` (reasignación): jefe técnico. Queda en el historial.
- `asignado → en_ejecucion`: técnico asignado.
- `en_ejecucion → en_espera` y `en_espera → en_ejecucion`: técnico asignado o jefe
  técnico. Motivo obligatorio al pausar.
- `en_ejecucion → reporte_enviado`: técnico asignado, al firmar el reporte.
- `reporte_enviado → validado`: jefe técnico, al firmar la validación.
- `reporte_enviado → en_ejecucion` (devuelto): jefe técnico. Observaciones obligatorias.
- `validado → aprobado`: jefe del área solicitante, al firmar la conformidad.
- `validado → en_ejecucion` (devuelto): jefe del área solicitante. Observaciones
  obligatorias.

Reglas comunes:

- Toda transición registra en el historial: estado anterior y nuevo, usuario, rol,
  comentario y fecha del servidor.
- El administrador **no** puede forzar transiciones que requieren firma.
- Si el área solicitante no tiene jefe asignado, la conformidad la da el administrador.
  Esta excepción queda registrada.

### 5.4 Visibilidad

- Solicitante: casos de su área.
- Técnico: casos de su área técnica, sin importar a quién estén asignados.
- Jefe de área: casos donde su área es la solicitante o la destino.
- Administrador y auditor: todos los casos de su empresa.
- Todos pueden ver los nombres del creador, el técnico y los firmantes de los casos que
  pueden leer, mediante una vista o RPC que expone solo `id`, nombre y área.

### 5.5 Precisiones de implementación (pendientes de confirmar)

La implementación de la base de datos (rama `agent/claude/business-model-backend`)
precisó estas reglas. El responsable debe confirmarlas o corregirlas:

1. El **administrador** puede suplir al jefe del área técnica en aceptar, rechazar y
   asignar, y al jefe del área solicitante en cancelar. No puede firmar.
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

- Contenido: diagnóstico, trabajo realizado, causa, fecha y hora de inicio y fin,
  recursos usados (tomados automáticamente del registro de uso), fotos de antes y después,
  y observaciones.
- El técnico lo redacta como borrador y lo envía al firmar.
- **Al firmar, el contenido se congela** en una versión inmutable. Si el reporte es
  devuelto, se crea una versión nueva y la anterior se conserva con sus firmas.
- Solo existe una versión vigente por caso.

## 8. Firma electrónica

Tipo en el MVP: **firma electrónica simple con evidencia**. Cada firma guarda:

- Usuario autenticado, rol y tipo de firma (`ejecucion`, `validacion_tecnica`,
  `conformidad`).
- Fecha y hora **del servidor**.
- Hash SHA-256 del contenido exacto de la versión firmada, calculado en el servidor.
- Imagen del trazo dibujado en pantalla (opcional, en Storage privado).

Reglas:

- Cada versión requiere, en orden, las firmas de ejecución, validación técnica y
  conformidad.
- Una firma no se edita ni se borra.
- Una misma persona no puede firmar dos veces la misma versión con roles distintos.
- La validez legal de la firma debe revisarla un abogado antes de ofrecerla a clientes.
  En Guatemala aplica el Decreto 47-2008. La firma avanzada con certificado queda fuera
  del MVP.

## 9. PDF, notificaciones e indicadores

- **PDF**: se genera en el servidor (Edge Function) al aprobar el caso y se guarda en
  Storage privado. Incluye el código de verificación (hash) y las tres firmas. Lo pueden
  descargar quienes pueden leer el caso.
- **Notificaciones**: se notifica a los responsables del siguiente paso en cada
  transición.
- **Tiempos por prioridad**: la empresa configura, por prioridad, el tiempo máximo para
  aceptar y para resolver. El caso muestra si está vencido.
- **Panel**: casos por estado, por área y por prioridad; tiempo promedio de aceptación y
  de resolución; casos vencidos y costo de recursos por área.

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

Tratamiento de los datos existentes (aprobado por el responsable el 22/09/2026):

- Los casos y su historial anteriores se descartan.
- Usuarios, perfiles, áreas y tipos de servicio de áreas técnicas pasan a la empresa
  «Organización inicial». `visualizador` pasa a `solicitante`.
- Tecnología y Mantenimiento quedan como áreas técnicas; las demás, como solicitantes.
  Los tipos de servicio de áreas solicitantes se eliminan.

## 11. Decisiones pendientes

1. Confirmar con un abogado la validez de la firma simple.
2. Definir los tiempos por prioridad por defecto de una empresa nueva.
3. Definir si el solicitante puede adjuntar fotos al crear la solicitud en el MVP o
   después.
4. Entornos: el proyecto de Supabase actual sirve como desarrollo y pruebas. Antes de la
   primera empresa cliente se creará un proyecto de producción separado (T-605). Queda
   por definir si el proyecto actual se conserva como entorno de desarrollo permanente.
