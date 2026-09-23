import { supabase } from '@/services/supabase/client'
import type { AppRole } from '@/features/auth/types'

export interface AccessRequest {
  id: string
  email: string
  fullName: string
  status: 'pendiente' | 'aprobada' | 'rechazada' | 'cancelada'
  createdAt: string
  decisionNote: string | null
}

interface AccessRequestRow {
  id: string
  email: string
  full_name: string
  status: AccessRequest['status']
  created_at: string
  decision_note: string | null
}

export async function listAccessRequests(): Promise<AccessRequest[]> {
  const { data, error } = await supabase
    .from('organization_access_requests')
    .select('id, email, full_name, status, created_at, decision_note')
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw error
  return (data as AccessRequestRow[]).map((row) => ({
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    status: row.status,
    createdAt: row.created_at,
    decisionNote: row.decision_note,
  }))
}

export async function approveAccessRequest(id: string, role: AppRole, areaId: string | null) {
  const { error } = await supabase.rpc('approve_access_request', {
    target_request_id: id,
    new_role: role,
    new_area_id: areaId,
  })
  if (error) throw error
}

export async function rejectAccessRequest(id: string, note: string) {
  const { error } = await supabase.rpc('reject_access_request', {
    target_request_id: id,
    note: note.trim() || null,
  })
  if (error) throw error
}
