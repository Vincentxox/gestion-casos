import { changeCaseStatusSchema, createCaseSchema } from '../schemas'

describe('createCaseSchema', () => {
  const validCase = {
    title: 'Fuga de agua en medidor',
    description: 'Se detectó una fuga constante en el medidor principal.',
    categoryId: '7ca776e5-1cb5-40b8-b12f-a45c32edba7e',
    location: 'Avenida Central 123',
    priority: 'media' as const,
  }

  it('accepts and trims a valid case', () => {
    const result = createCaseSchema.parse({ ...validCase, title: `  ${validCase.title}  ` })
    expect(result.title).toBe(validCase.title)
  })

  it('rejects incomplete case information', () => {
    const result = createCaseSchema.safeParse({
      title: 'Fuga',
      description: 'Corta',
      categoryId: '',
      location: '',
      priority: 'urgente',
    })
    expect(result.success).toBe(false)
  })
})

describe('changeCaseStatusSchema', () => {
  it('accepts and trims a valid action comment', () => {
    const result = changeCaseStatusSchema.parse({
      action: 'pausar',
      comment: '  Se inició la atención del caso.  ',
    })

    expect(result.comment).toBe('Se inició la atención del caso.')
  })

  it('rejects an empty mandatory reason', () => {
    const result = changeCaseStatusSchema.safeParse({ action: 'rechazar', comment: '  ' })
    expect(result.success).toBe(false)
  })

  it.each(['aceptar', 'cancelar', 'reanudar'] as const)(
    'rechaza comentarios cortos opcionales al %s',
    (action) => {
      expect(changeCaseStatusSchema.safeParse({ action, comment: ' ok ' }).success).toBe(false)
      expect(changeCaseStatusSchema.safeParse({ action, comment: '   ' }).success).toBe(true)
      expect(changeCaseStatusSchema.safeParse({ action, comment: ' listo ' }).success).toBe(true)
    },
  )

  it('rechaza comentarios de más de 500 caracteres', () => {
    expect(
      changeCaseStatusSchema.safeParse({ action: 'aceptar', comment: 'a'.repeat(501) }).success,
    ).toBe(false)
  })

  it('rejects an unsupported action', () => {
    const result = changeCaseStatusSchema.safeParse({
      action: 'aprobar',
      comment: 'Este estado no pertenece al flujo.',
    })
    expect(result.success).toBe(false)
  })
})
