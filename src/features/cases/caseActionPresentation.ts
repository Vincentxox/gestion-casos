import { actionMeta } from '@/theme/statusMeta'

import type { CaseAction } from './types'

export function getCaseActionMeta(action: CaseAction, assignedTo: string | null) {
  return action === 'asignar' && assignedTo ? actionMeta.reasignar : actionMeta[action]
}

export function getSecondaryActionPresentation(actions: CaseAction[]) {
  if (actions.length === 1 && actions[0]) {
    const action = actions[0]
    return {
      kind: 'direct' as const,
      action,
      variant:
        action === 'rechazar' || action === 'cancelar'
          ? ('danger' as const)
          : ('secondary' as const),
    }
  }

  return { kind: actions.length > 1 ? ('menu' as const) : ('none' as const) }
}
