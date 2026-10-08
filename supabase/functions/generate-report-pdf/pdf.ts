// Composición del PDF del reporte de cierre (T-1002). Sigue el lienzo «Nexo Casos —
// Reporte de cierre»: una página con el reporte y una hoja de evidencia.
//
// Solo dibuja: recibe el contenido congelado, las firmas y el historial ya leídos por
// `index.ts`. No consulta la base de datos ni cambia lo firmado.
import {
  PDFDocument,
  StandardFonts,
  clip,
  endPath,
  popGraphicsState,
  pushGraphicsState,
  rectangle,
  rgb,
  type PDFFont,
  type PDFImage,
  type PDFPage,
  type RGB,
} from 'npm:pdf-lib@1.17.1'

import {
  ACTION_LABELS,
  PRIORITY_LABELS,
  ROLE_LABELS,
  SIGNATURE_LABELS,
  clampLines,
  describeUsage,
  elapsedLabel,
  fitStroke,
  formatAmount,
  formatDateTime,
  svgPathBounds,
  toWinAnsi,
  usageCost,
  usageKindLabel,
  verificationCode,
  wrapText,
} from '../_shared/pdfText.ts'

export interface FrozenContent {
  version: number
  solicitud: Record<string, string | null>
  fechas: Record<string, string | null>
  reporte: Record<string, string | null>
  recursos: Array<Record<string, string | number | null>>
  fotos: Array<{ id: string; tipo: 'antes' | 'despues'; miniatura: string }>
}

export interface SignatureRow {
  signature_type: string
  signer_id: string
  signer_role: string
  signed_at: string
  stroke_path: string
  consent_text: string
  ip_address: string | null
  user_agent: string | null
  signature_hash: string
}

export interface EventRow {
  action: string
  actor_id: string
  actor_role: string
  comment: string | null
  created_at: string
}

export interface PdfInput {
  organizationName: string
  caseNumber: string
  versionNumber: number
  contentHash: string
  content: FrozenContent
  signatures: SignatureRow[]
  events: EventRow[]
  names: Map<string, string>
  thumbnails: Array<{ tipo: 'antes' | 'despues'; bytes: Uint8Array | null }>
  generatedAt: string
}

const PAGE = { width: 612, height: 792, margin: 48 } // Carta
const CONTENT_WIDTH = PAGE.width - PAGE.margin * 2
const BOTTOM = PAGE.margin + 18 // deja lugar al pie
const COLORS = {
  text: rgb(0.09, 0.17, 0.3),
  muted: rgb(0.37, 0.42, 0.52),
  line: rgb(0.89, 0.91, 0.94),
  strong: rgb(0.84, 0.87, 0.91),
  brand: rgb(0.03, 0.37, 0.68),
  soft: rgb(0.96, 0.97, 0.98),
  beforeSoft: rgb(0.93, 0.94, 0.96),
  afterSoft: rgb(0.91, 0.96, 0.93),
}
const SIGNATURE_ORDER = ['ejecucion', 'validacion_tecnica', 'conformidad'] as const

interface Fonts {
  regular: PDFFont
  bold: PDFFont
  mono: PDFFont
}

interface TextStyle {
  size?: number
  font?: PDFFont
  color?: RGB
  lineHeight?: number
}

// Página actual y posición vertical (coordenadas PDF: y hacia arriba).
class Canvas {
  page!: PDFPage
  y = 0

  constructor(
    readonly doc: PDFDocument,
    readonly fonts: Fonts,
  ) {
    this.addPage()
  }

  addPage() {
    this.page = this.doc.addPage([PAGE.width, PAGE.height])
    this.y = PAGE.height - PAGE.margin
  }

  // Pasa a otra página si no caben `height` puntos. Devuelve true si cambió de página.
  ensure(height: number): boolean {
    if (this.y - height >= BOTTOM) return false
    this.addPage()
    return true
  }

  lines(value: string | null | undefined, width: number, style: TextStyle = {}): string[] {
    const font = style.font ?? this.fonts.regular
    const size = style.size ?? 9.5
    return wrapText(toWinAnsi(value ?? ''), width, (line) => font.widthOfTextAtSize(line, size))
  }

  blockHeight(lines: string[], style: TextStyle = {}): number {
    return lines.length * lineHeight(style)
  }

  // Dibuja líneas ya partidas desde `top` hacia abajo; no cambia de página.
  drawLines(lines: string[], x: number, top: number, style: TextStyle = {}): number {
    const font = style.font ?? this.fonts.regular
    const size = style.size ?? 9.5
    const step = lineHeight(style)
    lines.forEach((line, index) => {
      this.page.drawText(line, {
        x,
        y: top - index * step - size,
        size,
        font,
        color: style.color ?? COLORS.text,
      })
    })
    return lines.length * step
  }

  // Texto en una sola línea, recortado si no cabe.
  drawLine(value: string, x: number, top: number, width: number, style: TextStyle = {}) {
    const line = this.lines(value, width, style)[0] ?? ''
    this.drawLines([line], x, top, style)
  }

  // Párrafo que puede ocupar varias páginas, a todo el ancho.
  flow(value: string | null | undefined, style: TextStyle = {}, indent = 0) {
    const step = lineHeight(style)
    for (const line of this.lines(value, CONTENT_WIDTH - indent, style)) {
      this.ensure(step)
      this.drawLines([line], PAGE.margin + indent, this.y, style)
      this.y -= step
    }
  }

  rule(y: number, color = COLORS.line, thickness = 0.8, x = PAGE.margin, width = CONTENT_WIDTH) {
    this.page.drawLine({
      start: { x, y },
      end: { x: x + width, y },
      thickness,
      color,
    })
  }

  // Título de sección: mayúsculas en azul con una línea debajo.
  section(label: string, x = PAGE.margin, width = CONTENT_WIDTH, top = this.y): number {
    this.drawLines([toWinAnsi(label.toUpperCase())], x, top, {
      size: 9,
      font: this.fonts.bold,
      color: COLORS.brand,
    })
    this.rule(top - 15, COLORS.line, 0.8, x, width)
    return 20
  }
}

function lineHeight(style: TextStyle): number {
  return style.lineHeight ?? Math.round((style.size ?? 9.5) * 1.38 * 10) / 10
}

function label(value: string): string {
  return toWinAnsi(value.toUpperCase())
}

export async function buildPdf(input: PdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.setTitle(`Reporte ${input.caseNumber} v${input.versionNumber}`)
  doc.setAuthor(toWinAnsi(input.organizationName))
  doc.setCreator('Nexo Casos')
  doc.setProducer('Nexo Casos')
  const fonts: Fonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
    mono: await doc.embedFont(StandardFonts.Courier),
  }
  const c = new Canvas(doc, fonts)
  const code = verificationCode(input.contentHash)

  drawHeader(c, input, code)
  drawSummary(c, input.content)
  drawWorkAndTimes(c, input.content)
  drawResources(c, input.content)
  await drawPhotos(c, input.thumbnails)
  drawSignatures(c, input)

  c.addPage()
  drawEvidence(c, input, code)

  const pages = doc.getPages()
  pages.forEach((page, index) => {
    const y = PAGE.margin - 22
    page.drawLine({
      start: { x: PAGE.margin, y: y + 12 },
      end: { x: PAGE.width - PAGE.margin, y: y + 12 },
      thickness: 0.6,
      color: COLORS.line,
    })
    page.drawText(
      toWinAnsi(`Nexo Casos · ${input.caseNumber} · v${input.versionNumber} · Código ${code}`),
      { x: PAGE.margin, y, size: 7.5, font: fonts.regular, color: COLORS.muted },
    )
    const counter = `Página ${index + 1} de ${pages.length}`
    page.drawText(toWinAnsi(counter), {
      x: PAGE.width - PAGE.margin - fonts.regular.widthOfTextAtSize(toWinAnsi(counter), 7.5),
      y,
      size: 7.5,
      font: fonts.regular,
      color: COLORS.muted,
    })
  })

  return await doc.save()
}

// ---------------------------------------------------------------------------
// Página 1
// ---------------------------------------------------------------------------

function drawHeader(c: Canvas, input: PdfInput, code: string) {
  const { fonts } = c
  const top = c.y
  const approval = input.signatures.find((row) => row.signature_type === 'conformidad')

  // Recuadro del código de verificación, a la derecha.
  const codeText = toWinAnsi(code)
  const codeWidth = Math.max(fonts.bold.widthOfTextAtSize(codeText, 15), 118) + 24
  const boxLeft = PAGE.width - PAGE.margin - codeWidth
  c.page.drawRectangle({
    x: boxLeft,
    y: top - 46,
    width: codeWidth,
    height: 46,
    borderColor: COLORS.strong,
    borderWidth: 0.8,
  })
  c.drawLines([label('Código de verificación')], boxLeft + 12, top - 9, {
    size: 6.5,
    font: fonts.bold,
    color: COLORS.muted,
  })
  c.drawLines([codeText], boxLeft + 12, top - 22, {
    size: 15,
    font: fonts.bold,
    color: COLORS.brand,
  })

  const textWidth = boxLeft - PAGE.margin - 16
  c.drawLine(input.organizationName || 'Nexo Casos', PAGE.margin, top, textWidth, {
    size: 8.5,
    font: fonts.bold,
    color: COLORS.muted,
  })
  c.drawLines(['Reporte de cierre'], PAGE.margin, top - 14, { size: 21, font: fonts.bold })
  const subtitle = [
    input.caseNumber,
    `Versión ${input.versionNumber}`,
    approval ? `Aprobada el ${formatDateTime(approval.signed_at)}` : 'Aprobada',
  ].join(' · ')
  c.drawLine(subtitle, PAGE.margin, top - 42, textWidth, { size: 10, color: COLORS.muted })

  c.y = top - 56
  c.rule(c.y, COLORS.brand, 2.2)
  c.y -= 14
}

function drawSummary(c: Canvas, content: FrozenContent) {
  const { fonts } = c
  const s = content.solicitud ?? {}

  const title = c.lines(s.titulo, CONTENT_WIDTH, { size: 14, font: fonts.bold })
  c.ensure(c.blockHeight(title, { size: 14 }) + 70)
  c.y -= c.drawLines(title, PAGE.margin, c.y, { size: 14, font: fonts.bold })
  c.y -= 8

  // Cuatro datos clave en una franja con bordes.
  const cells = [
    { title: 'Tipo de servicio', value: s.tipo_servicio, detail: null },
    { title: 'Prioridad', value: PRIORITY_LABELS[s.prioridad ?? ''] ?? s.prioridad, detail: null },
    { title: 'Solicita', value: s.area_solicitante, detail: s.creada_por },
    { title: 'Atiende', value: s.area_destino, detail: s.tecnico },
  ]
  const cellWidth = CONTENT_WIDTH / cells.length
  const inner = cellWidth - 18
  const valueStyle = { size: 9.5, font: fonts.bold }
  const detailStyle = { size: 8, color: COLORS.muted }
  // Los datos clave nunca se cortan: la franja crece con la celda más alta. Si ni así
  // cabe en una página (nombres extraordinariamente largos), se listan a todo el ancho.
  const laidOut = cells.map((cell) => ({
    ...cell,
    valueLines: c.lines(cell.value ?? '—', inner, valueStyle),
    detailLines: cell.detail ? c.lines(cell.detail, inner, detailStyle) : [],
  }))
  const height =
    Math.max(
      ...laidOut.map(
        (cell) =>
          19 +
          c.blockHeight(cell.valueLines, valueStyle) +
          c.blockHeight(cell.detailLines, detailStyle),
      ),
    ) + 7
  if (height + 20 > PAGE.height - PAGE.margin - BOTTOM) {
    for (const cell of cells) {
      c.ensure(24)
      c.y -= c.drawLines([label(cell.title)], PAGE.margin, c.y, {
        size: 6.5,
        font: fonts.bold,
        color: COLORS.muted,
      })
      c.y -= 2
      c.flow(cell.value ?? '—', valueStyle)
      if (cell.detail) c.flow(cell.detail, detailStyle)
      c.y -= 6
    }
    drawContext(c, s)
    return
  }
  c.ensure(height + 20)
  c.page.drawRectangle({
    x: PAGE.margin,
    y: c.y - height,
    width: CONTENT_WIDTH,
    height,
    borderColor: COLORS.line,
    borderWidth: 0.8,
  })
  laidOut.forEach((cell, index) => {
    const left = PAGE.margin + index * cellWidth
    if (index > 0) {
      c.page.drawLine({
        start: { x: left, y: c.y },
        end: { x: left, y: c.y - height },
        thickness: 0.8,
        color: COLORS.line,
      })
    }
    c.drawLines([label(cell.title)], left + 9, c.y - 8, {
      size: 6.5,
      font: fonts.bold,
      color: COLORS.muted,
    })
    const valueHeight = c.drawLines(cell.valueLines, left + 9, c.y - 19, valueStyle)
    c.drawLines(cell.detailLines, left + 9, c.y - 19 - valueHeight, detailStyle)
  })
  c.y -= height + 6
  drawContext(c, s)
}

function drawContext(c: Canvas, s: Record<string, string | null>) {
  const context = [
    s.ubicacion ? `Ubicación: ${s.ubicacion}` : null,
    s.descripcion ? `Descripción: ${s.descripcion}` : null,
  ]
    .filter(Boolean)
    .join(' · ')
  if (context) c.flow(context, { size: 8.5, color: COLORS.muted })
  c.y -= 10
}

interface Field {
  title: string
  value: string | null | undefined
}

// Trabajo realizado (2/3) y tiempos (1/3) lado a lado. Si el texto no cabe en una página,
// el trabajo pasa a una sola columna para poder seguir en la siguiente.
function drawWorkAndTimes(c: Canvas, content: FrozenContent) {
  const { fonts } = c
  const r = content.reporte ?? {}
  const f = content.fechas ?? {}
  const gap = 22
  const leftWidth = Math.round(((CONTENT_WIDTH - gap) * 2) / 3)
  const rightWidth = CONTENT_WIDTH - gap - leftWidth
  const rightLeft = PAGE.margin + leftWidth + gap

  const fields: Field[] = [
    { title: 'Diagnóstico', value: r.diagnostico },
    { title: 'Qué se hizo', value: r.trabajo_realizado },
    { title: 'Causa', value: r.causa },
    { title: 'Observaciones', value: r.observaciones },
  ].filter((field) => field.value && field.value.trim())
  const bodyStyle = { size: 9 }
  const fieldBlocks = fields.map((field) => ({
    title: field.title,
    lines: c.lines(field.value, leftWidth, bodyStyle),
  }))
  const leftHeight =
    20 +
    fieldBlocks.reduce((total, block) => total + 12 + c.blockHeight(block.lines, bodyStyle) + 6, 0)

  const times: Array<[string, string | null | undefined]> = [
    ['Creada', f.creada],
    ['Aceptada', f.aceptada],
    ['Asignada', f.asignada],
    ['Iniciada', f.iniciada],
    ['Reporte enviado', f.enviada],
  ]
  const duration = elapsedLabel(f.creada, f.enviada)
  const rightHeight = 22 + times.length * 15 + (duration ? 22 : 0)

  const available = PAGE.height - PAGE.margin - BOTTOM
  if (Math.max(leftHeight, rightHeight) > available) {
    // Texto muy largo: una sola columna que continúa en las páginas siguientes.
    c.ensure(60)
    c.y -= c.section('Trabajo realizado')
    for (const field of fields) {
      c.ensure(30)
      c.y -= c.drawLines([label(field.title)], PAGE.margin, c.y, {
        size: 7,
        font: fonts.bold,
        color: COLORS.muted,
      })
      c.y -= 2
      c.flow(field.value, bodyStyle)
      c.y -= 8
    }
    c.y -= 8
    drawTimes(c, times, duration, PAGE.margin, CONTENT_WIDTH)
    return
  }

  c.ensure(Math.max(leftHeight, rightHeight))
  const top = c.y

  let y = top - c.section('Trabajo realizado', PAGE.margin, leftWidth, top)
  if (fieldBlocks.length === 0) {
    c.drawLines(['Sin descripción del trabajo.'], PAGE.margin, y, { color: COLORS.muted })
  }
  for (const block of fieldBlocks) {
    y -= c.drawLines([label(block.title)], PAGE.margin, y, {
      size: 7,
      font: fonts.bold,
      color: COLORS.muted,
    })
    y -= 1
    y -= c.drawLines(block.lines, PAGE.margin, y, bodyStyle)
    y -= 6
  }

  c.y = top
  drawTimes(c, times, duration, rightLeft, rightWidth)
  c.y = Math.min(y, top - rightHeight) - 6
}

function drawTimes(
  c: Canvas,
  times: Array<[string, string | null | undefined]>,
  duration: string | null,
  left: number,
  width: number,
) {
  const { fonts } = c
  c.ensure(22 + times.length * 15 + 22)
  c.y -= c.section('Tiempos', left, width)
  for (const [name, value] of times) {
    const shown = toWinAnsi(formatDateTime(value))
    c.drawLines([toWinAnsi(name)], left, c.y, { size: 8.5, color: COLORS.muted })
    c.page.drawText(shown, {
      x: left + width - fonts.regular.widthOfTextAtSize(shown, 8.5),
      y: c.y - 8.5,
      size: 8.5,
      font: fonts.regular,
      color: COLORS.text,
    })
    c.y -= 15
  }
  if (duration) {
    c.rule(c.y - 2, COLORS.line, 0.8, left, width)
    c.y -= 8
    const text = toWinAnsi(duration)
    c.drawLines(['Duración'], left, c.y, { size: 8.5, font: fonts.bold })
    c.page.drawText(text, {
      x: left + width - fonts.bold.widthOfTextAtSize(text, 8.5),
      y: c.y - 8.5,
      size: 8.5,
      font: fonts.bold,
      color: COLORS.text,
    })
    c.y -= 15
  }
}

interface Column {
  title: string
  width: number
  align?: 'left' | 'right'
  // Solo para datos técnicos sin límite (el dispositivo): líneas máximas, con «…». Los
  // datos del caso nunca se cortan; si una fila no cabe, continúa en la página siguiente.
  maxLines?: number
}

interface TableCell {
  text: string
  muted?: string
  bold?: boolean
  mono?: boolean
}

interface CellLine {
  text: string
  font: PDFFont
  size: number
  color: RGB
}

const ROW_PADDING = 3.5

// Tabla con encabezado sombreado; repite el encabezado al cambiar de página. Una fila
// que no cabe en lo que queda de página pasa entera a la siguiente; si tampoco cabe en
// una página completa, se divide por líneas y continúa después del encabezado.
function drawTable(
  c: Canvas,
  columns: Column[],
  rows: TableCell[][],
  options: { size?: number } = {},
) {
  const { fonts } = c
  const size = options.size ?? 8.5
  const padding = 6
  const headerHeight = 16
  const header = () => {
    c.page.drawRectangle({
      x: PAGE.margin,
      y: c.y - headerHeight,
      width: CONTENT_WIDTH,
      height: headerHeight,
      color: COLORS.soft,
    })
    let x = PAGE.margin
    for (const column of columns) {
      const text = toWinAnsi(column.title)
      const textWidth = fonts.bold.widthOfTextAtSize(text, size - 0.5)
      c.page.drawText(text, {
        x: column.align === 'right' ? x + column.width - padding - textWidth : x + padding,
        y: c.y - 11.5,
        size: size - 0.5,
        font: fonts.bold,
        color: COLORS.muted,
      })
      x += column.width
    }
    c.y -= headerHeight
  }
  const fullPage = PAGE.height - PAGE.margin - BOTTOM - headerHeight - ROW_PADDING * 2

  c.ensure(headerHeight + 20)
  header()
  rows.forEach((row, rowIndex) => {
    const cells: CellLine[][] = row.map((cell, index) => {
      const column = columns[index]
      const width = (column?.width ?? 0) - padding * 2
      const font = cell.mono ? fonts.mono : cell.bold ? fonts.bold : fonts.regular
      const cellSize = cell.mono ? size - 1 : size
      const main = c.lines(cell.text, width, { size: cellSize, font })
      const muted = cell.muted ? c.lines(cell.muted, width, { size: size - 1 }) : []
      return [
        ...(column?.maxLines ? clampLines(main, column.maxLines) : main).map((text) => ({
          text,
          font,
          size: cellSize,
          color: COLORS.text,
        })),
        ...muted.map((text) => ({
          text,
          font: fonts.regular,
          size: size - 1,
          color: COLORS.muted,
        })),
      ]
    })
    const cellHeight = (lines: CellLine[]) =>
      lines.reduce((total, line) => total + lineHeight({ size: line.size }), 0)
    const rowHeight = Math.max(...cells.map(cellHeight)) + ROW_PADDING * 2

    // Pasa la fila entera a la página siguiente si allí cabe completa.
    if (rowHeight <= fullPage + ROW_PADDING * 2 && c.ensure(rowHeight)) header()

    const cursors = cells.map(() => 0)
    for (;;) {
      const available = c.y - BOTTOM - ROW_PADDING * 2
      let sliceHeight = 0
      let x = PAGE.margin
      cells.forEach((lines, index) => {
        const column = columns[index] as Column
        let used = 0
        while ((cursors[index] ?? 0) < lines.length) {
          const line = lines[cursors[index] ?? 0] as CellLine
          const step = lineHeight({ size: line.size })
          if (used + step > available) break
          const lineWidth = line.font.widthOfTextAtSize(line.text, line.size)
          c.page.drawText(line.text, {
            x: column.align === 'right' ? x + column.width - padding - lineWidth : x + padding,
            y: c.y - ROW_PADDING - used - line.size,
            size: line.size,
            font: line.font,
            color: line.color,
          })
          used += step
          cursors[index] = (cursors[index] ?? 0) + 1
        }
        sliceHeight = Math.max(sliceHeight, used)
        x += column.width
      })
      c.y -= sliceHeight + ROW_PADDING * 2
      const pending = cells.some((lines, index) => (cursors[index] ?? 0) < lines.length)
      if (!pending) break
      // Continúa la misma fila en la página siguiente.
      c.addPage()
      header()
    }
    if (rowIndex < rows.length - 1) c.rule(c.y, COLORS.line, 0.6)
  })
}

function drawResources(c: Canvas, content: FrozenContent) {
  const usages = content.recursos ?? []
  c.ensure(60)
  c.y -= c.section('Recursos y mano de obra')
  if (usages.length === 0) {
    c.flow('Sin recursos registrados.', { size: 9, color: COLORS.muted })
    c.y -= 14
    return
  }

  const costs = usages.map((usage) => usageCost(usage as Parameters<typeof usageCost>[0]))
  const withCost = costs.some((cost) => cost !== null)
  const columns: Column[] = withCost
    ? [
        { title: 'Recurso', width: CONTENT_WIDTH * 0.44 },
        { title: 'Tipo', width: CONTENT_WIDTH * 0.2 },
        { title: 'Cantidad', width: CONTENT_WIDTH * 0.18, align: 'right' },
        { title: 'Costo', width: CONTENT_WIDTH * 0.18, align: 'right' },
      ]
    : [
        { title: 'Recurso', width: CONTENT_WIDTH * 0.52 },
        { title: 'Tipo', width: CONTENT_WIDTH * 0.24 },
        { title: 'Cantidad', width: CONTENT_WIDTH * 0.24, align: 'right' },
      ]
  const rows = usages.map((usage, index) => {
    const name =
      usage.tipo === 'mano_de_obra' ? String(usage.tecnico ?? '—') : String(usage.recurso ?? '—')
    const row = [
      { text: name, muted: usage.notas ? String(usage.notas) : undefined },
      { text: usageKindLabel(usage as Parameters<typeof usageKindLabel>[0]) },
      { text: describeUsage(usage as Parameters<typeof describeUsage>[0]) },
    ]
    if (withCost) {
      const cost = costs[index]
      row.push({ text: cost === null || cost === undefined ? '—' : formatAmount(cost) })
    }
    return row
  })
  if (withCost) {
    const total = costs.reduce<number>((sum, cost) => sum + (cost ?? 0), 0)
    rows.push([
      { text: 'Total de materiales', bold: true },
      { text: '' },
      { text: '' },
      { text: formatAmount(total), bold: true },
    ] as (typeof rows)[number])
  }
  drawTable(c, columns, rows)
  c.y -= 12
}

async function drawPhotos(
  c: Canvas,
  thumbnails: Array<{ tipo: 'antes' | 'despues'; bytes: Uint8Array | null }>,
) {
  const { fonts } = c
  if (thumbnails.length === 0) return
  const gap = 22
  const columnWidth = (CONTENT_WIDTH - gap) / 2
  const cellGap = 6
  const cell = Math.min((columnWidth - cellGap * 2) / 3, 58)
  c.ensure(22 + 14 + cell + 10)
  c.y -= c.section('Fotos')
  const top = c.y

  for (const [index, kind] of (['antes', 'despues'] as const).entries()) {
    const left = PAGE.margin + index * (columnWidth + gap)
    const group = thumbnails.filter((photo) => photo.tipo === kind).slice(0, 3)
    c.drawLines([label(`${kind === 'antes' ? 'Antes' : 'Después'} · ${group.length}`)], left, top, {
      size: 7,
      font: fonts.bold,
      color: COLORS.muted,
    })
    const rowTop = top - 12
    if (group.length === 0) {
      c.drawLines(['Sin fotos.'], left, rowTop, { size: 8.5, color: COLORS.muted })
      continue
    }
    for (const [position, photo] of group.entries()) {
      const x = left + position * (cell + cellGap)
      let image: PDFImage | null = null
      try {
        image = photo.bytes ? await c.doc.embedJpg(photo.bytes) : null
      } catch {
        image = null // WebP u otro formato: se muestra el recuadro vacío.
      }
      if (image) {
        drawCropped(c.page, image, { x, y: rowTop - cell, size: cell })
      } else {
        c.page.drawRectangle({
          x,
          y: rowTop - cell,
          width: cell,
          height: cell,
          color: kind === 'antes' ? COLORS.beforeSoft : COLORS.afterSoft,
        })
        c.drawLines(['Sin imagen'], x + 5, rowTop - cell / 2 + 4, {
          size: 6.5,
          color: COLORS.muted,
        })
      }
    }
  }
  c.y = top - 12 - cell - 12
}

// Dibuja la imagen cubriendo un cuadrado de `size` y recorta lo que sobra, como en la app.
function drawCropped(page: PDFPage, image: PDFImage, box: { x: number; y: number; size: number }) {
  const scale = Math.max(box.size / image.width, box.size / image.height)
  const width = image.width * scale
  const height = image.height * scale
  page.pushOperators(
    pushGraphicsState(),
    rectangle(box.x, box.y, box.size, box.size),
    clip(),
    endPath(),
  )
  page.drawImage(image, {
    x: box.x + (box.size - width) / 2,
    y: box.y + (box.size - height) / 2,
    width,
    height,
  })
  page.pushOperators(popGraphicsState())
}

function signerLine(input: PdfInput, signature: SignatureRow): string {
  const role = ROLE_LABELS[signature.signer_role] ?? signature.signer_role
  const substitute =
    signature.signer_role === 'administrador' && signature.signature_type !== 'ejecucion'
  return `${SIGNATURE_LABELS[signature.signature_type] ?? signature.signature_type} · ${role}${substitute ? ' (suplente)' : ''}`
}

function drawSignatures(c: Canvas, input: PdfInput) {
  const { fonts } = c
  const gap = 20
  const width = (CONTENT_WIDTH - gap * 2) / 3
  const strokeHeight = 42
  const nameStyle = { size: 9, font: fonts.bold }
  const stepStyle = { size: 7.5 }
  // Nombres y pasos completos: el bloque crece con el texto más largo de las tres firmas.
  // El único tope es que el bloque quepa en una página; el nombre completo también está
  // en la hoja de evidencia, cuyas filas continúan en la página siguiente.
  const maxNameLines = Math.floor(
    (PAGE.height - PAGE.margin - BOTTOM - 20 - strokeHeight - 12 - 4 * lineHeight(stepStyle)) /
      lineHeight(nameStyle),
  )
  const texts = SIGNATURE_ORDER.map((type) => {
    const signature = input.signatures.find((row) => row.signature_type === type)
    return {
      signature,
      name: clampLines(
        c.lines(
          signature ? (input.names.get(signature.signer_id) ?? '—') : 'Sin firma',
          width,
          nameStyle,
        ),
        maxNameLines,
      ),
      step: c.lines(
        signature ? signerLine(input, signature) : (SIGNATURE_LABELS[type] ?? type),
        width,
        stepStyle,
      ),
    }
  })
  const textHeight = Math.max(
    ...texts.map(
      (entry) =>
        c.blockHeight(entry.name, nameStyle) +
        c.blockHeight(entry.step, stepStyle) +
        lineHeight(stepStyle),
    ),
  )
  c.ensure(20 + strokeHeight + 12 + textHeight)
  c.y -= c.section('Firmas')
  const top = c.y

  texts.forEach(({ signature, name, step }, index) => {
    const left = PAGE.margin + index * (width + gap)
    if (signature) {
      const bounds = svgPathBounds(signature.stroke_path)
      if (bounds) {
        const placement = fitStroke(bounds, { left, top, width, height: strokeHeight })
        c.page.drawSvgPath(signature.stroke_path, {
          x: placement.x,
          y: placement.y,
          scale: placement.scale,
          borderColor: COLORS.text,
          borderWidth: Math.max(1.1 / placement.scale, 1),
        })
      }
    }
    const lineY = top - strokeHeight - 4
    c.rule(lineY, signature ? COLORS.text : COLORS.strong, 0.8, left, width)
    let y = lineY - 5
    y -= c.drawLines(name, left, y, {
      ...nameStyle,
      color: signature ? COLORS.text : COLORS.muted,
    })
    y -= c.drawLines(step, left, y, { ...stepStyle, color: COLORS.muted })
    if (signature) {
      c.drawLines([toWinAnsi(formatDateTime(signature.signed_at))], left, y, {
        size: 7.5,
        color: COLORS.muted,
      })
    }
  })
  c.y = top - strokeHeight - 12 - textHeight - 8
}

// ---------------------------------------------------------------------------
// Hoja de evidencia
// ---------------------------------------------------------------------------

function drawEvidence(c: Canvas, input: PdfInput, code: string) {
  const { fonts } = c
  const top = c.y
  const caseText = toWinAnsi(`${input.caseNumber} · v${input.versionNumber}`)
  c.page.drawText(caseText, {
    x: PAGE.width - PAGE.margin - fonts.regular.widthOfTextAtSize(caseText, 9),
    y: top - 9,
    size: 9,
    font: fonts.regular,
    color: COLORS.muted,
  })
  c.drawLines(['Hoja de evidencia'], PAGE.margin, top, { size: 18, font: fonts.bold })
  c.y = top - 26
  c.flow(
    'Firma electrónica simple (Decreto 47-2008). Fechas y horas del servidor, en hora de Guatemala. La IP y el dispositivo los registró el servidor.',
    { size: 8.5, color: COLORS.muted },
  )
  c.y -= 6
  c.rule(c.y, COLORS.brand, 2.2)
  c.y -= 14

  // Integridad
  c.y -= c.section('Integridad del contenido')
  drawTable(
    c,
    [
      { title: 'Dato', width: CONTENT_WIDTH * 0.28 },
      { title: 'Valor', width: CONTENT_WIDTH * 0.72 },
    ],
    [
      [{ text: 'Código de verificación' }, { text: code, bold: true }],
      [{ text: 'SHA-256 de la versión firmada' }, { text: input.contentHash, mono: true }],
      [{ text: 'Versión' }, { text: String(input.versionNumber) }],
    ],
  )
  c.y -= 14

  // Firmas
  c.ensure(80)
  c.y -= c.section('Firmas registradas')
  const ordered = [...input.signatures].sort(
    (a, b) =>
      SIGNATURE_ORDER.indexOf(a.signature_type as (typeof SIGNATURE_ORDER)[number]) -
      SIGNATURE_ORDER.indexOf(b.signature_type as (typeof SIGNATURE_ORDER)[number]),
  )
  drawTable(
    c,
    [
      { title: 'Paso', width: CONTENT_WIDTH * 0.16 },
      { title: 'Firmante', width: CONTENT_WIDTH * 0.22 },
      { title: 'Fecha y hora', width: CONTENT_WIDTH * 0.17 },
      { title: 'IP', width: CONTENT_WIDTH * 0.13 },
      { title: 'Dispositivo', width: CONTENT_WIDTH * 0.32, maxLines: 3 },
    ],
    ordered.map((signature) => {
      const substitute =
        signature.signer_role === 'administrador' && signature.signature_type !== 'ejecucion'
      return [
        {
          text: SIGNATURE_LABELS[signature.signature_type] ?? signature.signature_type,
          bold: true,
        },
        {
          text: input.names.get(signature.signer_id) ?? '—',
          muted: `${ROLE_LABELS[signature.signer_role] ?? signature.signer_role}${substitute ? ' · suplente' : ''}`,
        },
        { text: formatDateTime(signature.signed_at) },
        { text: signature.ip_address ?? 'No disponible' },
        { text: signature.user_agent ?? 'No disponible', muted: undefined },
      ]
    }),
    { size: 8 },
  )
  c.y -= 8
  const consents = [...new Set(ordered.map((signature) => signature.consent_text))]
  for (const consent of consents) {
    c.flow(`Cada firmante aceptó: «${consent}»`, { size: 8, color: COLORS.muted })
  }
  c.y -= 4
  for (const signature of ordered) {
    c.flow(
      `Hash de la firma de ${(SIGNATURE_LABELS[signature.signature_type] ?? signature.signature_type).toLowerCase()}: ${signature.signature_hash}`,
      { size: 7, font: fonts.mono, color: COLORS.muted },
    )
  }
  c.y -= 14

  // Historial
  c.ensure(80)
  c.y -= c.section('Historial de la solicitud')
  drawTable(
    c,
    [
      { title: 'Fecha', width: CONTENT_WIDTH * 0.2 },
      { title: 'Persona', width: CONTENT_WIDTH * 0.3 },
      { title: 'Acción', width: CONTENT_WIDTH * 0.5 },
    ],
    input.events.map((event) => [
      { text: formatDateTime(event.created_at) },
      {
        text: input.names.get(event.actor_id) ?? '—',
        muted: ROLE_LABELS[event.actor_role] ?? event.actor_role,
      },
      {
        text: ACTION_LABELS[event.action] ?? event.action,
        muted: event.comment ? `«${event.comment}»` : undefined,
      },
    ]),
    { size: 8 },
  )
  c.y -= 14
  c.flow(`Generado por Nexo Casos el ${formatDateTime(input.generatedAt)}.`, {
    size: 7.5,
    color: COLORS.muted,
  })
}
