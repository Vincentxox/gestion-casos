import { supabase } from '@/services/supabase/client'

import type { ManagedProfile } from './types'

interface ManagedProfileRow {
  id: string
  full_name: string
  role: ManagedProfile['role']
  area_id: string | null
  area: { name: string } | null
}

export async function listManagedProfiles(): Promise<ManagedProfile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, area_id, area:areas(name)')
    .order('full_name')

  if (error) throw error

  return (data as unknown as ManagedProfileRow[]).map((row) => ({
    id: row.id,
    fullName: row.full_name.trim() || 'Usuario sin nombre',
    role: row.role,
    areaId: row.area_id,
    areaName: row.area?.name ?? null,
  }))
}

export async function setMemberAccess(
  userId: string,
  role: ManagedProfile['role'],
  areaId: string | null,
) {
  const { error } = await supabase.rpc('set_member_access', {
    target_user_id: userId,
    new_area_id: areaId,
    new_role: role,
  })

  if (error) throw error
}
