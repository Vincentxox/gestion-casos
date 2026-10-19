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
// Los valores anteriores siguen aceptándose en enlaces de Inicio ya publicados.
export type StatusFilter = 'todos' | 'pendientes' | 'en_curso' | 'abiertas' | 'todas' | 'cerradas'

export function getScopeOptions(profile: Profile, areaKind: 'solicitante' | 'tecnica' | null) {
  if (profile.role === 'solicitante') return [] as ScopeFilter[]
  // "Todas" incluye también casos firmados o asignados antes de cambiar de área.
  if (profile.role === 'tecnico') return ['mis_trabajos', 'mi_area', 'todas'] as ScopeFilter[]
  if (profile.role === 'jefe_area' && areaKind === 'tecnica')
    return ['bandeja', 'mi_area', 'todas'] as ScopeFilter[]
  if (profile.role === 'jefe_area') return ['mi_area', 'mias', 'todas'] as ScopeFilter[]
  if (profile.role === 'auditor') return ['todas'] as ScopeFilter[]
  return ['todas', 'bandeja'] as ScopeFilter[]
}

/** Los dos alcances principales de la pantalla, sin perder los accesos especiales de Inicio. */
export function getPrimaryScopeOptions(
  profile: Profile,
  areaKind: 'solicitante' | 'tecnica' | null,
): readonly [ScopeFilter] | readonly [ScopeFilter, ScopeFilter] {
  if (profile.role === 'administrador') return ['todas']
  if (profile.role === 'tecnico') return ['mis_trabajos', 'mi_area']
  if (profile.role === 'jefe_area' && areaKind === 'tecnica') return ['mi_area', 'todas']
  if (profile.role === 'jefe_area') return ['mi_area', 'mias']
  if (profile.role === 'auditor') return ['todas']
  return ['todas', 'mias']
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
        (profile.role === 'administrador' || item.targetAreaId === profile.areaId) &&
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
