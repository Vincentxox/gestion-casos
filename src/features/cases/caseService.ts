import { supabase } from '@/services/supabase/client'
import { statusMeta } from '@/theme/statusMeta'

import type {
  AssignableProfile,
  CaseRecord,
  CaseStatus,
  CaseStatusHistoryRecord,
  ChangeCaseStatusInput,
  CreateCaseInput,
  UpdateCaseInput,
} from './types'

interface CaseRow {
  id: string
  case_number: string
  title: string
  description: string
  category_id: string
  category: { name: string } | null
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
  updated_at: string
}

const caseSelection = `id, case_number, title, description, category_id,
  category:categories!cases_category_id_fkey(name),
  requesting_area_id, requesting_area:areas!cases_requesting_area_id_fkey(name),
  target_area_id, target_area:areas!cases_target_area_id_fkey(name),
  location, priority, status, created_by, creator:profiles!cases_created_by_fkey(full_name),
  assigned_to, assignee:profiles!cases_assigned_to_fkey(full_name), created_at, updated_at`

function mapCase(row: CaseRow): CaseRecord {
  return {
    id: row.id,
    caseNumber: row.case_number,
    title: row.title,
    description: row.description,
    categoryId: row.category_id,
    category: row.category?.name ?? 'Tipo no disponible',
    requestingAreaId: row.requesting_area_id,
    requestingAreaName: row.requesting_area?.name ?? 'Área no disponible',
    targetAreaId: row.target_area_id,
    targetAreaName: row.target_area?.name ?? 'Área no disponible',
    location: row.location,
    priority: row.priority,
    status: row.status,
    createdBy: row.created_by,
    creatorName: row.creator?.full_name || 'Usuario sin nombre',
    assignedTo: row.assigned_to,
    assigneeName: row.assignee?.full_name ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function listCases(): Promise<CaseRecord[]> {
  const { data, error } = await supabase
    .from('cases')
    .select(caseSelection)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw error
  return (data as unknown as CaseRow[]).map(mapCase)
}

export async function getCase(caseId: string): Promise<CaseRecord> {
  const { data, error } = await supabase
    .from('cases')
    .select(caseSelection)
    .eq('id', caseId)
    .single()
  if (error) throw error
  return mapCase(data as unknown as CaseRow)
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
  return mapCase(data as unknown as CaseRow)
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
  return mapCase(data as unknown as CaseRow)
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

export async function assignCase(caseId: string, assignedTo: string): Promise<CaseRecord> {
  const { data, error } = await supabase.rpc('transition_case', {
    target_case_id: caseId,
    requested_action: 'asignar',
    new_assignee_id: assignedTo,
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
      'id, action, from_status, to_status, comment, created_at, actor:profiles!case_events_actor_id_fkey(full_name), assignee:profiles!case_events_assignee_id_fkey(full_name)',
    )
    .eq('case_id', caseId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (
    data as unknown as {
      id: number
      action: string
      from_status: CaseStatus | null
      to_status: CaseStatus
      comment: string | null
      created_at: string
      actor: { full_name: string } | null
      assignee: { full_name: string } | null
    }[]
  ).map((row) => ({
    id: row.id,
    action: row.action,
    previousStatus: row.from_status,
    newStatus: row.to_status,
    actorName: row.actor?.full_name || 'Usuario sin nombre',
    assigneeName: row.assignee?.full_name ?? null,
    comment: row.comment,
    createdAt: row.created_at,
  }))
}
