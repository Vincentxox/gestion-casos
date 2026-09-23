// Utilidades puras para el PDF del reporte (sin dependencias de Deno ni de pdf-lib).
// Se prueban con `node --experimental-strip-types --test supabase/functions/tests`.

// Las fuentes estándar de PDF usan WinAnsi: cubren el español (tildes, ñ, ¿, ¡) pero no
// otros alfabetos ni emojis. Lo que no se puede representar se reemplaza por «?».
const WIN_ANSI_EXTRA = new Set([
  0x20ac, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021, 0x02c6, 0x2030, 0x0160, 0x2039, 0x0152,
  0x017d, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2013, 0x2014, 0x02dc, 0x2122, 0x0161, 0x203a,
  0x0153, 0x017e, 0x0178,
])

export function toWinAnsi(value: string | null | undefined): string {
  if (!value) return ''
  let result = ''
  for (const char of value.normalize('NFC')) {
    const code = char.codePointAt(0) ?? 0
    if (char === '\t') result += ' '
    else if (char === '\n' || char === '\r') result += char
    else if ((code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff)) result += char
    else if (WIN_ANSI_EXTRA.has(code)) result += char
    else if (code < 0x20) continue
    else result += '?'
  }
  return result.replace(/\r\n?/g, '\n')
}

// Parte un texto en líneas que caben en `maxWidth`. `measure` devuelve el ancho de un
// texto (en pdf-lib, `font.widthOfTextAtSize(texto, tamaño)`). Respeta saltos de línea y
// corta palabras más largas que la línea.
export function wrapText(
  text: string,
  maxWidth: number,
  measure: (value: string) => number,
): string[] {
  const lines: string[] = []
  for (const paragraph of text.split('\n')) {
    const words = paragraph.split(/ +/).filter((word) => word.length > 0)
    if (words.length === 0) {
      lines.push('')
      continue
    }
    let current = ''
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word
      if (measure(candidate) <= maxWidth) {
        current = candidate
        continue
      }
      if (current) lines.push(current)
      if (measure(word) <= maxWidth) {
        current = word
        continue
      }
      let piece = ''
      for (const char of word) {
        if (measure(piece + char) > maxWidth && piece) {
          lines.push(piece)
          piece = char
        } else {
          piece += char
        }
      }
      current = piece
    }
    lines.push(current)
  }
  return lines
}

export interface Bounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

// Límites de un trazo SVG con los comandos que acepta la base de datos (M, L, Q, C, Z,
// absolutos y relativos). Considera los puntos de control, que acotan la curva.
export function svgPathBounds(path: string): Bounds | null {
  const tokens = path.match(/[MLQCZmlqcz]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) ?? []
  const arity: Record<string, number> = { M: 2, L: 2, Q: 4, C: 6, Z: 0 }
  let index = 0
  let command = ''
  let x = 0
  let y = 0
  let startX = 0
  let startY = 0
  let bounds: Bounds | null = null
  const include = (px: number, py: number) => {
    bounds = bounds
      ? {
          minX: Math.min(bounds.minX, px),
          minY: Math.min(bounds.minY, py),
          maxX: Math.max(bounds.maxX, px),
          maxY: Math.max(bounds.maxY, py),
        }
      : { minX: px, minY: py, maxX: px, maxY: py }
  }

  while (index < tokens.length) {
    const token = tokens[index] as string
    if (/[A-Za-z]/.test(token)) {
      command = token
      index += 1
      if (command === 'Z' || command === 'z') {
        x = startX
        y = startY
      }
      continue
    }
    const upper = command.toUpperCase()
    const count = arity[upper]
    if (!count) return bounds
    const values = tokens.slice(index, index + count).map(Number)
    if (values.length < count || values.some((value) => !Number.isFinite(value))) return bounds
    index += count
    const relative = command !== upper
    for (let pair = 0; pair < count; pair += 2) {
      const px = (relative ? x : 0) + (values[pair] as number)
      const py = (relative ? y : 0) + (values[pair + 1] as number)
      include(px, py)
      if (pair === count - 2) {
        x = px
        y = py
      }
    }
    if (upper === 'M') {
      startX = x
      startY = y
      // Tras M, los pares siguientes son L implícitos.
      command = relative ? 'l' : 'L'
    }
  }
  return bounds
}

// Posición y escala para dibujar un trazo dentro de una caja (coordenadas PDF: y hacia
// arriba). `top` es el borde superior de la caja. pdf-lib dibuja el trazo SVG con su
// origen en (x, y) y el eje y hacia abajo.
export function fitStroke(
  bounds: Bounds,
  box: { left: number; top: number; width: number; height: number },
  padding = 4,
): { x: number; y: number; scale: number } {
  const width = Math.max(bounds.maxX - bounds.minX, 1)
  const height = Math.max(bounds.maxY - bounds.minY, 1)
  const scale = Math.min((box.width - padding * 2) / width, (box.height - padding * 2) / height)
  const offsetX = (box.width - width * scale) / 2
  const offsetY = (box.height - height * scale) / 2
  return {
    x: box.left + offsetX - bounds.minX * scale,
    y: box.top - offsetY + bounds.minY * scale,
    scale,
  }
}

export const REPORT_TIME_ZONE = 'America/Guatemala'

export function formatDateTime(value: string | null | undefined, timeZone = REPORT_TIME_ZONE) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('es-GT', {
    timeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

export function verificationCode(contentHash: string): string {
  const code = contentHash.slice(0, 12).toUpperCase()
  return `${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8, 12)}`
}

export const SIGNATURE_LABELS: Record<string, string> = {
  ejecucion: 'Ejecución',
  validacion_tecnica: 'Validación técnica',
  conformidad: 'Conformidad',
}

export const ROLE_LABELS: Record<string, string> = {
  administrador: 'Administrador',
  jefe_area: 'Jefe de área',
  tecnico: 'Técnico',
  solicitante: 'Solicitante',
  auditor: 'Auditor',
}

export const ACTION_LABELS: Record<string, string> = {
  crear: 'Creó la solicitud',
  aceptar: 'Aceptó la solicitud',
  rechazar: 'Rechazó la solicitud',
  cancelar: 'Canceló la solicitud',
  asignar: 'Asignó la solicitud',
  reasignar: 'Reasignó la solicitud',
  iniciar: 'Inició el trabajo',
  pausar: 'Pausó el trabajo',
  reanudar: 'Reanudó el trabajo',
  enviar_reporte: 'Firmó y envió el reporte',
  validar_reporte: 'Firmó la validación técnica',
  devolver_reporte: 'Devolvió el reporte',
  aprobar_reporte: 'Firmó la conformidad',
}

export const PRIORITY_LABELS: Record<string, string> = {
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
}

// Cantidad legible de un registro de recursos del contenido congelado.
export function describeUsage(usage: {
  tipo?: string | null
  cantidad?: number | string | null
  unidad?: string | null
  horas?: number | string | null
}): string {
  const parts: string[] = []
  if (usage.cantidad !== null && usage.cantidad !== undefined && usage.cantidad !== '') {
    parts.push(`${Number(usage.cantidad).toLocaleString('es-GT')} ${usage.unidad ?? ''}`.trim())
  }
  if (usage.horas !== null && usage.horas !== undefined && usage.horas !== '') {
    parts.push(`${Number(usage.horas).toLocaleString('es-GT')} h`)
  }
  return parts.join(' · ') || '—'
}
