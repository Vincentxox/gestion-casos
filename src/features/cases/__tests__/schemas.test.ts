import { changeCaseStatusSchema, createCaseSchema } from '../schemas'

describe('createCaseSchema', () => {
  const validCase = {
    title: 'Fuga de agua en medidor',
    description: 'Se detectó una fuga constante en el medidor principal.',
    category: 'Agua potable',
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
      category: '',
      location: '',
      priority: 'urgente',
    })
    expect(result.success).toBe(false)
  })
})

describe('changeCaseStatusSchema', () => {
  it('accepts and trims a valid status comment', () => {
    const result = changeCaseStatusSchema.parse({
      status: 'en_progreso',
      comment: '  Se inició la atención del caso.  ',
    })

    expect(result.comment).toBe('Se inició la atención del caso.')
  })

  it('rejects an empty status comment', () => {
    const result = changeCaseStatusSchema.safeParse({ status: 'cerrado', comment: '  ' })
    expect(result.success).toBe(false)
  })

  it('rejects an unsupported status', () => {
    const result = changeCaseStatusSchema.safeParse({
      status: 'cancelado',
      comment: 'Este estado no pertenece al flujo.',
    })
    expect(result.success).toBe(false)
  })
})
