import type { Profile } from '@/features/auth/types'

import type { CaseAction, CaseRecord } from './types'

export function canEditCase(item: CaseRecord, profile: Profile | null): boolean {
  if (!profile || profile.organizationId === null) return false
  if (['rechazado', 'cancelado', 'aprobado'].includes(item.status)) return false
  return (
    profile.role === 'administrador' ||
    (item.status === 'solicitado' && item.createdBy === profile.id) ||
    (profile.role === 'jefe_area' && profile.areaId === item.targetAreaId)
  )
}

export function getAvailableCaseActions(item: CaseRecord, profile: Profile | null): CaseAction[] {
  if (!profile || profile.organizationId === null) return []
  const isAdmin = profile.role === 'administrador'
  const managesTarget = profile.role === 'jefe_area' && profile.areaId === item.targetAreaId
  const managesRequesting = profile.role === 'jefe_area' && profile.areaId === item.requestingAreaId
  const isAssignee = item.assignedTo === profile.id

  switch (item.status) {
    case 'solicitado': {
      const actions: CaseAction[] = []
      if (managesTarget || isAdmin) actions.push('aceptar', 'rechazar')
      if (item.createdBy === profile.id || managesRequesting || isAdmin) actions.push('cancelar')
      return actions
    }
    case 'aceptado':
      return managesTarget || isAdmin ? ['asignar'] : []
    case 'asignado': {
      const actions: CaseAction[] = []
      if (managesTarget || isAdmin) actions.push('asignar')
      if (isAssignee) actions.push('iniciar')
      return actions
    }
    case 'en_ejecucion':
      return isAssignee || managesTarget ? ['pausar'] : []
    case 'en_espera':
      return isAssignee || managesTarget ? ['reanudar'] : []
    default:
      return []
  }
}
