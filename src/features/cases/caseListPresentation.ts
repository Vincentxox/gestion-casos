import type { Profile } from '@/features/auth/types'
import type { CaseRecord } from './types'

export type ScopeFilter =
  | 'todas'
  | 'mias'
  | 'mis_trabajos'
  | 'mi_area'
  | 'bandeja'
  | 'por_aceptar'
  | 'sin_asignar'
  | 'en_curso'
export type StatusFilter = 'todos' | 'pendientes' | 'en_curso' | 'cerradas'

export function getScopeOptions(profile: Profile, areaKind: 'solicitante' | 'tecnica' | null) {
  if (profile.role === 'solicitante') return [] as ScopeFilter[]
  if (profile.role === 'tecnico') return ['mis_trabajos', 'mi_area'] as ScopeFilter[]
  if (profile.role === 'jefe_area' && areaKind === 'tecnica')
    return ['bandeja', 'mi_area', 'en_curso'] as ScopeFilter[]
  if (profile.role === 'jefe_area') return ['mi_area', 'mias'] as ScopeFilter[]
  return ['todas', 'por_aceptar', 'sin_asignar'] as ScopeFilter[]
}

export function matchesCaseScope(item: CaseRecord, scope: ScopeFilter, profile: Profile) {
  switch (scope) {
    case 'mias':
      return item.createdBy === profile.id
    case 'mis_trabajos':
      return item.assignedTo === profile.id
    case 'mi_area':
      return item.requestingAreaId === profile.areaId || item.targetAreaId === profile.areaId
    case 'bandeja':
      return (
        item.targetAreaId === profile.areaId &&
        (item.status === 'solicitado' || (item.status === 'aceptado' && !item.assignedTo))
      )
    case 'por_aceptar':
      return item.status === 'solicitado'
    case 'sin_asignar':
      return item.status === 'aceptado' && !item.assignedTo
    case 'en_curso':
      return ['asignado', 'en_ejecucion', 'en_espera'].includes(item.status)
    default:
      return true
  }
}
