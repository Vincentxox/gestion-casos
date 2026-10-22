import {
  formatCurrency,
  formatCaseCardDate,
  formatNumber,
  formatQuetzales,
  formatRelativeDate,
  plural,
} from '../formatters'

test('elige el singular solo para una unidad', () => {
  expect(plural(1, 'solicitud', 'solicitudes')).toBe('solicitud')
  expect(plural(0, 'solicitud', 'solicitudes')).toBe('solicitudes')
  expect(plural(2, 'solicitud', 'solicitudes')).toBe('solicitudes')
})

test('fecha corta de la tarjeta según el día local', () => {
  const today = new Date(2026, 9, 21, 12).getTime()
  expect(formatCaseCardDate(new Date(2026, 9, 21, 9, 40).toISOString(), today)).toBe('9:40')
  expect(formatCaseCardDate(new Date(2026, 9, 20, 18).toISOString(), today)).toBe('Ayer')
  expect(formatCaseCardDate(new Date(2026, 9, 15, 18).toISOString(), today)).toBe('15 oct')
  expect(formatCaseCardDate(new Date(2025, 9, 15, 18).toISOString(), today)).toBe('15 oct 2025')
  expect(formatCaseCardDate('no-date', today)).toBe('Fecha no disponible')
})

test('formatea números y montos de forma consistente', () => {
  expect(formatNumber(1234)).toContain('234')
  expect(formatCurrency(1.5)).toMatch(/1[,.]50/)
  expect(formatQuetzales(10)).toMatch(/Q\s*10[,.]00/)
})

test('muestra tiempo relativo en español', () => {
  const now = new Date('2026-09-23T12:00:00Z').getTime()
  expect(formatRelativeDate('2026-09-23T11:55:00Z', now)).toBe('hace 5 min')
  expect(formatRelativeDate('2026-09-22T12:00:00Z', now)).toBe('ayer')
  expect(formatRelativeDate('mal', now)).toBe('Fecha no disponible')
  expect(formatRelativeDate('2026-09-23T12:00:00Z', now)).toBe('ahora')
  expect(formatRelativeDate('2026-09-23T10:00:00Z', now)).toBe('hace 2 h')
  expect(formatRelativeDate('2026-09-20T12:00:00Z', now)).toBe('hace 3 días')
  expect(formatRelativeDate('2026-08-01T12:00:00Z', now)).toMatch(/2026/)
})
