import type { AppRole } from '@/features/auth/types'

export interface ManagedProfile {
  id: string
  fullName: string
  avatarPath?: string | null
  role: AppRole
  areaId: string | null
  areaName: string | null
}
