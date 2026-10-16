import { priorityTargetFormSchema, priorityTargetSchema } from '../schemas'

test.each([
  [1, 1],
  [720, 2160],
  [4, 24],
])('acepta límites válidos: %s / %s', (acceptHours, resolveHours) => {
  expect(priorityTargetSchema.safeParse({ acceptHours, resolveHours }).success).toBe(true)
})

test.each([
  [0, 24],
  [721, 2160],
  [1, 0],
  [1, 2161],
  [1.5, 24],
  [1, 24.5],
  [30, 20],
])('rechaza límites inválidos: %s / %s', (acceptHours, resolveHours) => {
  expect(priorityTargetSchema.safeParse({ acceptHours, resolveHours }).success).toBe(false)
})

test('convierte los textos del formulario y rechaza vacío o texto no numérico', () => {
  expect(priorityTargetFormSchema.parse({ acceptHours: ' 8 ', resolveHours: '72' })).toEqual({
    acceptHours: 8,
    resolveHours: 72,
  })
  expect(priorityTargetFormSchema.safeParse({ acceptHours: '', resolveHours: '72' }).success).toBe(
    false,
  )
  expect(
    priorityTargetFormSchema.safeParse({ acceptHours: '8', resolveHours: 'abc' }).success,
  ).toBe(false)
})

test('el error de orden pertenece al campo resolución', () => {
  const result = priorityTargetFormSchema.safeParse({ acceptHours: '30', resolveHours: '20' })
  expect(result.success).toBe(false)
  if (!result.success) expect(result.error.issues[0]?.path).toEqual(['resolveHours'])
})
