import { formatCurrency, formatNumber, formatRelativeDate } from '../formatters'

test('formatea números y montos de forma consistente', () => {
  expect(formatNumber(1234)).toContain('234')
  expect(formatCurrency(1.5)).toMatch(/1[,.]50/)
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
