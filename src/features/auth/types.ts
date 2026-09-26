import type { IconName } from '@/components/ui/Icon'

export const APP_ROLES = [
  'administrador',
  'jefe_area',
  'tecnico',
  'solicitante',
  'auditor',
] as const

export type AppRole = (typeof APP_ROLES)[number]

export interface Profile {
  id: string
  fullName: string
  avatarUrl: string | null
  role: AppRole
  areaId: string | null
  areaName: string | null
  organizationId: string | null
  organizationName: string | null
}

export const ROLE_LABELS: Record<AppRole, string> = {
  administrador: 'Administrador',
  jefe_area: 'Jefe de área',
  tecnico: 'Técnico',
  solicitante: 'Solicitante',
  auditor: 'Auditor',
}

export const ROLE_ICONS: Record<AppRole, IconName> = {
  administrador: 'shield-half-outline',
  jefe_area: 'ribbon-outline',
  tecnico: 'construct-outline',
  solicitante: 'person-outline',
  auditor: 'eye-outline',
}
