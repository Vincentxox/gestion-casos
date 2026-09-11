import { supabase } from '@/services/supabase/client'

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
  category: string
  location: string
  priority: CaseRecord['priority']
  status: CaseRecord['status']
  created_by: string
  assigned_to: string | null
  created_at: string
  updated_at: string
}

function mapCase(row: CaseRow): CaseRecord {
  return {
    id: row.id,
    caseNumber: row.case_number,
    title: row.title,
    description: row.description,
    category: row.category,
    location: row.location,
    priority: row.priority,
    status: row.status,
    createdBy: row.created_by,
    assignedTo: row.assigned_to,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function listCases(): Promise<CaseRecord[]> {
  const { data, error } = await supabase
    .from('cases')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) throw error
  return (data as CaseRow[]).map(mapCase)
}

export async function createCase(input: CreateCaseInput, userId: string): Promise<CaseRecord> {
  const { data, error } = await supabase
    .from('cases')
    .insert({
      title: input.title.trim(),
      description: input.description.trim(),
      category: input.category.trim(),
      location: input.location.trim(),
      priority: input.priority,
      created_by: userId,
    })
    .select('*')
    .single()

  if (error) throw error
  return mapCase(data as CaseRow)
}

export async function getCase(caseId: string): Promise<CaseRecord> {
  const { data, error } = await supabase.from('cases').select('*').eq('id', caseId).single()
  if (error) throw error
  return mapCase(data as CaseRow)
}

export async function updateCase(caseId: string, input: UpdateCaseInput): Promise<CaseRecord> {
  const { data, error } = await supabase
    .from('cases')
    .update({
      title: input.title.trim(),
      description: input.description.trim(),
      category: input.category.trim(),
      location: input.location.trim(),
      priority: input.priority,
    })
    .eq('id', caseId)
    .select('*')
    .single()

  if (error) throw error
  return mapCase(data as CaseRow)
}

export async function changeCaseStatus(
  caseId: string,
  input: ChangeCaseStatusInput,
): Promise<CaseRecord> {
  const { data, error } = await supabase
    .rpc('change_case_status', {
      target_case_id: caseId,
      requested_status: input.status,
      status_comment: input.comment.trim(),
    })
    .single()

  if (error) throw error
  return mapCase(data as CaseRow)
}

export async function listAssignableProfiles(): Promise<AssignableProfile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, area:areas(name)')
    .order('full_name', { ascending: true })

  if (error) throw error
  return (
    data as unknown as {
      id: string
      full_name: string
      role: AssignableProfile['role']
      area: { name: string } | null
    }[]
  ).map((row) => ({
    id: row.id,
    fullName: row.full_name || 'Usuario sin nombre',
    role: row.role,
    areaName: row.area?.name ?? null,
  }))
}

export async function assignCase(caseId: string, assignedTo: string | null): Promise<CaseRecord> {
  const { data, error } = await supabase
    .from('cases')
    .update({ assigned_to: assignedTo })
    .eq('id', caseId)
    .select('*')
    .single()

  if (error) throw error
  return mapCase(data as CaseRow)
}

export function getStatusLabel(status: CaseStatus) {
  return status === 'en_progreso' ? 'En progreso' : status.charAt(0).toUpperCase() + status.slice(1)
}

export async function listCaseHistory(caseId: string): Promise<CaseStatusHistoryRecord[]> {
  const { data, error } = await supabase
    .from('case_status_history')
    .select('id, previous_status, new_status, changed_by, comment, created_at')
    .eq('case_id', caseId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data.map((row) => ({
    id: row.id as number,
    previousStatus: row.previous_status as CaseStatusHistoryRecord['previousStatus'],
    newStatus: row.new_status as CaseStatusHistoryRecord['newStatus'],
    changedBy: row.changed_by as string,
    comment: row.comment as string | null,
    createdAt: row.created_at as string,
  }))
}
