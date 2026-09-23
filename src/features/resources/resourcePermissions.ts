import type { Profile } from '@/features/auth/types'
import type { CaseRecord } from '@/features/cases/types'

export function canManageCaseUsage(item: CaseRecord, profile: Profile | null): boolean {
  if (!profile?.organizationId || !['en_ejecucion', 'en_espera'].includes(item.status)) return false
  return (
    item.assignedTo === profile.id ||
    (profile.role === 'jefe_area' && profile.areaId === item.targetAreaId)
  )
}
