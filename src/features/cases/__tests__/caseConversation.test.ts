import { describeEvent, formatEventMoment } from '../components/CaseConversation'
import { caseProgressStep } from '../components/CaseProgressDots'

const now = new Date(2026, 9, 17, 12, 0)

test('formatEventMoment dice hoy, ayer o la fecha corta', () => {
  expect(formatEventMoment(new Date(2026, 9, 17, 10, 5).toISOString(), now)).toBe('Hoy 10:05')
  expect(formatEventMoment(new Date(2026, 9, 16, 9, 0).toISOString(), now)).toBe('Ayer 09:00')
  expect(formatEventMoment(new Date(2026, 9, 2, 10, 5).toISOString(), now)).toBe('2 oct · 10:05')
  expect(formatEventMoment('no es fecha', now)).toBe('Fecha no disponible')
})

test('describeEvent nombra al técnico al asignar y cae al estado si la acción es desconocida', () => {
  const event = {
    id: 1,
    previousStatus: 'aceptado' as const,
    newStatus: 'asignado' as const,
    action: 'asignar',
    actorName: 'Luis',
    assigneeName: 'Marco Ruiz',
    comment: null,
    createdAt: '2026-10-17T10:00:00Z',
  }
  expect(describeEvent(event)).toMatch(/^Luis .* a Marco Ruiz$/)
  expect(describeEvent({ ...event, action: 'otra' })).toBe('Luis cambió el estado a asignada')
})

test('caseProgressStep ubica cada estado en la línea de seis pasos', () => {
  expect(caseProgressStep('solicitado')).toBe(0)
  expect(caseProgressStep('en_espera')).toBe(3)
  expect(caseProgressStep('validado')).toBe(4)
  expect(caseProgressStep('aprobado')).toBe(5)
})
