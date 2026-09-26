import {
  orderedReviewDates,
  photoRequirementLabel,
  reviewDateLabel,
  reviewHoursLabel,
  reviewPriorityLabel,
  reviewQuantityLabel,
  reviewResourceKindLabel,
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
