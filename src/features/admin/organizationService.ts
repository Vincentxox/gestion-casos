import { supabase } from '@/services/supabase/client'

export interface OrganizationRecord {
  id: string
  name: string
}

export async function getOrganization(organizationId: string): Promise<OrganizationRecord> {
  const { data, error } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('id', organizationId)
    .single()
  if (error) throw error
  return data as OrganizationRecord
}

export async function renameOrganization(organizationId: string, name: string) {
  const { data, error } = await supabase
    .from('organizations')
    .update({ name: name.trim() })
    .eq('id', organizationId)
    .select('id, name')
    .single()
  if (error) throw error
  return data as OrganizationRecord
}

export async function getOrganizationJoinCode(): Promise<string> {
  const { data, error } = await supabase.rpc('get_organization_join_code')
  if (error) throw error
  return data as string
}

export async function regenerateOrganizationJoinCode(): Promise<string> {
  const { data, error } = await supabase.rpc('regenerate_organization_join_code')
  if (error) throw error
  return data as string
}
