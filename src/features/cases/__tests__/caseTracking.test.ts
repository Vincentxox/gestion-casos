import { getCaseTrackingSteps } from '../caseTracking'
import type { CaseStatus, CaseStatusHistoryRecord } from '../types'

const states: { status: CaseStatus; current: string | null; done: number }[] = [
  { status: 'solicitado', current: 'Solicitada', done: 0 },
  { status: 'aceptado', current: 'Asignar técnico', done: 2 },
  { status: 'asignado', current: 'En ejecución', done: 3 },
  { status: 'en_ejecucion', current: 'En ejecución', done: 3 },
  { status: 'en_espera', current: 'En ejecución', done: 3 },
  { status: 'reporte_enviado', current: 'Reporte', done: 4 },
  { status: 'validado', current: 'Reporte', done: 4 },
  { status: 'aprobado', current: null, done: 6 },
]

test.each(states)(
  '$status coloca el paso actual y conserva seis pasos',
  ({ status, current, done }) => {
    const steps = getCaseTrackingSteps({ status }, [], 'Pendiente · te toca a ti')
    expect(steps).toHaveLength(6)
    expect(steps.filter((step) => step.state === 'done')).toHaveLength(done)
    expect(steps.find((step) => step.state === 'current')?.label ?? null).toBe(current)
  },
)

test.each(['rechazado', 'cancelado'] as const)('%s termina con icono propio', (status) => {
  const event: CaseStatusHistoryRecord = {
    id: 1,
    action: status === 'rechazado' ? 'rechazar' : 'cancelar',
    previousStatus: 'aceptado',
    newStatus: status,
    actorName: 'Ana',
    assigneeName: null,
    comment: 'Motivo',
    createdAt: '2026-10-19T12:00:00Z',
  }
  const steps = getCaseTrackingSteps({ status }, [event], 'Pendiente')
  expect(steps.at(-1)).toMatchObject({
    state: status === 'cancelado' ? 'cancelled' : 'danger',
    event,
  })
  expect(steps).toHaveLength(4)
  expect(steps.some((step) => step.label === 'Reporte')).toBe(false)
})

test('relaciona cada paso hecho con el evento correspondiente', () => {
  const event: CaseStatusHistoryRecord = {
    id: 2,
    action: 'aceptar',
    previousStatus: 'solicitado',
    newStatus: 'aceptado',
    actorName: 'Jefe',
    assigneeName: null,
    comment: null,
    createdAt: '2026-10-19T12:00:00Z',
  }
  const steps = getCaseTrackingSteps({ status: 'aceptado' }, [event], 'Pendiente')
  expect(steps[1]).toMatchObject({ state: 'done', event })
})
