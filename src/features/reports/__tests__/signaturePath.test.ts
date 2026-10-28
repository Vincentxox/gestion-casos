import { svgPathBounds } from '../../../../supabase/functions/_shared/pdfText'

import {
  appendSignatureSegment,
  clampSignaturePoint,
  signaturePath,
  signatureViewBox,
} from '../signaturePath'

test('mantiene el trazo dentro del área visible aunque el dedo salga del recuadro', () => {
  expect(clampSignaturePoint({ x: -12, y: 120 }, 100, 100, 8)).toEqual({ x: 8, y: 92 })
  expect(clampSignaturePoint({ x: 50, y: 40 }, 100, 100, 8)).toEqual({ x: 50, y: 40 })
  expect(clampSignaturePoint({ x: 50, y: 40 }, 10, 10, 8)).toEqual({ x: 5, y: 5 })
})

test('cierra el trazo al salir, no dibuja afuera y abre otro al volver a entrar', () => {
  let strokes = [[{ x: 50, y: 50 }]]
  strokes = appendSignatureSegment(strokes, { x: 50, y: 50 }, { x: 120, y: 70 }, 100, 100, 8)
  strokes = appendSignatureSegment(strokes, { x: 120, y: 70 }, { x: 140, y: 70 }, 100, 100, 8)
  strokes = appendSignatureSegment(strokes, { x: 140, y: 70 }, { x: 80, y: 80 }, 100, 100, 8)

  expect(strokes).toHaveLength(2)
  expect(strokes[0]).toEqual([
    { x: 50, y: 50 },
    { x: 92, y: 62 },
  ])
  expect(strokes[1]?.[0]?.x).toBe(92)
  expect(strokes[1]?.[0]?.y).toBeCloseTo(78)
  expect(strokes[1]?.[1]).toEqual({ x: 80, y: 80 })
  for (const point of strokes.flat()) {
    expect(point.x).toBeGreaterThanOrEqual(8)
    expect(point.x).toBeLessThanOrEqual(92)
    expect(point.y).toBeGreaterThanOrEqual(8)
    expect(point.y).toBeLessThanOrEqual(92)
  }

  const path = signaturePath(strokes, 100, 100)
  expect(path.match(/M /g)).toHaveLength(2)
  expect(path).toMatch(/^M[MLQCZmlqcz0-9 ,.\-]*$/)
  expect(svgPathBounds(path)).toEqual({ minX: 500, minY: 500, maxX: 920, maxY: 800 })
})

test('no une con una línea un gesto nuevo que atraviesa el área desde afuera', () => {
  const strokes = appendSignatureSegment(
    [[{ x: 20, y: 20 }]],
    { x: 120, y: 40 },
    { x: -20, y: 60 },
    100,
    100,
    8,
  )
  expect(strokes).toHaveLength(2)
  expect(strokes[1]?.[0]?.x).toBe(92)
  expect(strokes[1]?.[1]?.x).toBe(8)
})

test('normaliza con escala uniforme y descarta puntos cercanos', () => {
  expect(
    signaturePath(
      [
        [
          { x: 10, y: 10 },
          { x: 10.2, y: 10.2 },
          { x: 100, y: 50 },
        ],
      ],
      200,
      100,
    ),
  ).toBe('M 50 50 L 500 250')
})

test('mantiene las coordenadas entre 0 y 1000', () => {
  expect(
    signaturePath(
      [
        [
          { x: -10, y: 0 },
          { x: 400, y: 300 },
        ],
      ],
      200,
      100,
    ),
  ).toBe('M 0 0 L 1000 1000')
})

test('simplifica un trazo largo y rechaza firma vacía', () => {
  const points = Array.from({ length: 3000 }, (_, index) => ({
    x: (index * 3) % 1000,
    y: index % 2 === 0 ? 0 : 5,
  }))
  const result = signaturePath([points], 1000, 1000)
  expect(result.length).toBeLessThanOrEqual(20000)
  expect(result.split(' L ').length).toBeLessThan(points.length)
  expect(() => signaturePath([], 200, 100)).toThrow('Dibuja tu firma')
  expect(() => signaturePath([[{ x: 2, y: 2 }]], 200, 100)).toThrow('Dibuja tu firma')
})

test('recorta el lienzo de una firma ancha a los límites de su trazo', () => {
  expect(signatureViewBox('M 100 250 L 900 250 L 950 550', 20)).toEqual({
    x: 80,
    y: 230,
    width: 890,
    height: 340,
  })
})

test('recorta un solo trazo y conserva un lienzo válido si falta el trazo', () => {
  expect(signatureViewBox('M 500 500 L 500 800', 20)).toEqual({
    x: 480,
    y: 480,
    width: 41,
    height: 340,
  })
  expect(signatureViewBox('')).toEqual({ x: 0, y: 0, width: 1000, height: 1000 })
})
