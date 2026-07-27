export const APP_ROLES = ['administrador', 'auditor', 'visualizador'] as const

export type AppRole = (typeof APP_ROLES)[number]

export interface Profile {
  id: string
  fullName: string
  avatarUrl: string | null
  role: AppRole
}
