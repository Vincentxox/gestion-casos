import { CASE_ACTIONS, CASE_STATUSES } from '@/features/cases/types'
import { actionMeta, statusMeta } from '@/theme/statusMeta'
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
})
