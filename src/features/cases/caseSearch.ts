import type { CasePriority, CaseStatus } from './types'
import type { ScopeFilter, StatusFilter } from './caseListPresentation'

export const STATUS_GROUPS: Record<Exclude<StatusFilter, 'todos'>, CaseStatus[]> = {
  pendientes: ['solicitado', 'aceptado'],
  en_curso: ['asignado', 'en_ejecucion', 'en_espera', 'reporte_enviado', 'validado'],
  cerradas: ['rechazado', 'cancelado', 'aprobado'],
}

export const ACTIVE_CASE_STATUSES: CaseStatus[] = [
  ...STATUS_GROUPS.pendientes,
  ...STATUS_GROUPS.en_curso,
]

export interface CaseSearchFilters {
  scope: ScopeFilter
  statuses: CaseStatus[] | null
  priority: CasePriority | null
  updatedSince: string | null
  searchText: string | null
  sortPending: boolean
}

export interface CaseStatusCount {
  status: CaseStatus
  total: number
}

export interface CaseListFilterInput {
  status: StatusFilter
  scope: ScopeFilter
  exactStatus: CaseStatus | null
  priority: CasePriority | null
  sinceDays: number | null
  activeOnly: boolean
  searchText: string
  now: number
}

export function buildCaseSearchFilters(input: CaseListFilterInput): CaseSearchFilters {
  let statuses: CaseStatus[] | null = input.exactStatus
    ? [input.exactStatus]
    : input.status === 'todos'
      ? null
      : [...STATUS_GROUPS[input.status]]
  if (input.activeOnly) {
    statuses = statuses
      ? statuses.filter((status) => ACTIVE_CASE_STATUSES.includes(status))
      : [...ACTIVE_CASE_STATUSES]
  }
  if (input.scope === 'por_aceptar' || input.scope === 'sin_asignar') {
    const required = input.scope === 'por_aceptar' ? 'solicitado' : 'aceptado'
    statuses = statuses ? statuses.filter((status) => status === required) : [required]
  }
  return {
    scope: input.scope === 'por_aceptar' || input.scope === 'sin_asignar' ? 'bandeja' : input.scope,
    statuses,
    priority: input.priority,
    updatedSince: input.sinceDays
      ? new Date(input.now - input.sinceDays * 86_400_000).toISOString()
      : null,
    searchText: input.searchText.trim() || null,
    sortPending: input.status === 'pendientes' && !input.exactStatus,
  }
}

export function getCaseSegments(counts: CaseStatusCount[]) {
  const byStatus = new Map(counts.map(({ status, total }) => [status, total]))
  const count = (statuses: CaseStatus[]) =>
    statuses.reduce((sum, status) => sum + (byStatus.get(status) ?? 0), 0)
  return {
    todos: count([
      ...STATUS_GROUPS.pendientes,
      ...STATUS_GROUPS.en_curso,
      ...STATUS_GROUPS.cerradas,
    ]),
    pendientes: count(STATUS_GROUPS.pendientes),
    en_curso: count(STATUS_GROUPS.en_curso),
    cerradas: count(STATUS_GROUPS.cerradas),
  }
}
