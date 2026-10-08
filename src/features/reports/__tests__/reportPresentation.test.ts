import {
  orderedReviewDates,
  photoRequirementLabel,
  reviewDateLabel,
  reviewHoursLabel,
  reviewPriorityLabel,
  reviewQuantityLabel,
  reviewResourceKindLabel,
  reportElapsedLabel,
  reportSignatureSteps,
  reportVerificationCode,
} from '../reportPresentation'

test('explica cuando las fotos de después son opcionales', () => {
  expect(photoRequirementLabel(3, 0)).toBe('Fotos de después: 3 (opcional)')
  expect(photoRequirementLabel(1, 2)).toBe('Fotos de después: 1 de 2')
})

test('usa las etiquetas legibles de prioridad, recursos y fechas', () => {
  expect(reviewPriorityLabel('alta')).toBe('Alta')
  expect(reviewResourceKindLabel('material')).toBe('Material')
  expect(reviewResourceKindLabel('herramienta')).toBe('Herramienta')
  expect(reviewResourceKindLabel('mano_de_obra')).toBe('Mano de obra')
  expect(reviewDateLabel('asignada')).toBe('Asignada')
})

test('muestra cantidad con su unidad y horas sin parecer campos de formulario', () => {
  expect(reviewQuantityLabel(1, 'unidad')).toBe('1 unidad')
  expect(reviewQuantityLabel(2, 'm')).toBe('2 m')
  expect(reviewHoursLabel(1.5)).toBe('1.5 h')
  expect(reviewQuantityLabel(null, 'unidad')).toBeNull()
})

test('ordena las fechas del reporte aunque jsonb cambie el orden de las claves', () => {
  expect(
    orderedReviewDates({
      enviada: '5',
      creada: '1',
      iniciada: '4',
      asignada: '3',
      aceptada: '2',
    }).map(([key]) => key),
  ).toEqual(['creada', 'aceptada', 'asignada', 'iniciada', 'enviada'])
})

test('calcula la duración desde creación hasta envío y descarta fechas inválidas', () => {
  expect(reportElapsedLabel('2026-09-24T08:00:00Z', '2026-09-25T12:00:00Z')).toBe(
    'Resuelta en 1 d 4 h',
  )
  expect(reportElapsedLabel('2026-09-24T08:00:00Z', '2026-09-24T09:00:00Z')).toBe('Resuelta en 1 h')
  expect(reportElapsedLabel(null, '2026-09-24T09:00:00Z')).toBeNull()
  expect(reportElapsedLabel('2026-09-25T09:00:00Z', '2026-09-24T09:00:00Z')).toBeNull()
  expect(reportElapsedLabel('invalid', '2026-09-24T09:00:00Z')).toBeNull()
})

test('presenta los tres pasos y marca el turno y las suplencias', () => {
  const signatures = [
    {
      id: 'one',
      versionId: 'version',
      type: 'ejecucion' as const,
      signerId: 'user',
      signerName: 'Ana',
      signerRole: 'tecnico',
      signedAt: '2026-09-24T09:00:00Z',
      consentText: 'Acepto',
      strokePath: 'M 0 0 L 1 1',
    },
    {
      id: 'two',
      versionId: 'version',
      type: 'validacion_tecnica' as const,
      signerId: 'admin',
      signerName: 'Luis',
      signerRole: 'administrador',
      signedAt: '2026-09-24T10:00:00Z',
      consentText: 'Acepto',
      strokePath: 'M 0 0 L 1 1',
    },
  ]
  const steps = reportSignatureSteps(signatures, 'approve')
  expect(steps.map((step) => [Boolean(step.signature), step.isCurrent, step.isSubstitute])).toEqual(
    [
      [true, false, false],
      [true, false, true],
      [false, true, false],
    ],
  )
  expect(reportVerificationCode('abcdef1234567890')).toBe('ABCD-EF12-3456')
})
