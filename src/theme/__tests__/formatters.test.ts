import {
  formatCurrency,
  formatCaseDueDate,
  formatCaseCardDate,
  formatDayLabel,
  formatMoment,
  formatTrackingMoment,
  formatNumber,
  formatQuetzales,
  formatRelativeDate,
  plural,
} from '../formatters'

test('muestra una fecha uniforme sin segundos según el día local', () => {
  const now = new Date(2026, 9, 22, 18, 30)
  expect(formatMoment(new Date(2026, 9, 22, 12, 10, 59), now)).toBe('12:10')
  expect(formatMoment(new Date(2026, 9, 21, 9, 40, 30), now)).toBe('Ayer 09:40')
  expect(formatMoment(new Date(2026, 9, 15, 10, 39), now)).toBe('15 oct · 10:39')
  expect(formatMoment(new Date(2025, 9, 21, 10, 39), now)).toBe('21 oct 2025')
  expect(formatMoment('no-date', now)).toBe('Fecha no disponible')
})

test('seguimiento conserva día relativo y hora, sin segundos', () => {
  const now = new Date(2026, 9, 22, 18, 30)
  expect(formatTrackingMoment(new Date(2026, 9, 22, 7, 35), now)).toBe('Hoy 07:35')
  expect(formatTrackingMoment(new Date(2026, 9, 21, 6, 38), now)).toBe('Ayer 06:38')
  expect(formatTrackingMoment(new Date(2026, 9, 19, 20, 6), now)).toBe('19 oct · 20:06')
})

test('el plazo muestra hora hoy, ayer y mañana, y fecha corta los demás días', () => {
  const now = new Date(2026, 9, 25, 12)
  expect(formatDayLabel(new Date(2026, 9, 26, 16), now)).toBe('Mañana')
  expect(formatCaseDueDate(new Date(2026, 9, 25, 16), now)).toBe('Hoy 16:00')
  expect(formatCaseDueDate(new Date(2026, 9, 24, 9), now)).toBe('Ayer 09:00')
  expect(formatCaseDueDate(new Date(2026, 9, 26, 16), now)).toBe('Mañana 16:00')
  expect(formatCaseDueDate(new Date(2026, 9, 27, 16), now)).toBe('27 oct')
  expect(formatCaseDueDate(new Date(2027, 9, 26, 16), now)).toBe('26 oct 2027')
  expect(formatCaseDueDate('no-date', now)).toBe('Fecha no disponible')
})

test('elige el singular solo para una unidad', () => {
  expect(plural(1, 'solicitud', 'solicitudes')).toBe('solicitud')
  expect(plural(0, 'solicitud', 'solicitudes')).toBe('solicitudes')
  expect(plural(2, 'solicitud', 'solicitudes')).toBe('solicitudes')
})

test('fecha corta de la tarjeta según el día local', () => {
  const today = new Date(2026, 9, 21, 12).getTime()
  expect(formatCaseCardDate(new Date(2026, 9, 21, 9, 40).toISOString(), today)).toBe('9:40')
  expect(formatCaseCardDate(new Date(2026, 9, 20, 18).toISOString(), today)).toBe('Ayer')
  expect(formatCaseCardDate(new Date(2026, 9, 19, 18).toISOString(), today)).toBe('lun')
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
