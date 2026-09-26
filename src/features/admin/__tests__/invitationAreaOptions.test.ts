import type { AreaRecord } from '@/features/areas/types'

import { getInvitationAreas, retainInvitationArea } from '../invitationAreaOptions'

const areas = [
  { id: 'solicitante', kind: 'solicitante', isActive: true },
  { id: 'tecnica', kind: 'tecnica', isActive: true },
  { id: 'inactiva', kind: 'tecnica', isActive: false },
] as AreaRecord[]

test('un técnico solo puede elegir áreas técnicas activas', () => {
  expect(getInvitationAreas(areas, 'tecnico').map((area) => area.id)).toEqual(['tecnica'])
  expect(getInvitationAreas(areas, 'solicitante').map((area) => area.id)).toEqual([
    'solicitante',
    'tecnica',
  ])
})

test('borra la selección si el área deja de ser válida al cambiar de rol', () => {
  expect(retainInvitationArea('solicitante', areas, 'tecnico')).toBeNull()
  expect(retainInvitationArea('tecnica', areas, 'tecnico')).toBe('tecnica')
  expect(retainInvitationArea('inactiva', areas, 'solicitante')).toBeNull()
})
