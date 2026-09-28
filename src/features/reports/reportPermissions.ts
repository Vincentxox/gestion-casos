import type { Profile } from '@/features/auth/types'
import type { CaseRecord } from '@/features/cases/types'

import type { AreaChief } from './types'

export type ReportAction =
  'edit' | 'photos_before' | 'submit' | 'validate' | 'approve' | 'return' | 'view' | 'pdf'

export function getReportActions(
  item: CaseRecord,
  profile: Profile | null,
  chiefs: AreaChief[],
): ReportAction[] {
  if (!profile || profile.organizationId === null) return []
  const isAssigned = item.assignedTo === profile.id
  const isTechnicalChief = profile.role === 'jefe_area' && profile.areaId === item.targetAreaId
  const isRequestingChief = profile.role === 'jefe_area' && profile.areaId === item.requestingAreaId
  const anotherTechnicalChief = chiefs.some(
    (chief) => chief.areaId === item.targetAreaId && chief.id !== item.assignedTo,
  )
  const requestingChief = chiefs.some((chief) => chief.areaId === item.requestingAreaId)
  const technicalSubstitute = profile.role === 'administrador' && !anotherTechnicalChief
  const requestingSubstitute = profile.role === 'administrador' && !requestingChief

  if (item.status === 'aprobado') return ['view', 'pdf']
  if (item.status === 'reporte_enviado') {
    return (isTechnicalChief && !isAssigned) || technicalSubstitute
      ? ['view', 'validate', 'return']
      : ['view']
  }
  if (item.status === 'validado') {
    return isRequestingChief || requestingSubstitute ? ['view', 'approve', 'return'] : ['view']
  }
  if (item.status === 'asignado') {
    return isAssigned || isTechnicalChief ? ['view', 'photos_before'] : ['view']
  }
  if (['en_ejecucion', 'en_espera'].includes(item.status)) {
    const canEdit = isAssigned || isTechnicalChief
    return canEdit
      ? item.status === 'en_ejecucion' && isAssigned
        ? ['view', 'photos_before', 'edit', 'submit']
        : ['view', 'photos_before', 'edit']
      : ['view']
  }
  return []
}
