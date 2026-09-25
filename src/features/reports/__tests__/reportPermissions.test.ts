import type { Profile } from '@/features/auth/types'
import type { CaseRecord } from '@/features/cases/types'

import { getReportActions } from '../reportPermissions'

const item: CaseRecord = {
  id: 'case',
  caseNumber: 'CAS-2026-00001',
  title: 'Reparación',
  description: 'Equipo averiado',
  categoryId: 'category',
  minAfterPhotos: 0,
  category: 'Equipo',
  requestingAreaId: 'requesting',
  requestingAreaName: 'Ventas',
  targetAreaId: 'technical',
  targetAreaName: 'Mantenimiento',
  location: 'Oficina',
  priority: 'media',
  status: 'en_ejecucion',
  createdBy: 'requester',
  creatorName: 'Solicitante',
  assignedTo: 'tech',
  assigneeName: 'Técnico',
  createdAt: '',
  updatedAt: '',
}

const base: Profile = {
  id: 'tech',
  fullName: 'Técnico',
  avatarUrl: null,
  role: 'tecnico',
  areaId: 'technical',
  areaName: 'Mantenimiento',
  organizationId: 'org',
  organizationName: 'Empresa',
}

test('el técnico asignado edita y envía solo mientras ejecuta', () => {
  expect(getReportActions(item, base, [])).toEqual(['view', 'photos_before', 'edit', 'submit'])
  expect(getReportActions({ ...item, status: 'en_espera' }, base, [])).toEqual([
    'view',
    'photos_before',
    'edit',
  ])
  expect(getReportActions({ ...item, status: 'asignado' }, base, [])).toEqual([
    'view',
    'photos_before',
  ])
})

test('en asignado solo el técnico o jefe técnico puede agregar fotos de antes, no guardar texto', () => {
  const assigned = { ...item, status: 'asignado' as const }
  const chief = { ...base, id: 'chief', role: 'jefe_area' as const }
  const requester = { ...base, id: 'requester', role: 'solicitante' as const, areaId: 'requesting' }
  expect(getReportActions(assigned, chief, [])).toEqual(['view', 'photos_before'])
  expect(getReportActions(assigned, requester, [])).toEqual(['view'])
  expect(getReportActions(assigned, base, [])).not.toContain('edit')
})

test('el jefe técnico distinto del ejecutor valida y devuelve; el ejecutor nunca', () => {
  const chief = { ...base, id: 'chief', role: 'jefe_area' as const }
  const sent = { ...item, status: 'reporte_enviado' as const }
  expect(getReportActions(sent, chief, [{ id: 'chief', areaId: 'technical' }])).toEqual([
    'view',
    'validate',
    'return',
  ])
  expect(getReportActions({ ...sent, assignedTo: 'chief' }, chief, [])).toEqual(['view'])
})

test('administrador suple validación solo si no existe otro jefe técnico', () => {
  const admin = { ...base, id: 'admin', role: 'administrador' as const, areaId: null }
  const sent = { ...item, status: 'reporte_enviado' as const }
  expect(getReportActions(sent, admin, [{ id: 'tech', areaId: 'technical' }])).toContain('validate')
  expect(getReportActions(sent, admin, [{ id: 'chief', areaId: 'technical' }])).toEqual(['view'])
})

test('jefe solicitante aprueba; administrador solo si falta ese jefe', () => {
  const validated = { ...item, status: 'validado' as const }
  const chief = {
    ...base,
    id: 'requesting-chief',
    role: 'jefe_area' as const,
    areaId: 'requesting',
  }
  const admin = { ...base, id: 'admin', role: 'administrador' as const, areaId: null }
  expect(getReportActions(validated, chief, [])).toEqual(['view', 'approve', 'return'])
  expect(getReportActions(validated, admin, [])).toContain('approve')
  expect(getReportActions(validated, admin, [{ id: chief.id, areaId: 'requesting' }])).toEqual([
    'view',
  ])
  expect(getReportActions({ ...item, status: 'aprobado' }, base, [])).toEqual(['view', 'pdf'])
})
