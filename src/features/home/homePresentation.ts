import type { Profile } from '@/features/auth/types'
import type { ScopeFilter, StatusFilter } from '@/features/cases/caseListPresentation'
import type { CaseStatus } from '@/features/cases/types'

import type { HomeSummary } from './homeService'

export interface HomeTile {
  label: string
  value: number
  emphasis?: boolean
}

export function getHomeTileTarget(
  profile: Profile,
  label: string,
): {
  scope?: ScopeFilter
  status?: StatusFilter
  exactStatus?: CaseStatus
  priority?: 'alta'
  sinceDays?: number
  activeOnly?: boolean
} {
  const chief = profile.role === 'jefe_area'
  if (label === 'Por aceptar')
    return chief
      ? { scope: 'bandeja', exactStatus: 'solicitado' }
      : { scope: 'por_aceptar', exactStatus: 'solicitado' }
  if (label === 'Sin asignar')
    return chief
      ? { scope: 'bandeja', exactStatus: 'aceptado' }
      : { scope: 'sin_asignar', exactStatus: 'aceptado' }
  if (label === 'Por iniciar') return { scope: 'mis_trabajos', exactStatus: 'asignado' }
  if (label === 'En espera')
    return {
      scope: profile.role === 'tecnico' ? 'mis_trabajos' : 'en_curso',
      exactStatus: 'en_espera',
    }
  if (label === 'En ejecución')
    return {
      scope: profile.role === 'tecnico' ? 'mis_trabajos' : 'en_curso',
      exactStatus: 'en_ejecucion',
    }
  if (label === 'Cerradas en 30 días') return { status: 'cerradas', sinceDays: 30 }
  if (label === 'Alta prioridad activas')
    return { scope: 'mi_area', priority: 'alta', activeOnly: true }
  if (label === 'Activas en mi área') return { scope: 'mi_area', activeOnly: true }
  return { scope: 'mias', activeOnly: true }
}

export function getHomeTiles(profile: Profile, summary: HomeSummary): HomeTile[] {
  if (profile.role === 'tecnico') {
    return [
      { label: 'Por iniciar', value: summary.mine.trabajos_por_iniciar },
      { label: 'En ejecución', value: summary.mine.trabajos_en_ejecucion },
      { label: 'En espera', value: summary.mine.trabajos_en_espera },
    ]
  }
  if (profile.role === 'jefe_area' && summary.area_kind === 'tecnica') {
    return [
      {
        label: 'Por aceptar',
        value: summary.inbox.por_aceptar,
        emphasis: summary.inbox.por_aceptar > 0,
      },
      {
        label: 'Sin asignar',
        value: summary.inbox.sin_asignar,
        emphasis: summary.inbox.sin_asignar > 0,
      },
      { label: 'En ejecución', value: summary.cases.en_ejecucion },
      { label: 'En espera', value: summary.cases.en_espera },
      { label: 'Alta prioridad activas', value: summary.cases.alta_prioridad_activas },
    ]
  }
  if (profile.role === 'administrador' || profile.role === 'auditor') {
    return [
      { label: 'Por aceptar', value: summary.inbox.por_aceptar },
      { label: 'Sin asignar', value: summary.inbox.sin_asignar },
      { label: 'En ejecución', value: summary.cases.en_ejecucion },
      { label: 'En espera', value: summary.cases.en_espera },
      { label: 'Cerradas en 30 días', value: summary.cases.cerradas_30_dias },
    ]
  }
  return profile.role === 'jefe_area'
    ? [
        { label: 'En curso', value: summary.mine.solicitudes_activas },
        { label: 'Activas en mi área', value: summary.cases.activas },
      ]
    : [{ label: 'En curso', value: summary.mine.solicitudes_activas }]
}

export function getAdminAlerts(admin: NonNullable<HomeSummary['admin']>) {
  return [
    ...admin.areas_tecnicas_sin_jefe.map((name) => ({
      label: `${name} no tiene jefe de área`,
      screen: 'Users' as const,
    })),
    ...admin.areas_tecnicas_sin_tecnico.map((name) => ({
      label: `${name} no tiene técnicos`,
      screen: 'Users' as const,
    })),
    ...(admin.usuarios_sin_area > 0
      ? [{ label: `${admin.usuarios_sin_area} usuarios sin área`, screen: 'Users' as const }]
      : []),
    ...(admin.usuarios_sin_nombre > 0
      ? [{ label: `${admin.usuarios_sin_nombre} usuarios sin nombre`, screen: 'Users' as const }]
      : []),
    ...(admin.solicitudes_acceso_pendientes > 0
      ? [
          {
            label: `${admin.solicitudes_acceso_pendientes} personas pidieron acceso`,
            screen: 'AccessRequests' as const,
          },
        ]
      : []),
    ...(admin.invitaciones_pendientes > 0
      ? [
          {
            label: `${admin.invitaciones_pendientes} invitaciones pendientes`,
            screen: 'Invitations' as const,
          },
        ]
      : []),
    ...(admin.tipos_servicio_activos === 0
      ? [{ label: 'No hay tipos de servicio activos', screen: 'Categories' as const }]
      : []),
    ...(admin.recursos_activos === 0
      ? [{ label: 'No hay recursos activos', screen: 'Resources' as const }]
      : []),
  ]
}
