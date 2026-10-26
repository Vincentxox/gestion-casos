import type { CasePriority, CaseStatus } from './types'
import type { ScopeFilter } from './caseListPresentation'
import { caseCreatedRangeSchema } from './schemas'

export type CaseListTab = 'abiertas' | 'cerradas' | 'todas'
export type QuickStatusFilter =
  'por_aceptar' | 'sin_asignar' | 'en_ejecucion' | 'en_espera' | 'en_revision'
export type CaseSort = 'recientes' | 'antiguas' | 'vencen_antes' | 'prioridad'

export const OPEN_CASE_STATUSES: CaseStatus[] = [
  'solicitado',
  'aceptado',
  'asignado',
  'en_ejecucion',
  'en_espera',
  'reporte_enviado',
  'validado',
]
export const CLOSED_CASE_STATUSES: CaseStatus[] = ['rechazado', 'cancelado', 'aprobado']
export const ACTIVE_CASE_STATUSES = OPEN_CASE_STATUSES

const QUICK_STATUSES: Record<QuickStatusFilter, CaseStatus[]> = {
  por_aceptar: ['solicitado'],
  sin_asignar: ['aceptado'],
  en_ejecucion: ['en_ejecucion'],
  en_espera: ['en_espera'],
  en_revision: ['reporte_enviado', 'validado'],
}

export interface CaseSearchFilters {
  scope: ScopeFilter
  statuses: CaseStatus[] | null
  priorities: CasePriority[] | null
  createdFrom: string | null
  createdTo: string | null
  overdueOnly: boolean
  unassignedOnly: boolean
  searchText: string | null
  sort: CaseSort
}

export interface CaseStatusCount {
  status: CaseStatus
  total: number
  overdue: number
  unassigned: number
}

export interface CaseListFilterInput {
  tab: CaseListTab
  scope: ScopeFilter
  quickStatus: QuickStatusFilter | null
  exactStatus: CaseStatus | null
  legacyStatuses?: CaseStatus[] | null
  priorities: CasePriority[]
  sinceDays: number | null
  fromDate: string | null
  toDate: string | null
  overdueOnly: boolean
  searchText: string
  sort: CaseSort
  now: number
}

/** Convierte una fecha de calendario local en un límite UTC, sin asumir días de 24 h. */
export function calendarDateBoundary(value: string, nextDay = false): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day)
    return null
  if (nextDay) date.setDate(date.getDate() + 1)
  return date.toISOString()
}

export function validateCreatedRange(
  fromDate: string | null,
  toDate: string | null,
): string | null {
  const from = fromDate ? calendarDateBoundary(fromDate) : null
  const to = toDate ? calendarDateBoundary(toDate, true) : null
  if (fromDate && !from) return 'Escribe una fecha inicial válida (AAAA-MM-DD)'
  if (toDate && !to) return 'Escribe una fecha final válida (AAAA-MM-DD)'
  const result = caseCreatedRangeSchema.safeParse({ createdFrom: from, createdTo: to })
  if (!result.success) return result.error.issues[0]?.message ?? 'Revisa el rango de fechas'
  return null
}

export function buildCaseSearchFilters(input: CaseListFilterInput): CaseSearchFilters {
  let statuses: CaseStatus[] | null =
    input.tab === 'abiertas'
      ? [...OPEN_CASE_STATUSES]
      : input.tab === 'cerradas'
        ? [...CLOSED_CASE_STATUSES]
        : null
  const requiredFilters: CaseStatus[][] = []
  if (input.exactStatus) requiredFilters.push([input.exactStatus])
  if (input.quickStatus) requiredFilters.push(QUICK_STATUSES[input.quickStatus])
  for (const required of requiredFilters)
    statuses = statuses ? statuses.filter((status) => required.includes(status)) : [...required]
  if (input.legacyStatuses)
    statuses = statuses
      ? statuses.filter((status) => input.legacyStatuses?.includes(status))
      : [...input.legacyStatuses]

  return {
    scope: input.scope,
    statuses,
    priorities: input.priorities.length ? [...input.priorities] : null,
    createdFrom: input.fromDate
      ? calendarDateBoundary(input.fromDate)
      : input.sinceDays
        ? new Date(input.now - input.sinceDays * 86_400_000).toISOString()
        : null,
    createdTo: input.toDate ? calendarDateBoundary(input.toDate, true) : null,
    overdueOnly: input.overdueOnly,
    unassignedOnly: input.quickStatus === 'sin_asignar',
    searchText: input.searchText.trim() || null,
    sort: input.sort,
  }
}

export function getCaseSegments(
  counts: CaseStatusCount[],
  quickStatus: QuickStatusFilter | null = null,
  overdueOnly = false,
  exactStatus: CaseStatus | null = null,
  legacyStatuses: CaseStatus[] | null = null,
) {
  const byStatus = new Map(counts.map((row) => [row.status, row]))
  const count = (statuses: CaseStatus[], applyQuickFilter: boolean) =>
    statuses.reduce((sum, status) => {
      if (exactStatus && status !== exactStatus) return sum
      if (legacyStatuses && !legacyStatuses.includes(status)) return sum
      const row = byStatus.get(status)
      if (!row) return sum
      if (!applyQuickFilter) return sum + row.total
      if (quickStatus && !QUICK_STATUSES[quickStatus].includes(status)) return sum
      return (
        sum +
        (quickStatus === 'sin_asignar' ? row.unassigned : overdueOnly ? row.overdue : row.total)
      )
    }, 0)
  return {
    abiertas: count(OPEN_CASE_STATUSES, true),
    cerradas: count(CLOSED_CASE_STATUSES, false),
    todas: count([...OPEN_CASE_STATUSES, ...CLOSED_CASE_STATUSES], true),
  }
}

/** Conteos de accesos rápidos sobre las filas ya filtradas por la RPC. */
export function getQuickFilterCounts(counts: CaseStatusCount[]) {
  const byStatus = new Map(counts.map((row) => [row.status, row]))
  const total = (status: CaseStatus) => byStatus.get(status)?.total ?? 0
  return {
    vencidas: counts.reduce((sum, row) => sum + row.overdue, 0),
    por_aceptar: total('solicitado'),
    sin_asignar: byStatus.get('aceptado')?.unassigned ?? 0,
    en_ejecucion: total('en_ejecucion'),
    en_espera: total('en_espera'),
    en_revision: total('reporte_enviado') + total('validado'),
  }
}
