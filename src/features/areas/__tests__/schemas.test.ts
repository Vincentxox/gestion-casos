import { areaSchema } from '../schemas'

describe('areaSchema', () => {
  test('acepta un área válida con descripción', () => {
    expect(
      areaSchema.safeParse({
        name: 'Tecnología',
        description: 'Atiende sistemas y equipos.',
        kind: 'tecnica',
      }).success,
    ).toBe(true)
  })

  test('acepta una descripción vacía', () => {
    expect(
      areaSchema.safeParse({ name: 'Seguridad', description: '', kind: 'solicitante' }).success,
    ).toBe(true)
  })

  test('rechaza nombres demasiado cortos', () => {
    expect(areaSchema.safeParse({ name: 'T', description: '', kind: 'tecnica' }).success).toBe(
      false,
    )
  })

  test('rechaza una descripción de uno o dos caracteres', () => {
    expect(
      areaSchema.safeParse({ name: 'Tecnología', description: 'TI', kind: 'tecnica' }).success,
    ).toBe(false)
  })

  test('normaliza espacios del nombre y descripción', () => {
    const result = areaSchema.parse({
      name: '  Tecnología  ',
      description: '  Sistemas  ',
      kind: 'tecnica',
    })
    expect(result).toEqual({ name: 'Tecnología', description: 'Sistemas', kind: 'tecnica' })
  })
})
