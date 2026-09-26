import { signaturePath } from '../signaturePath'

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
