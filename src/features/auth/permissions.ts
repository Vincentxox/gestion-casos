import type { AppRole } from './types'

export const APP_PERMISSIONS = [
  'cases.read',
  'cases.create',
  'cases.update',
  'cases.review',
  'cases.assign',
  'cases.execute',
  'reports.read',
  'audit.read',
  'users.manage',
  'areas.manage',
  'serviceTypes.manage',
  'resources.manage',
] as const

export type AppPermission = (typeof APP_PERMISSIONS)[number]

const ROLE_PERMISSIONS: Record<AppRole, ReadonlySet<AppPermission>> = {
  administrador: new Set(APP_PERMISSIONS),
  auditor: new Set(['cases.read', 'reports.read', 'audit.read']),
  jefe_area: new Set([
    'cases.read',
    'cases.create',
    'cases.update',
    'cases.review',
    'cases.assign',
    'cases.execute',
  ]),
  tecnico: new Set(['cases.read', 'cases.create', 'cases.execute']),
  solicitante: new Set(['cases.read', 'cases.create', 'cases.update']),
}

export function hasPermission(role: AppRole | null | undefined, permission: AppPermission) {
  return role ? ROLE_PERMISSIONS[role].has(permission) : false
}

export function getPermissions(role: AppRole | null | undefined) {
  return role ? Array.from(ROLE_PERMISSIONS[role]) : []
}
