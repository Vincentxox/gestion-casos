export interface Point {
  x: number
  y: number
}

interface Bounds {
  left: number
  right: number
  top: number
  bottom: number
}

function signatureBounds(width: number, height: number, inset: number): Bounds {
  const safeWidth = Math.max(0, width)
  const safeHeight = Math.max(0, height)
  const horizontalInset = Math.min(Math.max(0, inset), safeWidth / 2)
  const verticalInset = Math.min(Math.max(0, inset), safeHeight / 2)
  return {
    left: horizontalInset,
    right: safeWidth - horizontalInset,
    top: verticalInset,
    bottom: safeHeight - verticalInset,
  }
}

export function clampSignaturePoint(
  point: Point,
  width: number,
  height: number,
  inset: number,
): Point {
  const bounds = signatureBounds(width, height, inset)
  return {
    x: Math.max(bounds.left, Math.min(bounds.right, point.x)),
    y: Math.max(bounds.top, Math.min(bounds.bottom, point.y)),
  }
}

function inside(point: Point, bounds: Bounds): boolean {
  return (
    point.x >= bounds.left &&
    point.x <= bounds.right &&
    point.y >= bounds.top &&
    point.y <= bounds.bottom
  )
}

function clipSegment(from: Point, to: Point, bounds: Bounds): [Point, Point] | null {
  const dx = to.x - from.x
  const dy = to.y - from.y
  let enter = 0
  let exit = 1
  const sides: [number, number][] = [
    [-dx, from.x - bounds.left],
    [dx, bounds.right - from.x],
    [-dy, from.y - bounds.top],
    [dy, bounds.bottom - from.y],
  ]

  for (const [rate, distance] of sides) {
    if (rate === 0) {
      if (distance < 0) return null
      continue
    }
    const fraction = distance / rate
    if (rate < 0) enter = Math.max(enter, fraction)
    else exit = Math.min(exit, fraction)
    if (enter > exit) return null
  }

  const pointAt = (fraction: number): Point => ({
    x: Math.max(bounds.left, Math.min(bounds.right, from.x + dx * fraction)),
    y: Math.max(bounds.top, Math.min(bounds.bottom, from.y + dy * fraction)),
  })
  return [pointAt(enter), pointAt(exit)]
}

function appendDistinct(stroke: Point[], point: Point): Point[] {
  const last = stroke[stroke.length - 1]
  return last?.x === point.x && last.y === point.y ? stroke : [...stroke, point]
}

export function appendSignatureSegment(
  strokes: Point[][],
  from: Point,
  to: Point,
  width: number,
  height: number,
  inset: number,
): Point[][] {
  if (width <= 0 || height <= 0 || ![from.x, from.y, to.x, to.y].every(Number.isFinite))
    return strokes

  const bounds = signatureBounds(width, height, inset)
  const clipped = clipSegment(from, to, bounds)
  if (!clipped) return strokes

  const [entry, exit] = clipped
  if (inside(from, bounds) && strokes.length) {
    return [...strokes.slice(0, -1), appendDistinct(strokes[strokes.length - 1]!, exit)]
  }
  return [...strokes, appendDistinct([entry], exit)]
}

function serialize(strokes: Point[][], width: number, height: number, threshold: number) {
  const scale = 1000 / Math.max(width, height)
  return strokes
    .map((stroke) => {
      const commands: string[] = []
      let previous: Point | null = null
      for (const point of stroke) {
        const normalized = {
          x: Math.max(0, Math.min(1000, Math.round(point.x * scale))),
          y: Math.max(0, Math.min(1000, Math.round(point.y * scale))),
        }
        if (
          previous &&
          Math.hypot(normalized.x - previous.x, normalized.y - previous.y) < threshold
        )
          continue
        commands.push(`${commands.length === 0 ? 'M' : 'L'} ${normalized.x} ${normalized.y}`)
        previous = normalized
      }
      return commands.join(' ')
    })
    .filter(Boolean)
    .join(' ')
}

export function signaturePath(strokes: Point[][], width: number, height: number) {
  if (width <= 0 || height <= 0) throw new Error('El área de firma no está lista.')
  let path = serialize(strokes, width, height, 3)
  if (path.length > 20000) path = serialize(strokes, width, height, 6)
  if (path.length > 20000) {
    throw new Error('Tu firma es muy extensa. Bórrala y firma de nuevo.')
  }
  if (path.length < 10) throw new Error('Dibuja tu firma antes de continuar')
  return path
}
