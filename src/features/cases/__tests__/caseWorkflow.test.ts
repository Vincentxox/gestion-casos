import { getNextWorkflowAction, getWaitingPresentation } from '../caseWorkflow'
import type { CaseStatus } from '../types'

test.each([
  ['solicitado', 'aceptar'],
  ['aceptado', 'asignar'],
  ['asignado', 'iniciar'],
  ['en_ejecucion', 'enviar_reporte'],
  ['en_espera', 'reanudar'],
  ['reporte_enviado', 'validar_reporte'],
  ['validado', 'aprobar_reporte'],
  ['aprobado', null],
  ['rechazado', null],
  ['cancelado', null],
] as [CaseStatus, string | null][])(
  '%s tiene como siguiente acción de flujo %s',
  (status, action) => {
    expect(getNextWorkflowAction(status)).toBe(action)
  },
)

test('el texto de espera usa el nombre de pila del técnico', () => {
  expect(getWaitingPresentation({ status: 'en_ejecucion', assigneeName: 'Luis Pérez' })).toEqual({
    banner: 'Esperando: Luis envía el reporte del trabajo',
    tracking: 'Trabajo en curso · Luis',
  })
})

test('el texto de espera no depende de que haya un técnico asignado', () => {
  expect(getWaitingPresentation({ status: 'solicitado', assigneeName: null })?.banner).toBe(
    'Esperando: el área técnica acepta la solicitud',
  )
  expect(getWaitingPresentation({ status: 'aprobado', assigneeName: null })).toBeNull()
})
