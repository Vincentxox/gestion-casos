import type { Profile } from '@/features/auth/types'
import { getScopeOptions, matchesCaseScope } from '../caseListPresentation'
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
}
const item: CaseRecord = {
  id: 'case',
  caseNumber: 'CAS-2026-00001',
  title: 'Luz',
  description: 'Falla',
  category: 'Electricidad',
  categoryId: 'cat',
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

test('el técnico solo tiene filtros de trabajo y área', () => {
  expect(getScopeOptions(profile, 'tecnica')).toEqual(['mis_trabajos', 'mi_area'])
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
    'en_curso',
  ])
  expect(getScopeOptions({ ...profile, role: 'jefe_area' }, 'solicitante')).toEqual([
    'mi_area',
    'mias',
  ])
  expect(getScopeOptions({ ...profile, role: 'administrador' }, null)).toEqual([
    'todas',
    'por_aceptar',
    'sin_asignar',
  ])
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
