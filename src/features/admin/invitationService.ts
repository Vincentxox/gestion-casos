import { supabase } from '@/services/supabase/client'

import type { AppRole } from '@/features/auth/types'

export interface InvitationRecord {
  id: string
  email: string
  role: AppRole
  areaId: string | null
  acceptedAt: string | null
  revokedAt: string | null
  createdAt: string
}

interface InvitationRow {
  id: string
  email: string
  role: AppRole
  area_id: string | null
  accepted_at: string | null
  revoked_at: string | null
  created_at: string
}

export async function listInvitations(): Promise<InvitationRecord[]> {
  const { data, error } = await supabase
    .from('organization_invitations')
    .select('id, email, role, area_id, accepted_at, revoked_at, created_at')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as InvitationRow[]).map((row) => ({
    id: row.id,
    email: row.email,
    role: row.role,
    areaId: row.area_id,
    acceptedAt: row.accepted_at,
    revokedAt: row.revoked_at,
    createdAt: row.created_at,
  }))
}

export async function createInvitation(input: {
  email: string
  role: AppRole
  areaId: string | null
}) {
  const { error } = await supabase.from('organization_invitations').insert({
    email: input.email.trim().toLowerCase(),
    role: input.role,
    area_id: input.areaId,
  })
  if (error) throw error
}

export async function revokeInvitation(invitationId: string) {
  const { error } = await supabase
    .from('organization_invitations')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', invitationId)
  if (error) throw error
}
