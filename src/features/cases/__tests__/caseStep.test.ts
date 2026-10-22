import { getCaseStep } from '../caseStep'
import { CASE_STATUSES } from '../types'

test('todos los estados corresponden al hito previsto o no llevan barra', () => {
  expect(CASE_STATUSES.map((status) => [status, getCaseStep(status)])).toEqual([
    ['solicitado', 1],
    ['aceptado', 2],
    ['rechazado', null],
    ['cancelado', null],
    ['asignado', 2],
    ['en_ejecucion', 3],
    ['en_espera', 3],
    ['reporte_enviado', 4],
    ['validado', 4],
    ['aprobado', 5],
  ])
})
