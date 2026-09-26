import type { Profile } from '@/features/auth/types'
import type { CaseRecord } from '@/features/cases/types'

import { canManageCaseUsage } from '../resourcePermissions'

const profile = { id: 'u1', organizationId: 'org', role: 'tecnico', areaId: 'a1' } as Profile
const item = { status: 'en_ejecucion', assignedTo: 'u1', targetAreaId: 'a1' } as CaseRecord

test('solo permite al asignado y al jefe técnico durante ejecución o espera', () => {
  expect(canManageCaseUsage(item, profile)).toBe(true)
  expect(canManageCaseUsage({ ...item, status: 'en_espera' }, profile)).toBe(true)
  expect(canManageCaseUsage({ ...item, status: 'solicitado' }, profile)).toBe(false)
  expect(canManageCaseUsage(item, { ...profile, id: 'u2' })).toBe(false)
  expect(canManageCaseUsage(item, { ...profile, id: 'u2', role: 'jefe_area' })).toBe(true)
  expect(canManageCaseUsage(item, { ...profile, id: 'u2', role: 'administrador' })).toBe(false)
  expect(canManageCaseUsage(item, { ...profile, organizationId: null })).toBe(false)
  expect(canManageCaseUsage(item, null)).toBe(false)
})
