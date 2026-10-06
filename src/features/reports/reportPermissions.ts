import type { Profile } from '@/features/auth/types'
import type { CaseRecord } from '@/features/cases/types'

import type { AreaChief } from './types'

export type ReportAction =
  'edit' | 'photos_before' | 'submit' | 'validate' | 'approve' | 'return' | 'view' | 'pdf'

/**
 * `currentSigners`: personas que ya firmaron la versión vigente. Nadie firma dos veces la
 * misma versión; si el jefe solicitante ya firmó, la conformidad la suple un administrador
 * que no haya firmado (`docs/BUSINESS_RULES.md`, 5.6). `null` = todavía no se conocen:
 * no se ofrece aprobar ni devolver.
 */
export function getReportActions(
  item: CaseRecord,
  profile: Profile | null,
  chiefs: AreaChief[],
  signers: readonly string[] | null = [],
): ReportAction[] {
  if (!profile || profile.organizationId === null) return []
  const currentSigners = signers ?? []
  const isAssigned = item.assignedTo === profile.id
  const hasSigned = currentSigners.includes(profile.id)
  const isTechnicalChief = profile.role === 'jefe_area' && profile.areaId === item.targetAreaId
  const isRequestingChief = profile.role === 'jefe_area' && profile.areaId === item.requestingAreaId
  const anotherTechnicalChief = chiefs.some(
    (chief) => chief.areaId === item.targetAreaId && chief.id !== item.assignedTo,
  )
  const requestingChiefAvailable = chiefs.some(
    (chief) => chief.areaId === item.requestingAreaId && !currentSigners.includes(chief.id),
  )
  const technicalSubstitute = profile.role === 'administrador' && !anotherTechnicalChief
  const canGiveConformity =
    signers !== null &&
    !hasSigned &&
    (isRequestingChief || (profile.role === 'administrador' && !requestingChiefAvailable))

  if (item.status === 'aprobado') return ['view', 'pdf']
  if (item.status === 'reporte_enviado') {
    return (isTechnicalChief && !isAssigned) || technicalSubstitute
      ? ['view', 'validate', 'return']
      : ['view']
  }
  if (item.status === 'validado') {
    return canGiveConformity ? ['view', 'approve', 'return'] : ['view']
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
