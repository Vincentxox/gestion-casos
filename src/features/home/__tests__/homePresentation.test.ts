import type { Profile } from '@/features/auth/types'
import { getAdminAlerts, getHomeTileTarget, getHomeTiles } from '../homePresentation'
import type { HomeSummary } from '../homeService'

const profile: Profile = {
  id: 'user',
  fullName: 'María Pérez',
  avatarUrl: null,
  role: 'solicitante',
  areaId: 'area',
  areaName: 'Oficina',
  organizationId: 'org',
  organizationName: 'Empresa',
}

const summary: HomeSummary = {
  role: 'solicitante',
  has_area: true,
  area_kind: 'solicitante',
  cases: {
    activas: 5,
    solicitado: 1,
    aceptado: 2,
    asignado: 1,
    en_ejecucion: 2,
    en_espera: 1,
    en_revision: 0,
    cerradas_30_dias: 3,
    alta_prioridad_activas: 1,
  },
  mine: {
    solicitudes_activas: 2,
    trabajos_por_iniciar: 1,
    trabajos_en_ejecucion: 2,
    trabajos_en_espera: 3,
  },
  inbox: { por_aceptar: 4, sin_asignar: 1 },
  admin: null,
}

test('el solicitante ve únicamente sus solicitudes activas', () => {
  expect(getHomeTiles(profile, summary)).toEqual([{ label: 'En curso', value: 2 }])
})

test('el técnico ve sus tres contadores de trabajo', () => {
  expect(getHomeTiles({ ...profile, role: 'tecnico' }, summary).map((tile) => tile.value)).toEqual([
    1, 2, 3,
  ])
})

test('el jefe técnico ve su bandeja y alertas operativas', () => {
  const tiles = getHomeTiles(
    { ...profile, role: 'jefe_area' },
    { ...summary, area_kind: 'tecnica' },
  )
  expect(tiles[0]).toEqual({ label: 'Por aceptar', value: 4, emphasis: true })
  expect(tiles[1]?.label).toBe('Sin asignar')
})

test('el administrador ve problemas configurables', () => {
  const alerts = getAdminAlerts({
    usuarios_sin_area: 2,
    usuarios_sin_nombre: 0,
    solicitudes_acceso_pendientes: 1,
    invitaciones_pendientes: 0,
    tipos_servicio_activos: 0,
    recursos_activos: 2,
    areas_tecnicas_sin_jefe: ['Mantenimiento'],
    areas_tecnicas_sin_tecnico: [],
  })
  expect(alerts.map((alert) => alert.screen)).toEqual([
    'Users',
    'Users',
    'AccessRequests',
    'Categories',
  ])
})

test('cada contador lleva a su filtro de solicitudes', () => {
  expect(getHomeTileTarget({ ...profile, role: 'jefe_area' }, 'Por aceptar')).toEqual({
    scope: 'bandeja',
    exactStatus: 'solicitado',
  })
  expect(getHomeTileTarget({ ...profile, role: 'tecnico' }, 'En espera')).toEqual({
    scope: 'mis_trabajos',
    exactStatus: 'en_espera',
  })
  expect(getHomeTileTarget({ ...profile, role: 'administrador' }, 'Cerradas en 30 días')).toEqual({
    status: 'cerradas',
    sinceDays: 30,
  })
})

test('jefe solicitante y auditor reciben resúmenes diferentes', () => {
  expect(
    getHomeTiles({ ...profile, role: 'jefe_area' }, summary).map((tile) => tile.label),
  ).toEqual(['En curso', 'Activas en mi área'])
  expect(
    getHomeTiles({ ...profile, role: 'auditor' }, summary).map((tile) => tile.label),
  ).toContain('Cerradas en 30 días')
  expect(getHomeTileTarget({ ...profile, role: 'tecnico' }, 'Por iniciar')).toEqual({
    scope: 'mis_trabajos',
    exactStatus: 'asignado',
  })
  expect(
    getHomeTileTarget({ ...profile, role: 'administrador' }, 'Alta prioridad activas'),
  ).toEqual({ scope: 'mi_area', priority: 'alta', activeOnly: true })
})
