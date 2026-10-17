import { supabase } from '@/services/supabase/client'
import { listFormerMemberNames, memberDisplayName } from '@/services/supabase/formerMembers'
import { statusMeta } from '@/theme/statusMeta'
import { CASE_ACTION_NAMES } from './types'

import type {
  AssignableProfile,
  CaseRecord,
  CaseActionPermissions,
  CaseStatus,
  CaseStatusHistoryRecord,
  ChangeCaseStatusInput,
  CreateCaseInput,
  UpdateCaseInput,
} from './types'
import type { CaseSearchFilters, CaseStatusCount } from './caseSearch'
import { caseSearchTextSchema } from './schemas'

// Incluye campos calculados de PostgREST que no aparecen como columnas en database.types.ts.
interface CaseRow {
  id: string
  case_number: string
  title: string
  description: string
  category_id: string
  category: { name: string; min_after_photos: number } | null
  requesting_area_id: string
  requesting_area: { name: string } | null
  target_area_id: string
  target_area: { name: string } | null
  location: string
  priority: CaseRecord['priority']
  status: CaseStatus
  created_by: string
  creator: { full_name: string } | null
  assigned_to: string | null
  assignee: { full_name: string } | null
  created_at: string
  accepted_at: string | null
  assigned_at: string | null
  started_at: string | null
  updated_at: string
  due_at: string | null
  overdue_stage: 'aceptacion' | 'resolucion' | null
}

const caseSelection = `id, case_number, title, description, category_id,
  category:categories!cases_category_id_fkey(name,min_after_photos),
  requesting_area_id, requesting_area:areas!cases_requesting_area_id_fkey(name),
  target_area_id, target_area:areas!cases_target_area_id_fkey(name),
  location, priority, status, created_by, creator:profiles!cases_created_by_fkey(full_name),
  assigned_to, assignee:profiles!cases_assigned_to_fkey(full_name), created_at, accepted_at, assigned_at, started_at, updated_at, due_at, overdue_stage`

function mapCase(row: CaseRow, formerNames: ReadonlyMap<string, string>): CaseRecord {
  return {
    id: row.id,
    caseNumber: row.case_number,
    title: row.title,
    description: row.description,
    categoryId: row.category_id,
    category: row.category?.name ?? 'Tipo no disponible',
    minAfterPhotos: row.category?.min_after_photos ?? 0,
    requestingAreaId: row.requesting_area_id,
    requestingAreaName: row.requesting_area?.name ?? 'Área no disponible',
    targetAreaId: row.target_area_id,
    targetAreaName: row.target_area?.name ?? 'Área no disponible',
    location: row.location,
    priority: row.priority,
    status: row.status,
    createdBy: row.created_by,
    creatorName: memberDisplayName(
      row.created_by,
      row.creator?.full_name,
      formerNames,
      'Usuario sin nombre',
    ),
    assignedTo: row.assigned_to,
    assigneeName: row.assigned_to
      ? memberDisplayName(
          row.assigned_to,
          row.assignee?.full_name,
          formerNames,
          'Usuario sin nombre',
        )
      : null,
    createdAt: row.created_at,
    acceptedAt: row.accepted_at,
    assignedAt: row.assigned_at,
    startedAt: row.started_at,
    updatedAt: row.updated_at,
    dueAt: row.due_at,
    overdueStage: row.overdue_stage,
  }
}

async function mapCases(values: unknown[]): Promise<CaseRecord[]> {
  const rows = values as CaseRow[]
  const missingIds = rows.flatMap((row) => [
    !row.creator ? row.created_by : null,
    !row.assignee ? row.assigned_to : null,
  ])
  const formerNames = await listFormerMemberNames(missingIds)
  return rows.map((row) => mapCase(row, formerNames))
}

export const CASE_PAGE_SIZE = 30

function searchArgs(filters: CaseSearchFilters) {
  return {
    scope: filters.scope,
    statuses: filters.statuses,
    priority_filter: filters.priority,
    updated_since: filters.updatedSince,
    search_text:
      filters.searchText === null ? null : caseSearchTextSchema.parse(filters.searchText),
  }
}

export async function listCases(filters: CaseSearchFilters, page: number): Promise<CaseRecord[]> {
  const from = page * CASE_PAGE_SIZE
  let query = supabase.rpc('search_cases', searchArgs(filters)).select(caseSelection)
  if (filters.sortPending) query = query.order('priority', { ascending: true })
  const { data, error } = await query
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(from, from + CASE_PAGE_SIZE - 1)
  if (error) throw error
  return mapCases(data)
}

export async function countCasesByStatus(filters: CaseSearchFilters): Promise<CaseStatusCount[]> {
  const { data, error } = await supabase.rpc('count_cases_by_status', {
    scope: filters.scope,
    priority_filter: filters.priority,
    updated_since: filters.updatedSince,
    search_text:
      filters.searchText === null ? null : caseSearchTextSchema.parse(filters.searchText),
  })
  if (error) throw error
  return data
}

export async function getCase(caseId: string): Promise<CaseRecord> {
  const { data, error } = await supabase
    .from('cases')
    .select(caseSelection)
    .eq('id', caseId)
    .single()
  if (error) throw error
  return (await mapCases([data]))[0]!
}

export async function getCaseActions(caseId: string): Promise<CaseActionPermissions> {
  const { data, error } = await supabase.rpc('get_case_actions', { target_case_id: caseId })
  if (error) throw error
  const result: CaseActionPermissions = {}
  for (const row of data ?? []) {
    if (!CASE_ACTION_NAMES.some((name) => name === row.action)) continue
    result[row.action as keyof CaseActionPermissions] = {
      allowed: row.allowed,
      reason: row.reason,
    }
  }
  return result
}

export async function sendCaseMessage(caseId: string, message: string): Promise<number> {
  const { data, error } = await supabase.rpc('send_case_message', {
    target_case_id: caseId,
    message: message.trim(),
  })
  if (error) throw error
  return data
}

export async function createCase(input: CreateCaseInput): Promise<CaseRecord> {
  const { data, error } = await supabase
    .from('cases')
    .insert({
      title: input.title.trim(),
      description: input.description.trim(),
      category_id: input.categoryId,
      location: input.location.trim(),
      priority: input.priority,
    })
    .select(caseSelection)
    .single()
  if (error) throw error
  return (await mapCases([data]))[0]!
}

export async function updateCase(caseId: string, input: UpdateCaseInput): Promise<CaseRecord> {
  const { data, error } = await supabase
    .from('cases')
    .update({
      title: input.title.trim(),
      description: input.description.trim(),
      category_id: input.categoryId,
      location: input.location.trim(),
      priority: input.priority,
    })
    .eq('id', caseId)
    .select(caseSelection)
    .single()
  if (error?.code === 'PGRST116') {
    throw new Error('La solicitud ya no se puede editar; actualiza la pantalla')
  }
  if (error) throw error
  return (await mapCases([data]))[0]!
}

export async function changeCaseStatus(
  caseId: string,
  input: ChangeCaseStatusInput,
): Promise<CaseRecord> {
  const { data, error } = await supabase.rpc('transition_case', {
    target_case_id: caseId,
    requested_action: input.action,
    action_comment: input.comment.trim() || null,
  })
  if (error) throw error
  return getCase((data as { id: string }).id)
}

export async function assignCase(
  caseId: string,
  assignedTo: string,
  comment = '',
): Promise<CaseRecord> {
  const { data, error } = await supabase.rpc('transition_case', {
    target_case_id: caseId,
    requested_action: 'asignar',
    new_assignee_id: assignedTo,
    action_comment: comment.trim() || null,
  })
  if (error) throw error
  return getCase((data as { id: string }).id)
}

export async function listAssignableProfiles(targetAreaId: string): Promise<AssignableProfile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, area_id, area:areas(name)')
    .eq('area_id', targetAreaId)
    .in('role', ['tecnico', 'jefe_area'])
    .order('full_name', { ascending: true })
  if (error) throw error
  return (
    data as unknown as {
      id: string
      full_name: string
      role: AssignableProfile['role']
      area_id: string
      area: { name: string } | null
    }[]
  ).map((row) => ({
    id: row.id,
    fullName: row.full_name || 'Usuario sin nombre',
    role: row.role,
    areaId: row.area_id,
    areaName: row.area?.name ?? null,
  }))
}

export function getStatusLabel(status: CaseStatus) {
  return statusMeta[status].label
}

export async function listCaseHistory(caseId: string): Promise<CaseStatusHistoryRecord[]> {
  const { data, error } = await supabase
    .from('case_events')
    .select(
      'id, action, from_status, to_status, comment, created_at, actor_id, assignee_id, actor:profiles!case_events_actor_id_fkey(full_name), assignee:profiles!case_events_assignee_id_fkey(full_name)',
    )
    .eq('case_id', caseId)
    .order('created_at', { ascending: false })
  if (error) throw error
  const formerNames = await listFormerMemberNames(
    data.flatMap((row) => [
      !row.actor ? row.actor_id : null,
      !row.assignee ? row.assignee_id : null,
    ]),
  )
  return data.map((row) => ({
    id: row.id,
    action: row.action,
    actorId: row.actor_id ?? undefined,
    previousStatus: row.from_status,
    newStatus: row.to_status,
    actorName: memberDisplayName(
      row.actor_id,
      row.actor?.full_name,
      formerNames,
      'Usuario sin nombre',
    ),
    assigneeName: row.assignee_id
      ? memberDisplayName(
          row.assignee_id,
          row.assignee?.full_name,
          formerNames,
          'Usuario sin nombre',
        )
      : null,
    comment: row.comment,
    createdAt: row.created_at,
  }))
}
