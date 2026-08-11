import { createCaseSchema } from '../schemas'

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
