import type { Profile } from '@/features/auth/types'
import { getPrimaryScopeOptions, getScopeOptions, matchesCaseScope } from '../caseListPresentation'
import type { CaseRecord } from '../types'

const profile: Profile = {
  id: 'tech',
  fullName: 'Técnico',
  avatarUrl: null,
  role: 'tecnico',
  areaId: 'area',
  areaName: 'Mantenimiento',
  organizationId: 'org',
  organizationName: 'Empresa',
  organizationActive: true,
}
const item: CaseRecord = {
  id: 'case',
  caseNumber: 'CAS-2026-00001',
  title: 'Luz',
  description: 'Falla',
  category: 'Electricidad',
  categoryId: 'cat',
  minAfterPhotos: 0,
  requestingAreaId: 'office',
  requestingAreaName: 'Oficina',
  targetAreaId: 'area',
  targetAreaName: 'Mantenimiento',
  location: 'Sala',
  priority: 'alta',
  status: 'aceptado',
  createdBy: 'owner',
  assignedTo: null,
  creatorName: 'Ana',
  assigneeName: null,
  createdAt: '',
  updatedAt: '',
}

test('el técnico puede consultar también todos los casos que RLS le permite ver', () => {
  expect(getScopeOptions(profile, 'tecnica')).toEqual(['mis_trabajos', 'mi_area', 'todas'])
  expect(matchesCaseScope(item, 'mis_trabajos', profile)).toBe(false)
  expect(matchesCaseScope(item, 'mi_area', profile)).toBe(true)
})

test('la bandeja técnica incluye aceptadas sin asignar', () => {
  expect(matchesCaseScope(item, 'bandeja', { ...profile, role: 'jefe_area' })).toBe(true)
  expect(
    matchesCaseScope({ ...item, assignedTo: 'tech' }, 'bandeja', { ...profile, role: 'jefe_area' }),
  ).toBe(false)
})

test('ofrece los alcances adecuados a cada rol', () => {
  expect(getScopeOptions({ ...profile, role: 'solicitante' }, 'solicitante')).toEqual([])
  expect(getScopeOptions({ ...profile, role: 'jefe_area' }, 'tecnica')).toEqual([
    'bandeja',
    'mi_area',
    'todas',
  ])
  expect(getScopeOptions({ ...profile, role: 'jefe_area' }, 'solicitante')).toEqual([
    'mi_area',
    'mias',
    'todas',
  ])
  expect(getScopeOptions({ ...profile, role: 'administrador' }, null)).toEqual(['todas', 'bandeja'])
  expect(getScopeOptions({ ...profile, role: 'auditor' }, null)).toEqual(['todas'])
  expect(
    matchesCaseScope(item, 'bandeja', { ...profile, role: 'administrador', areaId: null }),
  ).toBe(true)
})

test('el selector compacto ofrece dos alcances útiles según el rol', () => {
  expect(getPrimaryScopeOptions({ ...profile, role: 'administrador' }, null)).toEqual(['todas'])
  expect(getPrimaryScopeOptions(profile, 'tecnica')).toEqual(['mis_trabajos', 'mi_area'])
  expect(getPrimaryScopeOptions({ ...profile, role: 'jefe_area' }, 'tecnica')).toEqual([
    'mi_area',
    'todas',
  ])
  expect(getPrimaryScopeOptions({ ...profile, role: 'jefe_area' }, 'solicitante')).toEqual([
    'mi_area',
    'mias',
  ])
  expect(getPrimaryScopeOptions({ ...profile, role: 'solicitante' }, 'solicitante')).toEqual([
    'todas',
    'mias',
  ])
  expect(getPrimaryScopeOptions({ ...profile, role: 'auditor' }, null)).toEqual(['todas'])
})

test('filtra bandeja, autor, estados y asignaciones sin depender de la UI', () => {
  expect(matchesCaseScope(item, 'mias', { ...profile, id: 'owner' })).toBe(true)
  expect(matchesCaseScope(item, 'por_aceptar', profile)).toBe(false)
  expect(matchesCaseScope({ ...item, status: 'solicitado' }, 'por_aceptar', profile)).toBe(true)
  expect(matchesCaseScope(item, 'sin_asignar', profile)).toBe(true)
  expect(matchesCaseScope({ ...item, status: 'en_ejecucion' }, 'en_curso', profile)).toBe(true)
  expect(matchesCaseScope({ ...item, status: 'aprobado' }, 'en_curso', profile)).toBe(false)
  expect(matchesCaseScope(item, 'todas', profile)).toBe(true)
})
