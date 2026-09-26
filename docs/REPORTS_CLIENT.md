# Fotos y reporte de cierre en la app (T-906 y T-907)

Especificación del cliente para las tareas T-906 (fotos) y T-907 (reporte y firmas). El
backend ya está aplicado en remoto: contratos C-007 (fotos) y C-008 (reporte y firmas) de
`docs/AGENT_HANDOFF.md`, reglas en `docs/BUSINESS_RULES.md` secciones 7 a 9 (rama
`agent/claude/admin-cancel-rule`) y la función `generate-report-pdf` en
`docs/EDGE_FUNCTIONS.md`. Si algo de este documento contradice esos contratos, mandan los
contratos: avisa en el tablero.

Los avisos push (T-908) quedan para después.

## 1. Alcance y dependencias

- Dependencias aprobadas por Vincent el 23/09/2026: `expo-image-manipulator`,
  `react-native-svg` y `expo-image`. Instálalas con `npx expo install`. Son módulos nativos:
  hace falta una APK nueva para probarlas.
- Ya instaladas y reutilizables: `expo-image-picker`, `expo-camera`, `expo-file-system`,
  `expo-sqlite` (su `kv-store` sirve para la cola de subida), `expo-web-browser` y
  `@react-native-community/netinfo`.
- Módulos nuevos, con la estructura de `AGENTS.md` sección 5:
  - `src/features/photos/`: `photoService.ts`, `usePhotos.ts`, `uploadQueue.ts`, `types.ts`,
    `components/`, `__tests__/`;
  - `src/features/reports/`: `reportService.ts`, `useReports.ts`, `schemas.ts`, `types.ts`,
    `reportPermissions.ts`, `signaturePath.ts`, `screens/`, `components/`, `__tests__/`.
- Pantallas nuevas en `MainStackParamList`: `CaseReport` (borrador y fotos) y `ReportReview`
  (revisar, firmar, validar, aprobar o devolver). La firma y la devolución son hojas
  (modales) dentro de `ReportReview`.
- Fuera de alcance: avisos push, ver el PDF dentro de la app (se abre en el navegador),
  confirmación con huella o rostro y verificación pública del código.

## 2. Qué ve cada persona según el estado

La autorización real está en la base de datos; esto solo decide qué botones se muestran.
Los permisos del cliente viven en `reportPermissions.ts`, con pruebas.

| Estado            | Quién                              | En el detalle                                                                                    |
| ----------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------ |
| `asignado`        | técnico asignado o jefe técnico    | sección Reporte con «Fotos de antes» (puede agregar). Acción principal: «Iniciar trabajo»        |
| `en_ejecucion`    | técnico asignado                   | acción principal **«Completar reporte»** (abre `CaseReport`); «Pausar trabajo» pasa a secundaria |
| `en_ejecucion`    | jefe técnico que no es el asignado | «Ver borrador»: puede editar texto y fotos, pero no envía                                        |
| `en_espera`       | técnico asignado o jefe técnico    | puede editar texto y fotos; aviso «Reanuda el trabajo para enviar el reporte»                    |
| `reporte_enviado` | quien valida (ver abajo)           | acción principal **«Revisar y validar»**                                                         |
| `validado`        | quien aprueba (ver abajo)          | acción principal **«Revisar y aprobar»**                                                         |
| `aprobado`        | cualquiera que vea el caso         | **«Descargar PDF»** y «Ver reporte»                                                              |
| cualquiera        | los demás                          | la sección Reporte en solo lectura, con el estado                                                |

Quién valida y quién aprueba:

- **Valida:** un jefe del área técnica destino que no sea el técnico asignado. Si no existe
  ninguno, valida el administrador (suplente).
- **Aprueba:** el jefe del área solicitante. Si esa área no tiene jefe, aprueba el
  administrador (suplente).
- Para decidir la suplencia, el cliente consulta los perfiles `jefe_area` de la empresa
  (el administrador ya los lee en Usuarios) y aplica esa regla. Nunca se usa para
  autorizar: si el servidor rechaza, se muestra su mensaje.
- Quien ejecutó el trabajo nunca ve «Validar» ni «Devolver» en `reporte_enviado`.

## 3. Sección «Reporte» en el detalle

Tarjeta entre «Progreso» y «Datos de la solicitud», visible desde `asignado`:

- Chip de estado del reporte:
  - «Sin empezar» o «Borrador», en gris;
  - «Enviado», «Validado» o «Aprobado», con el color de su fase;
  - «Devuelto», en rojo.
- **Si la última versión fue devuelta:** un aviso arriba con quién la devolvió, cuándo y
  el motivo (`case_report_versions`, `status = 'devuelta'`, la más reciente).
- **Mientras es borrador:** una lista de requisitos para enviar, con su marca:
  - diagnóstico (10 caracteres o más);
  - trabajo realizado (10 caracteres o más);
  - fotos de después «n de m», donde m es el `min_after_photos` del tipo de servicio.
- **Desde que se envía:** las firmas registradas (nombre, rol y fecha) y el código de
  verificación, que son los primeros 12 caracteres de `content_hash` en grupos de 4
  («A1B2-C3D4-E5F6»), igual que en el PDF.
- Miniaturas de las fotos de antes y después, en solo lectura, que abren el visor.

## 4. Fotos (T-906)

### 4.1 Tomar y preparar

- Cada grupo («Antes» y «Después») tiene 3 espacios de 96 px.
  - Un espacio vacío muestra un borde punteado y el ícono de cámara «Agregar».
  - Al tocarlo se abre la hoja de acciones con «Tomar foto» (`launchCameraAsync`) y
    «Elegir de la galería» (`launchImageLibraryAsync`, una foto).
- Compresión con `expo-image-manipulator`:
  - foto de 1600 px en el lado mayor, JPEG con calidad 0,8;
  - miniatura de 400 px, JPEG con calidad 0,7.
  - Al recodificar se eliminan los metadatos, incluida la ubicación.
  - Si una foto supera 2 MB después de comprimir, se vuelve a comprimir con calidad 0,6
    antes de subirla.
- Permisos de cámara y galería con textos en español. Si se niegan, se explica cómo
  activarlos.

### 4.2 Subir (cola con reintentos)

Flujo por foto, como indica C-007:

1. `reserve_case_photo(caso, tipo)`.
2. Subir `full.jpg` y `thumb.jpg` a las rutas que devuelve la reserva (`upsert: false`,
   `contentType: 'image/jpeg'`).
3. `confirm_case_photo(id)`.

La cola vive en `uploadQueue.ts`:

- Cada foto pendiente se copia al directorio de documentos de la app
  (`expo-file-system`, carpeta `pending-photos/`). Sus datos (caso, tipo, id de reserva y
  paso alcanzado) se guardan en `expo-sqlite/kv-store`, para sobrevivir si se cierra la app.
- Estados visibles en el espacio de la foto:
  - «Subiendo…», con un indicador sobre la miniatura local;
  - «Error», en rojo, con «Reintentar»;
  - «Lista», cuando se confirma.
- Reintentos automáticos ante errores de red: hasta 3, con espera creciente (2, 8 y 30
  segundos), y otro intento al recuperar la conexión (`netinfo`). Después, solo manual.
- Si al subir o confirmar el servidor responde «La reserva de la foto venció; vuelve a
  subirla», se hace una reserva nueva y se reintenta con los mismos archivos locales.
- Si el archivo ya existe en Storage (reintento tras una respuesta perdida), se pasa
  directo a confirmar; `confirm_case_photo` es idempotente.
- Los errores de negocio no se reintentan: se muestran con el mensaje del servidor. Por
  ejemplo, «Solo se permiten 3 fotos de después» o «La empresa alcanzó su límite de
  almacenamiento».
- Al confirmar, se borran la copia local y la entrada de la cola, y se invalidan las fotos
  del caso.
- Si la persona sale de `CaseReport` con fotos pendientes, se avisa: «Hay fotos
  subiéndose. Se terminarán de subir en segundo plano mientras la app esté abierta.»

### 4.3 Ver y borrar

- Miniaturas con enlaces firmados de 5 minutos (`createSignedUrl(thumb_path, 300)`),
  mostradas con `expo-image` y `cacheKey = thumb_path`, para no volver a descargar al
  renovar el enlace.
- Al tocar una foto se abre un visor a pantalla completa con la imagen grande (enlace
  firmado de `image_path`), fondo oscuro, «Cerrar» y «Antes»/«Después» con su número
  («Después · 2 de 3»).
- Borrar, solo mientras el estado lo permita: botón «⋯» sobre la foto, «Eliminar foto» y
  confirmación en la propia app (no `Alert`). Primero `storage.remove([image_path,
thumb_path])` y después `delete_case_photo(id)`.

### 4.4 Mínimo por tipo de servicio (administrador)

- En el formulario de tipo de servicio, un selector «Fotos de después obligatorias» de 0 a
  3, que guarda `min_after_photos`.
- En la tarjeta del catálogo, el dato «Pide 2 fotos de después» cuando es mayor que 0.

## 5. Borrador del reporte (`CaseReport`, T-907)

- Título en la barra: «Reporte · CAS-2026-00002». Formulario con `KeyboardFormScrollView`:
  - «Diagnóstico» (obligatorio para enviar; hasta 2000 caracteres);
  - «Trabajo realizado» (obligatorio para enviar; hasta 4000);
  - «Causa» (opcional; hasta 1000);
  - «Observaciones» (opcional; hasta 2000).
  - Cada campo lleva un contador «123 / 2000».
- Esquemas Zod con los mismos límites que la base. El mínimo de 10 caracteres solo se exige
  al enviar; el borrador puede quedar incompleto.
- **Guardado automático:** 1,5 s después de dejar de escribir, al salir de un campo y al
  salir de la pantalla. La primera vez inserta la fila de `case_reports`; después la
  actualiza. Indicador discreto: «Guardado» o «Guardando…»; si falla, «No se guardó.
  Reintentar».
- Secciones «Fotos de antes» y «Fotos de después» (punto 4).
- «Recursos y mano de obra»: resumen («3 registros · 4,5 horas») y enlace a Recursos
  utilizados. No se editan aquí.
- **Barra fija abajo (solo el técnico asignado, en `en_ejecucion`):** «Revisar y firmar».
  Si faltan requisitos, el botón queda deshabilitado y encima se lista lo que falta
  («Falta 1 foto de después»).

## 6. Revisar y firmar (`ReportReview`)

Una sola pantalla para enviar, validar y aprobar. Muestra el contenido exacto que se firma:

- **Al enviar**, arma la vista previa con los mismos datos que congelará el servidor:
  - datos del caso y fechas;
  - los cuatro campos del reporte;
  - recursos (del registro de uso);
  - fotos de antes y después.
- **Al validar o aprobar**, muestra el `content` de la versión vigente
  (`case_report_versions.status = 'vigente'`), no el borrador. Debajo van las firmas que ya
  tiene (nombre, rol, fecha y hora) y, plegadas, las versiones devueltas anteriores con su
  motivo.
- **Aviso fijo arriba:**
  - al enviar: «Al firmar, este contenido queda congelado y no se podrá editar»;
  - al validar o aprobar: «Tu firma confirma que revisaste esta versión».

Barra fija abajo, según quién mira:

| Quién                             | Botones                                            |
| --------------------------------- | -------------------------------------------------- |
| técnico asignado (borrador listo) | «Firmar y enviar»                                  |
| quien valida                      | «Validar y firmar» (principal) y «Devolver» (rojo) |
| quien aprueba                     | «Aprobar y firmar» (principal) y «Devolver» (rojo) |

### 6.1 Hoja de firma

- Hoja modal de unos 70 % de alto:
  - título según el caso («Firma de ejecución», «Firma de validación técnica» o «Firma de
    conformidad»);
  - nombre y rol de quien firma;
  - lienzo blanco con borde y una línea guía;
  - «Borrar», «Cancelar» y «Firmar».
- Lienzo con `react-native-svg` y `PanResponder` de React Native (no se agrega
  `react-native-gesture-handler`). No se desliza la hoja mientras se dibuja.
- **Codificación del trazo** (`signaturePath.ts`, con pruebas). Cumple el contrato
  `signature_stroke` de C-008:
  - escala **uniforme**: `k = 1000 / max(ancho, alto)` del lienzo, para que la firma no se
    deforme en el PDF, que la dibuja con la misma escala en ambos ejes;
  - cada trazo es `M x y` seguido de `L x y`, con coordenadas enteras de 0 a 1000;
  - se descartan puntos a menos de 3 unidades del anterior;
  - si el resultado pasa de 20 000 caracteres, se simplifica más (umbral de 6 unidades) y,
    si aún no cabe, se pide «Tu firma es muy extensa. Bórrala y firma de nuevo».
  - Menos de 10 caracteres cuenta como firma vacía: «Dibuja tu firma antes de continuar».
- **Consentimiento obligatorio:** casilla con el texto exacto del servidor, «Confirmo que
  revisé este reporte y estoy de acuerdo con su contenido.» Sin marcarla, «Firmar» queda
  deshabilitado. Se envía `accepts_terms: true`.
- Debajo del lienzo: «La fecha, la hora y el dispositivo los registra el servidor.»
- «Firmar» llama a `submit_case_report`, `validate_case_report` o `approve_case_report`,
  según el caso. Al terminar:
  - mensaje breve de confirmación («Reporte enviado», «Reporte validado» o «Solicitud
    aprobada y cerrada») y regreso al detalle;
  - se invalidan el caso, el historial, el reporte, las versiones, las firmas, las fotos,
    la lista de solicitudes y el resumen de Inicio.
- Errores: se muestra el mensaje del servidor sin cerrar la hoja, para no perder la firma
  dibujada.

### 6.2 Devolver

- Hoja con «Motivo de la devolución», de 3 a 500 caracteres, con contador y ejemplo («Falta
  la foto del tablero reparado»).
- Botón «Devolver al técnico» (al validar) o «Devolver» (al aprobar), en rojo; llama a
  `return_case_report`.
- Al terminar: «Reporte devuelto», regreso al detalle y las mismas invalidaciones.

## 7. PDF (caso aprobado)

- «Descargar PDF» llama a `supabase.functions.invoke('generate-report-pdf', { body: {
caseId } })` con la sesión del usuario.
  - Mientras espera, el botón muestra «Generando PDF…»; la primera vez puede tardar unos
    segundos.
  - Con la respuesta `{ url }`, abre el enlace con `WebBrowser.openBrowserAsync(url)`. El
    enlace dura 5 minutos: se pide uno nuevo en cada toque, sin guardarlo.
- Errores:
  - 409: «El PDF se genera cuando la solicitud está aprobada»;
  - 404: «Solicitud no encontrada»;
  - cualquier otro: «No fue posible generar el reporte. Inténtalo de nuevo.»

## 8. Diseño

Sigue D-003 hasta V6 (`docs/VISUAL_SYSTEM.md`):

- `Card`, `Chip`, `Button`, `SkeletonList`, `RequestState` y `EmptyState`, con los colores
  de `tokens.ts`;
- el azul solo en lo que se toca;
- zonas táctiles de 44 px y etiquetas accesibles en fotos, espacios vacíos y botones de
  ícono;
- el lienzo de firma lleva `accessibilityLabel="Área para dibujar tu firma"`;
- acciones de la barra fija como en V6: la principal a todo el ancho y las secundarias en
  fila.

## 9. Pruebas y criterios de aceptación

Pruebas unitarias:

- `signaturePath`: escala uniforme, límites de 0 a 1000, descarte de puntos,
  simplificación al pasar de 20 000 caracteres y firma vacía.
- `reportPermissions`: qué ve cada rol en cada estado, incluidas la suplencia del
  administrador (sin jefe técnico distinto del ejecutor, y área solicitante sin jefe) y la
  exclusión del ejecutor.
- Cola de subida (con el servicio simulado): éxito, error de red con reintentos, reserva
  vencida con reserva nueva, archivo ya subido que pasa a confirmar, y error de negocio sin
  reintento.
- Esquemas del borrador y de la devolución con los límites de la base, y requisitos para
  enviar («n de m» fotos de después).
- `npm run verify` en verde y cobertura global de 80 % o más.

Prueba integrada en Android con la APK nueva, contra el proyecto de pruebas:

1. El técnico sube fotos de antes en `asignado`, inicia el trabajo, sube fotos de después
   (incluida una sin conexión que se sube al volver la señal), completa el borrador, lo
   revisa y lo firma.
2. El jefe técnico lo devuelve con un motivo; el técnico ve el aviso, corrige y reenvía
   (versión 2).
3. El jefe técnico valida y el jefe del área solicitante aprueba.
4. En un caso donde el único jefe técnico ejecutó el trabajo, valida el administrador.
5. «Descargar PDF» abre el PDF, con las tres firmas, las miniaturas y la hoja de evidencia.
6. Un tipo de servicio con 2 fotos de después obligatorias impide enviar con 1.
7. Capturas de cada pantalla nueva en 360 dp.
