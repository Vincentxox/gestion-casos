export interface Point {
  x: number
  y: number
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
