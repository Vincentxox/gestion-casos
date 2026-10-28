import { supabase } from './client'

/** Names retained by the current company, without exposing a former member's new profile. */
export async function listFormerMemberNames(
  userIds: readonly (string | null | undefined)[],
): Promise<Map<string, string>> {
  const ids = [...new Set(userIds.filter((id): id is string => Boolean(id)))]
  if (!ids.length) return new Map()

  const { data, error } = await supabase
    .from('former_members')
    .select('user_id, full_name')
    .in('user_id', ids)
  if (error) throw error
  return new Map(data.map((row) => [row.user_id, row.full_name]))
}

export function memberDisplayName(
  userId: string | null | undefined,
  activeName: string | null | undefined,
  formerNames: ReadonlyMap<string, string>,
  fallback: string,
): string {
  if (activeName !== null && activeName !== undefined) return activeName.trim() || fallback
  const formerName = userId ? formerNames.get(userId) : undefined
  return formerName === undefined
    ? fallback
    : `${formerName.trim() || 'Usuario sin nombre'} (dado de baja)`
}
