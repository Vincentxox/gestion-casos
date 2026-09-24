import type { Profile } from '@/features/auth/types'

import { canEditCase, getAvailableCaseActions } from '../casePermissions'
import type { CaseRecord } from '../types'

const profile: Profile = {
  id: 'owner',
  fullName: 'Propietaria',
  avatarUrl: null,
  role: 'solicitante',
  areaId: 'requesting',
  areaName: 'Administración',
  organizationId: 'org',
  organizationName: 'Empresa',
}

const item: CaseRecord = {
  id: 'case',
  caseNumber: 'CAS-2026-00001',
  title: 'Reparación',
  description: 'Falla de equipo',
  categoryId: 'category',
  category: 'Equipos',
  requestingAreaId: 'requesting',
  requestingAreaName: 'Administración',
  targetAreaId: 'technical',
  targetAreaName: 'Tecnología',
  location: 'Oficina',
  priority: 'media',
  status: 'solicitado',
  createdBy: 'owner',
  creatorName: 'Propietaria',
  assignedTo: null,
  assigneeName: null,
  createdAt: '',
  updatedAt: '',
}

test('el creador puede editar y cancelar mientras está solicitado', () => {
  expect(canEditCase(item, profile)).toBe(true)
  expect(getAvailableCaseActions(item, profile)).toEqual(['cancelar'])
})

test('el jefe técnico puede revisar y asignar después de aceptar', () => {
  const chief = { ...profile, id: 'chief', role: 'jefe_area' as const, areaId: 'technical' }
  expect(getAvailableCaseActions(item, chief)).toEqual(['aceptar', 'rechazar'])
  expect(getAvailableCaseActions({ ...item, status: 'aceptado' }, chief)).toEqual(['asignar'])
})

test('el administrador solo cancela una solicitud que creó', () => {
  const admin = { ...profile, id: 'admin', role: 'administrador' as const, areaId: null }
  expect(getAvailableCaseActions(item, admin)).toEqual(['aceptar', 'rechazar'])
  expect(getAvailableCaseActions({ ...item, createdBy: 'admin' }, admin)).toEqual([
    'aceptar',
    'rechazar',
    'cancelar',
  ])
  expect(
    getAvailableCaseActions({ ...item, status: 'en_ejecucion', assignedTo: 'tech' }, admin),
  ).toEqual([])
})

test('solo el asignado inicia y los estados finales no ofrecen acciones', () => {
  const technician = { ...profile, id: 'tech', role: 'tecnico' as const, areaId: 'technical' }
  expect(
    getAvailableCaseActions({ ...item, status: 'asignado', assignedTo: 'tech' }, technician),
  ).toEqual(['iniciar'])
  expect(getAvailableCaseActions({ ...item, status: 'rechazado' }, technician)).toEqual([])
  expect(canEditCase({ ...item, status: 'aprobado' }, technician)).toBe(false)
})

test('el asignado y el jefe técnico pueden pausar o reanudar', () => {
  const technician = { ...profile, id: 'tech', role: 'tecnico' as const, areaId: 'technical' }
  const chief = { ...profile, id: 'chief', role: 'jefe_area' as const, areaId: 'technical' }
  expect(
    getAvailableCaseActions({ ...item, status: 'en_ejecucion', assignedTo: 'tech' }, technician),
  ).toEqual(['pausar'])
  expect(
    getAvailableCaseActions({ ...item, status: 'en_espera', assignedTo: 'tech' }, chief),
  ).toEqual(['reanudar'])
  expect(getAvailableCaseActions({ ...item, status: 'reporte_enviado' }, chief)).toEqual([])
  expect(getAvailableCaseActions(item, null)).toEqual([])
  expect(canEditCase(item, null)).toBe(false)
})
