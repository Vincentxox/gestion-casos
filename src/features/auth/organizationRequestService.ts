import { supabase } from '@/services/supabase/client'
import type { Database } from '@/services/supabase/database.types'

export type OrganizationRequestStatus = 'pendiente' | 'aprobada' | 'rechazada' | 'cancelada'
export type TeamSize = '1-5' | '6-25' | '26-75' | '76+'

export interface OrganizationCreationInput {
  organizationName: string
  contactPhone: string
  teamSize: TeamSize
  message: string
}

export interface MyOrganizationCreationRequest {
  id: string
  organizationName: string
  status: OrganizationRequestStatus
  rejectionReason: string | null
  createdAt: string
  reviewedAt: string | null
}

export interface PlatformOrganizationRequest extends MyOrganizationCreationRequest {
  requesterName: string
  email: string
  contactPhone: string | null
  teamSize: TeamSize
  message: string | null
  organizationId: string | null
  reviewedByName: string | null
}

export async function requestOrganizationCreation(input: OrganizationCreationInput) {
  // Los Args generados marcan estos opcionales como string, aunque la RPC admite null.
  const { data, error } = await supabase.rpc('request_organization_creation', {
    organization_name: input.organizationName.trim(),
    contact_phone: input.contactPhone.trim() || null,
    team_size: input.teamSize,
    message: input.message.trim() || null,
  } as unknown as Database['public']['Functions']['request_organization_creation']['Args'])
  if (error) throw error
  return data
}

export async function cancelOrganizationCreationRequest() {
  const { error } = await supabase.rpc('cancel_organization_creation_request')
  if (error) throw error
}

export async function getMyOrganizationCreationRequest(): Promise<MyOrganizationCreationRequest | null> {
  const { data, error } = await supabase.rpc('my_organization_creation_request')
  if (error) throw error
  const row = data?.[0]
  return row
    ? {
        id: row.id,
        organizationName: row.organization_name,
        status: row.status as OrganizationRequestStatus,
        rejectionReason: row.rejection_reason,
        createdAt: row.created_at,
        reviewedAt: row.reviewed_at,
      }
    : null
}

export async function isPlatformAdmin() {
  const { data, error } = await supabase.rpc('is_platform_admin')
  if (error) throw error
  return data === true
}

export async function listOrganizationCreationRequests(
  status: OrganizationRequestStatus,
): Promise<PlatformOrganizationRequest[]> {
  const { data, error } = await supabase.rpc('list_organization_creation_requests', {
    requested_status: status,
  })
  if (error) throw error
  return (data ?? []).map((row) => ({
    id: row.id,
    organizationName: row.organization_name,
    status: row.status as OrganizationRequestStatus,
    rejectionReason: row.rejection_reason,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
    requesterName: row.requester_name,
    email: row.email,
    contactPhone: row.contact_phone,
    teamSize: row.team_size as TeamSize,
    message: row.message,
    organizationId: row.organization_id,
    reviewedByName: row.reviewed_by_name,
  }))
}

export async function reviewOrganizationCreationRequest(input: {
  requestId: string
  approve: boolean
  reason: string | null
}) {
  // La firma SQL acepta null al aprobar; el tipo generado de Args no refleja esa nulabilidad.
  const { data, error } = await supabase.rpc('review_organization_creation_request', {
    request_id: input.requestId,
    approve: input.approve,
    reason: input.reason,
  } as unknown as Database['public']['Functions']['review_organization_creation_request']['Args'])
  if (error) throw error
  return data
}
