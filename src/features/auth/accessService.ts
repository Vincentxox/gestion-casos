import { supabase } from '@/services/supabase/client'

export interface MyAccessRequest {
  id: string
  organizationName: string
  status: 'pendiente' | 'aprobada' | 'rechazada' | 'cancelada'
  decisionNote: string | null
  createdAt: string
}

interface MyAccessRequestRow {
  id: string
  organization_name: string
  status: MyAccessRequest['status']
  decision_note: string | null
  created_at: string
}

export function normalizeJoinCode(value: string) {
  const clean = value.replace(/[^a-z0-9]/gi, '').toUpperCase()
  return clean.length === 8 ? `${clean.slice(0, 4)}-${clean.slice(4)}` : clean
}

export async function getMyAccessRequest(): Promise<MyAccessRequest | null> {
  const { data, error } = await supabase.rpc('get_my_access_request')
  if (error) throw error
  const row = Array.isArray(data)
    ? (data[0] as MyAccessRequestRow | undefined)
    : (data as MyAccessRequestRow | null)
  return row
    ? {
        id: row.id,
        organizationName: row.organization_name,
        status: row.status,
        decisionNote: row.decision_note,
        createdAt: row.created_at,
      }
    : null
}

export async function requestOrganizationAccess(code: string): Promise<{
  status: 'pendiente' | 'codigo_invalido' | 'demasiados_intentos'
  organizationName: string | null
}> {
  const { data, error } = await supabase.rpc('request_organization_access', {
    access_code: normalizeJoinCode(code),
  })
  if (error) throw error
  const response = data as {
    status: 'pendiente' | 'codigo_invalido' | 'demasiados_intentos'
    organization_name: string | null
  }
  return { status: response.status, organizationName: response.organization_name }
}

export async function cancelMyAccessRequest() {
  const { error } = await supabase.rpc('cancel_my_access_request')
  if (error) throw error
}
