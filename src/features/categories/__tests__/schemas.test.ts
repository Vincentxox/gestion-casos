import { categorySchema } from '../schemas'

const validAreaId = '00000000-0000-4000-8000-000000000001'

describe('categorySchema', () => {
  test('acepta una categoría relacionada con un área', () => {
    expect(
      categorySchema.safeParse({
        areaId: validAreaId,
        name: 'Conectividad',
        description: '',
        minAfterPhotos: 0,
      }).success,
    ).toBe(true)
  })

  test('requiere un identificador de área válido', () => {
    expect(
      categorySchema.safeParse({
        areaId: '',
        name: 'Conectividad',
        description: '',
        minAfterPhotos: 0,
      }).success,
    ).toBe(false)
  })

  test('normaliza el contenido', () => {
    expect(
      categorySchema.parse({
        areaId: validAreaId,
        name: '  Conectividad ',
        description: '  Redes ',
        minAfterPhotos: 2,
      }),
    ).toEqual({
      areaId: validAreaId,
      name: 'Conectividad',
      description: 'Redes',
      minAfterPhotos: 2,
    })
  })

  test('limita las fotos obligatorias de después a 0–3', () => {
    for (const count of [0, 1, 2, 3]) {
      expect(
        categorySchema.safeParse({
          areaId: validAreaId,
          name: 'Conectividad',
          description: '',
          minAfterPhotos: count,
        }).success,
      ).toBe(true)
    }
    for (const count of [-1, 4, 1.5]) {
      expect(
        categorySchema.safeParse({
          areaId: validAreaId,
          name: 'Conectividad',
          description: '',
          minAfterPhotos: count,
        }).success,
      ).toBe(false)
    }
  })
})
