import { getReportRequirements, reportDraftSchema, returnReportSchema } from '../schemas'

test('borrador admite campos incompletos pero respeta máximos', () => {
  expect(
    reportDraftSchema.safeParse({ diagnosis: '', workDone: '', cause: '', observations: '' })
      .success,
  ).toBe(true)
  expect(
    reportDraftSchema.safeParse({
      diagnosis: 'a'.repeat(2001),
      workDone: '',
      cause: '',
      observations: '',
    }).success,
  ).toBe(false)
})

test('al enviar exige textos y el mínimo de fotos confirmado', () => {
  expect(getReportRequirements('corto', 'trabajo suficiente', 1, 2)).toEqual([
    'Completa el diagnóstico (mínimo 10 caracteres)',
    'Falta 1 foto de después',
  ])
  expect(getReportRequirements('diagnóstico suficiente', 'trabajo suficiente', 2, 2)).toEqual([])
})

test('motivo de devolución entre 3 y 500 caracteres', () => {
  expect(returnReportSchema.safeParse({ reason: 'ab' }).success).toBe(false)
  expect(returnReportSchema.safeParse({ reason: 'Falta una foto' }).success).toBe(true)
  expect(returnReportSchema.safeParse({ reason: 'a'.repeat(501) }).success).toBe(false)
})
