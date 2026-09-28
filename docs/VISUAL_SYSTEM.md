# Sistema visual y rediseño D-003 — Nexo Casos

Especificación para implementar en el cliente (Codex implementa y Claude revisa). Recoge la
maqueta «Nexo Casos – propuesta visual», aprobada por el responsable el 23/09/2026. Este
documento es autosuficiente: no hace falta abrir la maqueta.

## 0. Problemas que resuelve

Comentarios de usuarios: la app no es atractiva, y los estados y el historial no se distinguen
porque todo es azul y minimalista. La auditoría del código del 23/09/2026 encontró:

- Dos paletas de estado que no coinciden (`statusColors` en `tokens.ts` y `palette` en
  `StatusBadge.tsx`). «Solicitado», «Aceptado», «Asignado» y «En ejecución» son azules o
  morados, iguales al color de la marca.
- En el contenido solo hay unos 20 íconos (cerrar, editar, agregar). No hay íconos para
  estados, prioridad, historial ni pantallas vacías.
- `Card`, `Button`, `Chip`, `Avatar` y `ScreenContainer` existen, pero ninguna pantalla los usa.
  En cambio, 15 pantallas definen su propia tarjeta. Hay 18 tamaños de letra distintos (de 9 a 34)
  y más de 8 radios de esquina.
- `Button` y `PrimaryButton` hacen lo mismo. El historial es una lista de puntos azules iguales.

No cambian ni la navegación, ni los flujos, ni el backend, ni las reglas de negocio.

## 1. Decisiones del responsable

- Tipografía: **Plus Jakarta Sans**. Dependencia nueva aprobada:
  `@expo-google-fonts/plus-jakarta-sans`. `expo-font` ya está instalada.
- Vibración al confirmar acciones: **sí**, con `expo-haptics`. Dependencia nueva aprobada.
- Instala ambas con `npx expo install`. No modifiques `app.json`: carga la fuente en tiempo de
  ejecución (sección 3.3).
- Íconos: solo **Ionicons** (`@expo/vector-icons`, ya instalada). Animaciones con
  `react-native-reanimated` (ya instalada).

## 2. Principios

1. **El color identifica la fase, el ícono identifica el estado y el texto lo confirma.** Nunca se
   usa solo el color (accesibilidad para daltonismo; patrón «status indicator» de Carbon).
2. **El azul de la marca (`#075EAD`) solo se usa en acciones y navegación:** botones principales,
   pestaña activa, enlaces y la tarjeta destacada del Inicio. Nunca indica un estado.
3. **Estado relleno y prioridad con contorno.** Así la etiqueta de estado y la de prioridad se
   distinguen por la forma, no solo por el color.
4. **Una escala para cada cosa:** 6 tamaños de letra, 5 radios, 3 tamaños de ícono y 2 niveles de
   sombra. Nada suelto en las pantallas.
5. **Movimiento breve y con propósito:** confirma una acción o muestra un cambio. Respeta la opción
   «reducir movimiento» del sistema.

## 3. Fundamentos (tokens y componentes base)

### 3.1 `src/theme/tokens.ts`

Mantén `colors`, `spacing` y `elevation`. Elimina `statusColors` y `priorityColors` y reemplázalos
por lo siguiente.

```ts
export const phaseColors = {
  nueva: { fg: '#C2410C', bg: '#FFEDD5' }, // naranja
  curso: { fg: '#0369A1', bg: '#E0F2FE' }, // azul cielo, distinto del azul de marca
  detenida: { fg: '#854D0E', bg: '#FEF3C7' }, // amarillo
  revision: { fg: '#7E22CE', bg: '#F3E8FF' }, // morado
  cerrada: { fg: '#15803D', bg: '#DCFCE7' }, // verde
  rechazada: { fg: '#B91C1C', bg: '#FEE2E2' }, // rojo
  cancelada: { fg: '#475569', bg: '#F1F5F9' }, // gris
} as const

export const radius = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 } as const
// sm: campos · md: botones y cuadros de ícono · lg: tarjetas · xl: hojas y modales · pill: chips, etiquetas, avatares
// Esquina anidada: interior = exterior − padding (tarjeta 16 con padding 12 → hijo pegado al borde de 4).

export const iconSize = { inline: 16, base: 22, hero: 44 } as const
```

Tipografía: 6 estilos y nada más. Cada peso es una familia distinta, porque en Android una fuente
personalizada no aplica `fontWeight`.

```ts
export const fonts = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
} as const

export const typography = {
  display: { fontFamily: fonts.extrabold, fontSize: 28, lineHeight: 34 }, // título de pantalla
  title: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 26 }, // saludo, título de detalle (22 permitido solo ahí)
  heading: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 22 }, // encabezado de sección y de tarjeta
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 }, // texto (usa semibold/bold para títulos de tarjeta)
  caption: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 }, // metadatos
  overline: {
    fontFamily: fonts.bold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
} as const
```

Números grandes del Inicio: `fontFamily: fonts.extrabold` con `fontSize: 28` (estilo `display`).
Elimina `title` (28), `section`, `eyebrow` y `subtitle` si quedan sin uso tras la migración.

### 3.2 `src/theme/statusMeta.ts` (nuevo, fuente única de estados)

```ts
import type { ComponentProps } from 'react'
import type { Ionicons } from '@expo/vector-icons'
type IconName = ComponentProps<typeof Ionicons>['name']

export const statusMeta: Record<
  CaseStatus,
  { label: string; phase: keyof typeof phaseColors; icon: IconName }
> = {
  solicitado: { label: 'Solicitada', phase: 'nueva', icon: 'file-tray-outline' },
  aceptado: { label: 'Aceptada', phase: 'curso', icon: 'checkmark-circle-outline' },
  asignado: { label: 'Asignada', phase: 'curso', icon: 'person-add-outline' },
  en_ejecucion: { label: 'En ejecución', phase: 'curso', icon: 'construct-outline' },
  en_espera: { label: 'En espera', phase: 'detenida', icon: 'pause-circle-outline' },
  reporte_enviado: { label: 'Reporte enviado', phase: 'revision', icon: 'document-text-outline' },
  validado: { label: 'Validada', phase: 'revision', icon: 'shield-checkmark-outline' },
  aprobado: { label: 'Aprobada', phase: 'cerrada', icon: 'checkmark-done-outline' },
  rechazado: { label: 'Rechazada', phase: 'rechazada', icon: 'close-circle-outline' },
  cancelado: { label: 'Cancelada', phase: 'cancelada', icon: 'remove-circle-outline' },
}

export const priorityMeta = {
  alta: { label: 'Alta', color: '#B91C1C' },
  media: { label: 'Media', color: '#B45309' },
  baja: { label: 'Baja', color: '#64748B' },
} as const

// Historial: una frase y un ícono por acción de case_events (acción → [verbo, fase, ícono]).
export const actionMeta = {
  crear: { verb: 'creó la solicitud', phase: 'nueva', icon: 'file-tray-outline' },
  aceptar: { verb: 'aceptó la solicitud', phase: 'curso', icon: 'checkmark-circle-outline' },
  rechazar: { verb: 'rechazó la solicitud', phase: 'rechazada', icon: 'close-circle-outline' },
  cancelar: { verb: 'canceló la solicitud', phase: 'cancelada', icon: 'remove-circle-outline' },
  asignar: { verb: 'asignó la solicitud', phase: 'curso', icon: 'person-add-outline' },
  reasignar: { verb: 'reasignó la solicitud', phase: 'curso', icon: 'swap-horizontal-outline' },
  iniciar: { verb: 'inició el trabajo', phase: 'curso', icon: 'construct-outline' },
  pausar: { verb: 'pausó el trabajo', phase: 'detenida', icon: 'pause-circle-outline' },
  reanudar: { verb: 'reanudó el trabajo', phase: 'curso', icon: 'play-circle-outline' },
} as const
// Acción desconocida: se usa la fase del estado nuevo y el verbo «cambió el estado a <estado>».
```

`getStatusLabel` de `caseService` pasa a leer `statusMeta`, así las etiquetas existen en un solo
lugar. Agrega una prueba que verifique que `statusMeta` cubre todos los `CaseStatus` y que
`actionMeta` cubre todos los valores de `case_action` más `crear`.

### 3.3 Fuente y vibración

- Carga las fuentes en `App.tsx` con `useFonts` de `@expo-google-fonts/plus-jakarta-sans` (los 5
  pesos). Mientras cargan, se muestra la pantalla de marca (`BrandIntroScreen`) y nunca una pantalla
  en blanco.
- Si la carga falla, se sigue con la fuente del sistema: `typography` debe funcionar aunque la
  familia no exista.
- Crea `src/services/feedback.ts`, con cada llamada envuelta en `try/catch` y sin bloquear nada:
  - `success()`: `Haptics.notificationAsync(NotificationFeedbackType.Success)`. Se usa tras aceptar,
    asignar, iniciar, reanudar, aprobar acceso y crear solicitud o invitación.
  - `warning()`: tipo `Warning`. Se usa tras rechazar, cancelar y pausar.
  - `selection()`: `Haptics.selectionAsync()`. Se usa al cambiar de pestaña segmentada o de chip de
    filtro.
- La vibración se dispara en `onSuccess` de las mutaciones, nunca al tocar el botón. Así solo vibra
  si la acción ocurrió de verdad.

### 3.4 Componentes base (`src/components/`)

| Componente             | Qué hace                                                                                                                                                                                                                                                                                 |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ui/Icon`              | Envoltorio de Ionicons con `name`, `size` (`inline`, `base` o `hero`), `color` y `label?`. Sin `label`, el ícono es decorativo y se oculta a la accesibilidad.                                                                                                                           |
| `ui/IconTile`          | Cuadro de radio `md` con fondo `phase.bg` e ícono `phase.fg`, en tamaños de 36 y 44 px. Va al inicio de las tarjetas de solicitud, de los números del Inicio y de las filas de datos (en estas, con gris neutro `#F1F5F9` / `#475569`).                                                  |
| `badges/StatusBadge`   | Píldora rellena con `phase.bg`/`phase.fg`, ícono de 14 px y etiqueta de 12 px en negrita. Tamaño `sm` en listas y `md` (ícono de 16 y texto de 13) en el detalle. `accessibilityLabel="Estado: <etiqueta>"`.                                                                             |
| `badges/PriorityBadge` | Píldora con contorno de 1,5 px en `priorityMeta.color`, ícono `flag-outline` de 12 px y texto de 12 px en semibold.                                                                                                                                                                      |
| `ui/Button`            | **Único botón.** Variantes `primary`, `secondary`, `text` y `danger` (fondo `#FEE2E2`, texto `#B91C1C`), con `icon?` a la izquierda. Radio `md`, alto mínimo de 48 y estados de carga y deshabilitado. Migra los 17 usos de `PrimaryButton` y **elimina `PrimaryButton`**.               |
| `ui/Card`              | Fondo blanco, borde `#E4E9F0`, radio `lg`, padding 14 y `elevation.sm`. Con `onPress`, se hunde a escala 0,98 al tocarla (Reanimated).                                                                                                                                                   |
| `ui/Chip`              | Filtro de alto mínimo 36 (zona táctil de 44 con `hitSlop`). Seleccionado: fondo de la marca y texto blanco. Sin seleccionar: blanco con borde `#D7DEE8`.                                                                                                                                 |
| `ui/SegmentedControl`  | Nuevo. Fondo `#EDF0F4` con radio `md` y padding 4. El segmento activo es blanco, con sombra leve y texto en negrita; admite contador («Por atender · 4»). Usa `accessibilityRole="tab"`.                                                                                                 |
| `ui/Avatar`            | Iniciales en círculo. Tamaños de 28 (en listas) y 44 (en el encabezado).                                                                                                                                                                                                                 |
| `feedback/EmptyState`  | Nuevo. Círculo de 72 px con ícono `hero`, título (`heading`), una línea (`caption`) y **un solo** `Button`. Tres variantes: `firstUse` (ícono en la tarjeta azul de la marca), `noResults` (gris, con «Quitar filtros») y `allDone` (verde, `sparkles-outline`). Integra `RequestState`. |
| `ui/SkeletonList`      | Mantener; aplicarle un pulso de opacidad suave con Reanimated.                                                                                                                                                                                                                           |

## 4. Pantallas

### 4.1 Tarjeta de solicitud (`features/cases/components/CaseCard.tsx`)

- Fila: `IconTile` de 44 px con la fase del estado y su ícono, y a la derecha una columna con:
  - «CAS-2026-00007» (caption semibold) y, alineado a la derecha, el tiempo relativo
    (`formatRelativeDate`, ya existe);
  - el título en 15 bold, con máximo 2 líneas;
  - `location-outline` de 14 px con «Ubicación · Área solicitante» (caption);
  - una fila con `StatusBadge sm`, `PriorityBadge`, un espacio flexible y, a la derecha, el
    `Avatar` de 28 px del técnico o «Sin asignar» (caption `#8993A4`).
- Toda la tarjeta es un `Pressable` que abre el detalle, con
  `accessibilityLabel="<número>, <título>, <estado>, prioridad <prioridad>"`.

### 4.2 Lista de solicitudes

- Encabezado blanco con el título `display` «Solicitudes» y el botón de búsqueda (ícono de 44 px).
- `SegmentedControl` con las pestañas que ya existen por rol, cada una con su contador.
- Fila de `Chip` con desplazamiento horizontal para los filtros existentes.
- Lista agrupada por día («Hoy», «Ayer», fecha) con encabezados `overline`.
- Botón flotante «Nueva solicitud»: píldora de la marca de 52 px con ícono `add`, a 16 px del borde
  y por encima de la barra de pestañas. Solo aparece para quien puede crear solicitudes.
- Si la lista está vacía, se usa `EmptyState`: `noResults` cuando hay filtros aplicados y
  `firstUse` o `allDone` según el rol.

### 4.3 Detalle de la solicitud

1. **Encabezado:** `StatusBadge md` junto a `PriorityBadge` con el texto «Prioridad media»; debajo,
   el título en 22 extrabold y la línea «Solicitada por <nombre> · <área> · <fecha>».
2. **Progreso** (reescribe `StepIndicator` como `ProgressTracker`), dentro de una tarjeta
   «Progreso · Paso N de 6»:
   - 6 nodos de 32 px unidos por una línea de 3 px;
   - completados: verde `#15803D` con `checkmark` blanco; la línea hasta el paso actual también es
     verde;
   - actual: fondo y borde de su fase, su ícono (en `en_espera`, el nodo 4 lleva el ícono de pausa
     en amarillo) y un anillo de 4 px de su color al 15 %;
   - pendientes: blancos, con borde `#D7DEE8` y número gris;
   - `rechazado` y `cancelado` no muestran la barra, sino un aviso de su fase con el motivo si lo
     hay.
3. **Datos:** tarjeta con filas `IconTile` de 36 px en gris y una etiqueta caption sobre el valor
   en 15 semibold:
   - Área solicitante (`business-outline`);
   - Tipo de servicio (`pricetag-outline`);
   - Ubicación (`location-outline`);
   - Técnico asignado (`person-outline`);
   - Tiempo de trabajo (`time-outline`), solo si ya se inició.
4. **Descripción:** tarjeta con el texto en `body`.
5. **Recursos usados:** tarjeta con la acción «Agregar» (`add`) si el rol puede registrarlos; cada
   fila lleva `cube-outline`, el nombre y la cantidad con su unidad.
6. **Historial** (reescribe `Timeline`), agrupado por día:
   - cada evento lleva un círculo de 32 px con la fase y el ícono de `actionMeta`, y una línea
     vertical de 2 px que lo une con el siguiente (el último no la tiene);
   - la frase es «**<actor>** <verbo>», más «a <técnico>» cuando es una asignación;
   - debajo va la hora («10:42 · hace 20 min»), y el comentario, si lo hay, en una burbuja gris con
     `chatbox-outline`;
   - opcional: mezclar en el cliente los registros de `case_resource_usages` como eventos «registró
     N recursos» (`cube-outline`, gris), sin tocar el backend.
7. **Barra de acciones fija abajo:**
   - las acciones permitidas por `casePermissions`: la principal con `Button primary` y las demás
     con `secondary`; rechazar y cancelar con `danger`;
   - con más de 2 acciones, las otras pasan a «Más acciones» (`ActionSheet`, que ya existe);
   - al confirmar se llama `feedback.success()` o `warning()` y la etiqueta cambia con una
     transición de Reanimated.

### 4.4 Inicio por rol

- **Encabezado:** `Avatar` de 44 px, el rol y el área en caption, y «Buenos días / Buenas tardes /
  Buenas noches, <nombre>» en estilo `title`. Si hay pendientes, se muestra un punto naranja sobre
  la campana (hoy sin pantalla de notificaciones, así que el punto lleva a la lista filtrada).
- **Tarjeta destacada** en el azul de la marca (radio `xl`), con texto según el rol a partir de
  `get_home_summary`:
  - jefe técnico o administrador: «N solicitudes esperan tu decisión», con el detalle «X por
    aceptar y Y por asignar» y el botón blanco «Revisar bandeja»;
  - técnico: «Tienes N trabajos asignados»;
  - solicitante: «N solicitudes activas».
  - Si el valor es 0, se muestra `EmptyState allDone` en versión compacta.
- **Números:** cuadrícula de 2×2 de `Card`, cada una con `IconTile` de 36 px en el color de su
  fase, un chevrón, la cifra en estilo `display` y la etiqueta caption. Al tocarla, abre la lista ya
  filtrada. Ejemplo de jefe técnico: Por aceptar (nueva), Sin asignar (curso, `person-add`), En
  espera (detenida), Alta prioridad (rechazada, `flag`). Otros roles, con sus contadores de C-006.
- **«Lo que te toca hoy»:** hasta 3 `CaseCard` y el enlace «Ver todo».
- **Administrador:** las alertas de configuración que ya existen, como tarjetas con ícono de su
  fase (`warning-outline` en ámbar).

### 4.5 Administrar, catálogos, perfil y acceso

Aquí se migra al sistema, sin cambiar la estructura de las pantallas:

- `ScreenContainer` + `Card` + `Button` + `Chip` + `EmptyState`;
- el ícono de cada catálogo en un `IconTile` gris: áreas `business-outline`, tipos de servicio
  `pricetag-outline`, recursos `cube-outline`, usuarios `people-outline`, invitaciones
  `mail-outline`, solicitudes de acceso `person-add-outline` y código de empresa `key-outline`;
- editar, borrar y cerrar como botones de ícono con zona táctil de 44 px y `accessibilityLabel`;
- los roles como `Chip` no seleccionables con un ícono por rol: administrador
  `shield-half-outline`, jefe de área `ribbon-outline`, técnico `construct-outline`, solicitante
  `person-outline` y auditor `eye-outline`;
- en inicio de sesión, registro y la pantalla sin empresa: tipografía y botones del sistema, más un
  `EmptyState` para «Solicitud enviada a <empresa>».

## 5. Movimiento (Reanimated, sin dependencias nuevas)

- **Entrada de listas:** `FadeInDown.duration(220)` escalonado 40 ms, solo en los primeros 8
  elementos y solo en la primera carga, no al refrescar.
- **Cambio de estado en el detalle:** `LinearTransition` en el encabezado y en el progreso; el nodo
  actual pasa al siguiente con una transición de 250 ms.
- **Presión:** las `Card` y los `Button` con `onPress` se hunden a escala 0,98 durante 120 ms.
- **Carga:** esqueletos con pulso de opacidad, en lugar de indicadores de carga sueltos en las
  listas.
- **Reducción de movimiento:** respeta la opción del sistema (`ReduceMotion.System`, el valor por
  defecto de Reanimated); con ella activa, no hay entradas animadas.

## 6. Orden de trabajo y criterios de aceptación

Hay cuatro entregas, cada una con `npm run verify` en verde y revisión de Claude antes de pasar a
la siguiente.

| Entrega            | Contenido                                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------------------------ |
| **V1 Fundamentos** | 3.1 a 3.4: tokens, `statusMeta`, fuentes, vibración y componentes base; eliminar `PrimaryButton` y `statusColors`. |
| **V2 Solicitudes** | 4.1 a 4.3: tarjeta, lista, detalle, progreso, historial y barra de acciones.                                       |
| **V3 Inicio**      | 4.4.                                                                                                               |
| **V4 Resto**       | 4.5 y la revisión de movimiento (5).                                                                               |

Criterios, que se comprueban al final de V4:

- `grep` en `src/features` y `src/navigation`:
  - sin `fontSize:` ni `fontWeight:` literales;
  - sin `borderRadius:` numérico (solo `radius.*`);
  - sin colores hexadecimales fuera de `src/theme/`, salvo el logotipo de Google en el inicio de
    sesión.
- Cada estado se muestra solo con `StatusBadge`, `statusMeta` o `ProgressTracker`; no quedan
  paletas locales.
- Todo control interactivo tiene una zona táctil de 44 px o más, `accessibilityRole` y una
  etiqueta. Los íconos sin texto llevan `accessibilityLabel`.
- Contraste: el texto de las etiquetas sobre su fondo de fase cumple 4,5:1 (los pares de 3.1 ya lo
  cumplen; no los aclares).
- Pruebas:
  - cobertura de `statusMeta` y `actionMeta`;
  - frase del historial, incluida la acción desconocida;
  - agrupación por día;
  - `feedback` sin fallar cuando no hay vibración;
  - la cobertura global se mantiene en 80 % o más.
- Prueba en un dispositivo Android con una APK nueva: fuentes cargadas, vibración y animaciones
  fluidas en la lista.

## 7. Fuera de alcance

- Modo oscuro.
- Ilustraciones a medida: se usan íconos grandes.
- Pantalla de notificaciones.
- Cambios de navegación o de backend.
- Reportes y firma, que van en una etapa posterior.

## 8. V5 — Pulido tras la prueba en Android (24/09/2026)

Origen: capturas del APK de V4 en un Android físico, la propuesta de Inicio que compartió el
responsable y una revisión completa del código de `49d5b96`. No cambia la navegación principal
ni el backend. Decisiones del responsable (24/09/2026): se conserva la fuente de D-003, la
prioridad sigue con borde y bandera, y los filtros de Solicitudes se reorganizan como indica 8.3.

### 8.1 Reglas generales

1. **Un solo título por pantalla.**
   - Las raíces de pestaña (Inicio, Solicitudes, Administrar y Perfil) ocultan la barra nativa
     (`headerShown: false`) y conservan el título grande. Hoy Solicitudes muestra los dos.
   - Las pantallas que se abren encima (Detalle, Nueva y Editar solicitud, Acciones, Asignar,
     Recursos utilizados y las subpantallas de Administrar) usan solo la barra nativa. Se quitan
     su sobretítulo y su título grande; si hace falta, queda una línea de ayuda.
2. **Plurales y ceros.** Agregar `plural(count, singular, plural)` en `src/theme/formatters.ts`,
   con pruebas, y usarlo en todo texto con cantidad (hoy, `homePresentation.ts` en las líneas
   32, 33, 51, 60 y 249 a 265). Las partes en cero no se muestran: nunca «y 0 por asignar».
3. **Etiquetas desde los catálogos, nunca desde códigos.** Quitar
   `charAt(0).toUpperCase() + slice(1)`:
   - acciones: `actionMeta` (etiqueta e ícono) en `CaseDetailScreen`, `ChangeCaseStatusScreen`
     y la hoja de acciones;
   - prioridad: `priorityMeta` en `CaseForm`;
   - `AreasScreen`, línea 64.
4. **Carga y error.** Las pantallas que aún usan `ActivityIndicator` o un mensaje propio pasan a
   `SkeletonList` en listas y `RequestState` en pantalla completa: Asignar, Acciones, Editar
   solicitud, Recursos utilizados, Invitaciones, Usuarios, Áreas, Tipos de servicio, Recursos y
   Mi empresa. El historial del detalle usa un esqueleto de tres filas.
5. **Mismo componente para lo mismo.**
   - Toda persona se muestra con `Avatar`; la lista de Usuarios hoy dibuja el suyo.
   - Los filtros y opciones seleccionables son `Chip`, en una sola fila deslizable: filtros de
     Usuarios, rol y área en Invitaciones.
   - Las acciones de texto son `Button variant="text"`, como «Compartir aviso» y «Revocar».
6. **Filas deslizables sin recorte.** La fila horizontal de chips de Solicitudes se ve cortada
   por abajo. A estas filas: `style={{ flexGrow: 0 }}` y `paddingVertical: spacing.xs` en el
   contenido, para que la zona táctil extendida y la sombra no se recorten. Comprobarlo en el
   dispositivo.
7. **Teclado.** El formulario de la solicitud de acceso (modal con nota) no maneja el teclado.
   Usar `KeyboardFormScrollView` como en los demás modales.
8. **Números** con formato `es-GT` (cantidades y horas de recursos), como en el PDF.

### 8.2 Inicio (propuesta del responsable)

- **Encabezado:** fecha arriba («Miércoles, 23 de septiembre»), saludo grande (puede ocupar dos
  líneas) y «rol · área» debajo. A la derecha, la campana y el `Avatar`. El nombre del saludo
  empieza con mayúscula aunque el perfil esté en minúsculas.
- **Bandeja:** sobretítulo «TU BANDEJA» y título con plural correcto. El desglose pasa a
  etiquetas («2 por aceptar», «1 por asignar»), omitiendo las que valen cero. El botón
  «Revisar bandeja» ocupa todo el ancho.
- **Tarjetas de números horizontales:** ícono a la izquierda y, al lado, número y texto; sin
  flecha, porque toda la tarjeta se puede tocar. Mitad de alto que hoy, para que «Lo que te toca
  hoy» suba a la primera pantalla.
- **Destino de cada tarjeta:** `getHomeTileTarget` decide a qué filtro lleva según el texto de la
  tarjeta. Usar un identificador (`id`), para que cambiar un texto no rompa la navegación.
- **Campana:** se mantiene como acceso a pendientes hasta T-908; allí pasará a abrir los avisos.
- **Almacenamiento (opcional):** si `admin.almacenamiento.porcentaje` llega a 80 o más, agregar
  una alerta en «Completa la configuración» («Almacenamiento al 85 %»).
- **Tipografía (decidido):** se conserva la fuente de D-003; de la propuesta se toma el diseño, no
  la fuente del sistema.
- **Prioridad (decidido):** se mantiene con borde y bandera, para no confundirla con el estado,
  que va relleno.

### 8.3 Solicitudes

- **Filtros (decidido):** hoy «En curso» aparece en las dos filas y «Todas» (arriba)
  convive con «Todos · 2» (abajo). Propuesta:
  - la fila de chips indica _qué conjunto_ se ve: administrador «Todas · Bandeja»; jefe técnico
    «Bandeja · Mi área»; jefe solicitante «Mi área · Mías»; técnico «Mis trabajos · Mi área»;
  - los segmentos indican _el estado_: «Todas · Pendientes · En curso · Cerradas»;
  - los accesos que vienen de Inicio («Por aceptar», «Sin asignar») se muestran como chips
    removibles, igual que el filtro de estado exacto.
- **Segmentos en una línea:** en 360 dp «Pendientes · 1» y «Cerradas · 0» se parten.
  - La etiqueta va en una línea (`numberOfLines={1}`) y el número como una pequeña cápsula a su
    lado.
  - Si aun así no cabe, reducir la letra hasta 0,85 (`adjustsFontSizeToFit`, `minimumFontScale`).
- **Botón flotante:** comprobar que la última tarjeta pueda subir por completo sobre «Nueva
  solicitud». Sugerencia: al desplazar hacia abajo, el botón se reduce a solo el ícono.
- **Tarjeta:** agregar una flecha a la derecha, como en la propuesta; la ubicación conserva su
  ícono.

### 8.4 Detalle

- **Progreso:**
  - Las etiquetas se parten a mitad de palabra («SOLICIT / ADA»). Quitar la etiqueta bajo cada
    círculo y mostrar, debajo de la fila, «Actual: En ejecución · Siguiente: Reporte» en
    `typography.caption`. El título «Paso 4 de 6» y la descripción accesible se mantienen.
  - La línea atraviesa los círculos 5 y 6: los círculos deben quedar encima (`zIndex` y
    `elevation`); comprobarlo en Android.
  - La marca de los pasos completos casi no se ve: usar `checkmark-sharp` en 16 px.
- **Botones de acción** con `actionMeta` («Aceptar solicitud», «Iniciar trabajo», etc.).
  Rechazar y cancelar van en rojo (`danger`).

### 8.5 Acciones (cambiar estado)

- El estado actual se muestra con `StatusBadge`.
- Cada opción es una tarjeta con el ícono y la etiqueta de `actionMeta` y una línea que explique
  qué pasa («La solicitud vuelve a la bandeja», etc.). La opción elegida lleva una marca;
  rechazar y cancelar, en rojo.
- El botón repite la acción: «Confirmar: Rechazar».

### 8.6 Asignar personal

- Cada persona con `Avatar`, nombre y «rol · área». El radio debe ser circular
  (`radius.pill`); hoy es un cuadrado redondeado.
- «Guardar asignación» fijo abajo, como la barra de acciones del detalle.
- Sin personal disponible: `EmptyState` («No hay técnicos en esta área»). Si quien asigna es el
  administrador, con acceso a Usuarios.

### 8.7 Nueva y editar solicitud

- Quitar el título duplicado de «Nueva solicitud» y dejar solo la línea de ayuda.
- Prioridad como tres opciones con el ícono y los colores de `priorityMeta`.

### 8.8 Recursos utilizados

Esta pantalla no se migró en V4:

- Usar `Card`, con `IconTile` `cube-outline` para recursos y `construct-outline` para mano de
  obra.
- Arriba, un resumen con el total de horas y la cantidad de registros.
- Vacío con `EmptyState`; si la persona puede registrar, con la acción «Registrar uso».
- «Registrar uso» como `Button` con ícono, igual que «Nueva solicitud».
- Números con formato `es-GT`.

### 8.9 Administrar

- **Inicio de Administrar:** el contador pasa del título («Usuarios · 3») a un `Chip` de aviso
  con texto: «3 sin área», «1 pendiente».
- **Usuarios:** los filtros de rol ocupan tres filas. Pasan a una fila deslizable de `Chip`, con
  el mismo estilo de selección que en Solicitudes.
- **Invitaciones:**
  - rol y área se eligen con `Chip`;
  - en cada invitación, los chips van en una fila y se muestran el área y la fecha;
  - «Compartir aviso» y «Revocar» como botones de texto (revocar, en rojo).
- **Solicitudes de acceso:** manejo del teclado en el modal (8.1.7).

### 8.10 Perfil y completar nombre

- **Perfil:**
  - `Avatar` de 72 px como cabecera.
  - El nombre se muestra como texto con un botón de ícono «Editar nombre». Al tocarlo aparece un
    `FormField` con «Guardar» y «Cancelar». Hoy es un `TextInput` sin estilo que se ve desplazado
    y no parece editable.
  - «Cerrar sesión» como `Button variant="secondary"` al final, y debajo la versión.
- **Completar nombre:** migrar a `ScreenContainer`, `Card` y `FormField`; «Cerrar sesión» como
  botón de texto. Hoy tiene el mismo peso que «Continuar».

### 8.11 Criterios de aceptación

- `npm run verify` en verde; pruebas nuevas para `plural` y para los textos de Inicio con uno y
  con cero.
- Capturas de un Android de 360 dp de ancho de: Inicio (administrador y jefe técnico),
  Solicitudes, Detalle en tres estados, Acciones, Asignar, Recursos utilizados, Administrar y
  sus subpantallas, Perfil, Completar nombre, Inicio de sesión y Registro.
- En ninguna captura hay textos partidos a mitad de palabra, elementos recortados, títulos
  repetidos, plurales incorrectos ni etiquetas generadas desde códigos.

## 9. V6 — Ajustes finales tras la segunda prueba en Android (24/09/2026)

Origen: capturas del APK de V5. Decisiones del responsable (24/09/2026): la unidad de medida de
los recursos se muestra con su nombre, los costos en quetzales y el administrador solo cancela
las solicitudes que él mismo creó (opción 1; ver `docs/BUSINESS_RULES.md`, 5.3). No cambia la
navegación principal.

### 9.1 Errores visibles

1. **Filtros recortados por abajo** (Solicitudes y Usuarios). El ajuste de 8.1.6 no bastó:
   la fila deslizable se encoge para dar espacio a la lista. A estas filas:
   `style={{ flexGrow: 0, flexShrink: 0 }}` y `minHeight: 52` en el contenedor. Revisar
   cualquier otra fila horizontal de chips que esté fuera de una tarjeta. Comprobarlo en
   Android.
2. **Tarjeta de solicitud en pantallas angostas.** En «Lo que te toca hoy» la fila de
   etiquetas se parte y «Sin asignar» o el avatar caen solos a otra línea. Nueva
   distribución:
   - fila superior: número y hora juntos a la izquierda («CAS-2026-00003 · hace 1 h») y, a la
     derecha, el `Avatar` de 24 px o «Sin asignar»;
   - fila inferior: solo estado y prioridad, sin salto de línea.
3. **Barra de acciones del detalle.** Hoy se apilan tres botones a todo el ancho. El botón
   principal queda a todo el ancho; debajo, «Editar» y «Más acciones» en una fila, mitad y
   mitad, como botones secundarios de 44 px. Si solo hay uno, ocupa la fila completa.

4. **Logo inicial deformado al volver a abrir la app.** `BrandIntroScreen` se muestra antes de
   que carguen las fuentes (`App.tsx` solo espera `fontsReady` para cerrar la intro).
   «Nexo Casos» se mide con la letra del sistema y, al llegar la fuente propia, se parte en
   dos líneas y queda corrido a la izquierda. Solución:
   - mientras cargan las fuentes, `App.tsx` muestra solo el fondo (`colors.background`), sin
     texto; la intro empieza cuando `useFonts` termina, con o sin error. No se agrega
     `expo-splash-screen`;
   - en `BrandIntroScreen`, el nombre lleva `textAlign: 'center'`, `alignSelf: 'stretch'` y
     `numberOfLines={1}`.
     Comprobarlo cerrando sesión y reabriendo la app en frío.

### 9.2 Acciones de la solicitud

5. **Regla del administrador.** En `casePermissions.ts`, `cancelar` solo aparece para quien
   creó la solicitud o para el jefe del área solicitante; se quita `isAdmin`. Aceptar,
   rechazar y asignar no cambian. Actualizar las pruebas. El backend lo aplica en la
   migración `20260924100000_restrict_admin_cancel` (rama `agent/claude/admin-cancel-rule`).
6. **Explicación en el menú de acciones.** Cada opción de la hoja de acciones muestra debajo
   la `description` de `actionMeta`. Ajustar dos textos:
   - rechazar: «El área técnica no la atenderá. Pide un motivo.»;
   - cancelar: «Quien la pidió la retira antes de que la acepten.»

### 9.3 Consistencia

7. **El azul es solo para lo que se toca.** Los datos de las tarjetas (tipo y unidad de
   recurso, costo, área de un tipo de servicio, área de un usuario y los datos de Recursos
   utilizados) pasan a `colors.textMuted`, o a `colors.text` si son el dato principal.
8. **Activar y desactivar.** El ícono de pausa rojo se confunde con «pausar trabajo». En
   Áreas, Tipos de servicio y Recursos, un solo botón de ícono «⋯» (44 px, con etiqueta
   accesible) abre la hoja de acciones con «Editar» y «Desactivar» (en rojo) o «Activar».
9. **Botón de crear.** El «+» redondo del encabezado se reemplaza por el mismo botón
   flotante de «Nueva solicitud»: «Nueva área», «Nuevo tipo de servicio», «Nuevo recurso».
   La lista reserva espacio abajo para que el último elemento no quede tapado.
10. **Tarjetas de catálogo.** El `IconTile` se alinea arriba (`alignItems: 'flex-start'`) y el
    chip «Activo»/«Activa» va en la misma fila que el nombre, a la derecha; el nombre se
    recorta si no cabe.
11. **Recursos:**
    - La línea de datos queda como «Material · Unidad: pieza · Q 10.00».
    - Agregar `formatQuetzales(value)` en `src/theme/formatters.ts`, con
      `Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' })` y pruebas. Usarlo en
      el catálogo, en Recursos utilizados y en cualquier otro costo que se muestre.
    - En el formulario del recurso: etiqueta «Unidad de medida» y texto de ejemplo «pieza,
      metro, litro, galón».
12. **Invitaciones:**
    - Se quita el sobre grande; la tarjeta del formulario lleva el título «Nueva invitación».
    - El correo tiene texto de ejemplo «nombre@empresa.com», `keyboardType="email-address"`
      y `autoCapitalize="none"`.
    - Las áreas se filtran según el rol elegido: para técnico, solo áreas técnicas; para los
      demás roles, todas. Si al cambiar el rol el área elegida deja de ser válida, vuelve a
      «Sin área». Los chips muestran solo el nombre del área, sin «· Solicitante».

### 9.4 Pantalla de arranque (decidido: opción A)

Decisión del responsable (24/09/2026): opción A. Maqueta en el artefacto «Arranque de Nexo
Casos». El nombre va en una línea y la intro espera las fuentes (punto 4).

- Fondo `colors.background`. El logo a color va dentro de una tarjeta blanca de 112 px con
  radio `radius.xl` y `elevation.sm`.
- Debajo, «Nexo Casos» (`fonts.extrabold`, 22 a 24 px, una línea) y el lema en
  `colors.textMuted`.
- Una barra fina indeterminada de 84 × 4 px en `colors.primary` sobre `colors.border`,
  mientras se carga la sesión. Al pie, «Versión x.y.z».
- Animación: el logo aparece con escala de 0,82 a 1, y el nombre y el lema suben y aparecen
  en secuencia. Todo se desactiva con reducir movimiento.
- No toca `app.json` ni agrega dependencias. La opción B (fondo azul) queda descartada.

### 9.5 Criterios de aceptación

- `npm run verify` en verde, con pruebas para `formatQuetzales`, para el permiso de cancelar
  (administrador creador y no creador) y para el filtro de áreas por rol.
- Capturas en Android de:
  - los filtros de Solicitudes y Usuarios sin recorte;
  - «Lo que te toca hoy» con tarjetas sin saltos de línea;
  - el detalle con la barra de acciones nueva;
  - la hoja de acciones del administrador en una solicitud ajena (solo «Rechazar») y en una
    propia («Rechazar» y «Cancelar»), con sus explicaciones;
  - Áreas, Tipos de servicio y Recursos (con quetzales y unidad);
  - Invitaciones con un técnico seleccionado;
  - la pantalla de arranque (opción A), tras cerrar sesión y reabrir la app.

## 10. V6.1 — Ajustes menores tras la prueba de V6 (24/09/2026)

V6 quedó confirmada en el teléfono de Vincent: filtros sin recorte, tarjetas nuevas,
catálogos con menú «⋯», quetzales, invitaciones y pantalla de arranque. Quedan cuatro
ajustes pequeños, que se hacen en un commit aparte antes de T-906 y T-907.

1. **Mi empresa.**
   - Hoy hay tres botones principales iguales. Queda uno solo principal: «Guardar nombre»,
     habilitado solo cuando el nombre cambió.
   - «Compartir o copiar» pasa a botón secundario con ícono.
   - «Regenerar código» invalida el código anterior: pasa a botón de texto en rojo y pide
     confirmación en la propia app («Las personas con el código anterior ya no podrán
     usarlo»).
2. **Invitaciones.** Las filas de rol y de área se cortan en el borde de la tarjeta
   («Técnico», «Mantenimie…»). Como son pocas opciones, van en filas que saltan de línea
   (`flexWrap: 'wrap'`) en lugar de deslizarse.
3. **Nombres recortados en catálogos.** En Áreas y Tipos de servicio el nombre se corta
   («Recursos Hum…», «Acceso a siste…») por el chip y el menú. El nombre puede ocupar hasta
   dos líneas (`numberOfLines={2}`) antes de recortarse.
4. **Solicitudes de acceso.** Las pestañas «Pendientes» y «Resueltas» usan un estilo propio:
   pasan a `SegmentedControl`. La lista vacía usa `EmptyState` («Todo al día · No hay
   solicitudes pendientes»).

## 11. V7 — Ajustes tras el QA en el emulador (26/09/2026)

Salen de la prueba del flujo completo en el emulador de Android y de la revisión del
cliente. Van en la rama `agent/codex/qa-fixes`, junto con las correcciones del QA.

### 11.1 Posición y espacio

1. **La acción flotante tapa la lista.** En Solicitudes, «Nueva solicitud» cubre el final
   de la última tarjeta (por ejemplo, el chip de prioridad). La lista reserva abajo un
   `paddingBottom` igual a la altura del botón más `spacing.lg`.
2. **Barra de acciones fija.** En el detalle, la acción principal y la secundaria
   apiladas, más la barra de pestañas, ocupan casi un tercio de la pantalla. La
   secundaria («Pausar trabajo», «Editar») pasa a botón de texto o comparte fila con la
   principal. Nunca deben quedar más de dos filas fijas.
3. **Sección Reporte del detalle.** Solo quien puede agregar fotos ve los espacios vacíos
   de «Agregar». Los demás ven solo las fotos que existen. Si no hay fotos, una línea
   «Sin fotos de antes» o «Sin fotos de después».
4. **Títulos repetidos.** Si el encabezado ya dice «Revisar reporte» o «Reporte», el
   título interno se quita y el número de la solicitud queda como subtítulo
   (`typography.caption`, `textMuted`).

### 11.2 Tamaños y consistencia

5. **Hoja de firma.**
   - «Borrar» pasa a botón de texto junto al lienzo, arriba a la derecha.
   - «Cancelar» (secundario) y «Firmar» (principal) van en una fila, con el mismo
     ancho.
6. **Pestañas de filtro de Solicitudes.**
   - Las no seleccionadas usan `typography.caption` en `colors.text` con el contador
     en `textMuted`, no un texto más chico y tenue.
   - Si no caben en 360 dp, se permite desplazamiento horizontal, nunca recortar.

### 11.3 Colores e íconos

7. **Íconos en lugar de símbolos de texto.**
   - Los requisitos del reporte usan `checkmark-circle` en `colors.success` cuando se
     cumplen y `ellipse-outline` en `textMuted` cuando falta, en lugar de ✓ y ○.
   - El consentimiento de la firma usa `checkbox` y `square-outline` con
     `accessibilityRole="checkbox"`, en lugar de ☐ y ☑.
8. **Fase de revisión.**
   - Los cuadros y avisos «Por validar» y «Por aprobar» del Inicio usan
     `phaseColors.revision` (morado), igual que los chips «Reporte enviado» y
     «Validada».
   - «Por aceptar» y «Sin asignar» siguen con `nueva`.

### 11.4 Cambios de comportamiento con impacto visual

9. **Historial.** Las acciones del reporte tienen verbo propio en `actionMeta`:
   - «firmó y envió el reporte»;
   - «firmó la validación técnica»;
   - «devolvió el reporte», mostrando el motivo como comentario;
   - «firmó la conformidad».

   Cada una con su ícono. Ya no se usa «cambió el estado a …».

10. **Campana.**
    - Hasta que exista T-908, sin punto rojo.
    - Si no hay pantalla de avisos, se oculta.
11. **Aviso sin conexión.** Una franja delgada bajo el encabezado, en `warningSoft` y
    `warning`, con «Sin conexión. Los cambios se enviarán al reconectar.». Usa el mismo
    estado de NetInfo que `onlineManager`.
12. **Cerrar sesión.** Pide confirmación: «¿Cerrar sesión?», con «Cancelar» y «Cerrar
    sesión».
13. **«Editar» con el reporte enviado.** Decidido por Vincent: se oculta en
    `reporte_enviado`, `validado` y `aprobado`.

### 11.5 Criterios de aceptación

- Ninguna tarjeta de lista queda tapada por la acción flotante.
- En el detalle no hay más de dos filas fijas sobre la barra de pestañas.
- No quedan ✓, ○, ☐ ni ☑ como texto en la interfaz.
- El historial de una solicitud aprobada no contiene «cambió el estado a».
- Las pruebas cubren: `actionMeta` de las acciones del reporte, la confirmación al
  cerrar sesión, «Editar» oculto por estado y el aviso sin conexión.
