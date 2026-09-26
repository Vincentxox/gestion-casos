import type { AreaRecord } from '@/features/areas/types'
import type { AppRole } from '@/features/auth/types'

export function getInvitationAreas(areas: AreaRecord[], role: AppRole) {
  return areas.filter((area) => area.isActive && (role !== 'tecnico' || area.kind === 'tecnica'))
}

export function retainInvitationArea(areaId: string | null, areas: AreaRecord[], role: AppRole) {
  return getInvitationAreas(areas, role).some((area) => area.id === areaId) ? areaId : null
}
