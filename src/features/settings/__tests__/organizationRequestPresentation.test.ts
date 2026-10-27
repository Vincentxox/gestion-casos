import {
  organizationRequestStatusLabel,
  teamSizeLabel,
  formatOrganizationRequestDate,
} from '../organizationRequestPresentation'

test('etiquetas de estado y equipo', () => {
  expect(organizationRequestStatusLabel('pendiente')).toBe('Por revisar')
  expect(organizationRequestStatusLabel('aprobada')).toBe('Aprobada')
  expect(organizationRequestStatusLabel('rechazada')).toBe('Rechazada')
  expect(organizationRequestStatusLabel('cancelada')).toBe('Cancelada')
  expect(teamSizeLabel('6-25')).toBe('6–25 personas')
})

test('fecha corta distingue hoy, ayer y días anteriores', () => {
  const now = new Date('2026-10-26T10:00:00')
  jest.useFakeTimers().setSystemTime(now)
  expect(formatOrganizationRequestDate('2026-10-26T08:30:00').startsWith('Hoy')).toBe(true)
  expect(formatOrganizationRequestDate('2026-10-25T08:30:00').startsWith('Ayer')).toBe(true)
  expect(formatOrganizationRequestDate('2026-10-21T08:30:00', true)).toMatch(/21 oct/)
  jest.useRealTimers()
})
