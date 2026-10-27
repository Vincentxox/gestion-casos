import {
  organizationCreationSchema,
  organizationRejectionSchema,
} from '../organizationRequestSchemas'

test('valida y recorta la solicitud según C-025', () => {
  expect(
    organizationCreationSchema.safeParse({
      organizationName: ' A ',
      contactPhone: '',
      teamSize: '1-5',
      message: '',
    }).success,
  ).toBe(false)
  expect(
    organizationCreationSchema.safeParse({
      organizationName: 'Empresa',
      contactPhone: '',
      teamSize: undefined,
      message: '',
    }).success,
  ).toBe(false)
  expect(
    organizationCreationSchema.safeParse({
      organizationName: 'Empresa',
      contactPhone: '1'.repeat(31),
      teamSize: '6-25',
      message: '',
    }).success,
  ).toBe(false)
  expect(
    organizationCreationSchema.safeParse({
      organizationName: 'Empresa',
      contactPhone: '',
      teamSize: '6-25',
      message: 'x'.repeat(501),
    }).success,
  ).toBe(false)
  expect(
    organizationCreationSchema.parse({
      organizationName: '  Empresa  ',
      contactPhone: '',
      teamSize: '76+',
      message: '',
    }).organizationName,
  ).toBe('Empresa')
})

test('el rechazo exige entre 3 y 300 caracteres después de recortar', () => {
  expect(organizationRejectionSchema.safeParse({ reason: ' a ' }).success).toBe(false)
  expect(organizationRejectionSchema.safeParse({ reason: 'x'.repeat(301) }).success).toBe(false)
  expect(organizationRejectionSchema.parse({ reason: '  Falta información  ' }).reason).toBe(
    'Falta información',
  )
})
