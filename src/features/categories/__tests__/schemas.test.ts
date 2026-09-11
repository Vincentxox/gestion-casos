import { categorySchema } from '../schemas'

const validAreaId = '00000000-0000-4000-8000-000000000001'

describe('categorySchema', () => {
  test('acepta una categoría relacionada con un área', () => {
    expect(
      categorySchema.safeParse({ areaId: validAreaId, name: 'Conectividad', description: '' })
        .success,
    ).toBe(true)
  })

  test('requiere un identificador de área válido', () => {
    expect(
      categorySchema.safeParse({ areaId: '', name: 'Conectividad', description: '' }).success,
    ).toBe(false)
  })

  test('normaliza el contenido', () => {
    expect(
      categorySchema.parse({
        areaId: validAreaId,
        name: '  Conectividad ',
        description: '  Redes ',
      }),
    ).toEqual({ areaId: validAreaId, name: 'Conectividad', description: 'Redes' })
  })
})
