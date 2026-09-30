import { CASE_ACTIONS, CASE_STATUSES } from '@/features/cases/types'
import { actionMeta, actionToastMeta, statusMeta } from '@/theme/statusMeta'
import { phaseColors } from '@/theme/tokens'

describe('metadatos visuales', () => {
  it('cubre cada estado con texto, fase e ícono', () => {
    expect(Object.keys(statusMeta).sort()).toEqual([...CASE_STATUSES].sort())
    for (const status of CASE_STATUSES) {
      const meta = statusMeta[status]
      expect(meta.label).toBeTruthy()
      expect(meta.icon).toBeTruthy()
      expect(phaseColors[meta.phase]).toBeDefined()
    }
  })

  it('cubre las acciones de transición y crear', () => {
    for (const action of [...CASE_ACTIONS, 'crear'] as const) {
      const meta = actionMeta[action]
      expect(meta.verb).toBeTruthy()
      expect(meta.icon).toBeTruthy()
      expect(phaseColors[meta.phase]).toBeDefined()
    }
  })

  it('describe con verbos propios las cuatro acciones del reporte', () => {
    expect(
      ['enviar_reporte', 'validar_reporte', 'devolver_reporte', 'aprobar_reporte'].map(
        (action) => actionMeta[action as keyof typeof actionMeta].verb,
      ),
    ).toEqual([
      'firmó y envió el reporte',
      'firmó la validación técnica',
      'devolvió el reporte',
      'firmó la conformidad',
    ])
  })

  it('usa el aviso informativo al cancelar o rechazar una solicitud', () => {
    expect(actionToastMeta.cancelar).toEqual({ message: 'Solicitud cancelada', tone: 'info' })
    expect(actionToastMeta.rechazar).toEqual({ message: 'Solicitud rechazada', tone: 'info' })
  })
})
