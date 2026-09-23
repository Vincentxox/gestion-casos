import type { Profile } from '@/features/auth/types'
import type { ScopeFilter, StatusFilter } from '@/features/cases/caseListPresentation'
import type { CaseRecord, CaseStatus } from '@/features/cases/types'
import type { IconName } from '@/components/ui/Icon'
import type { phaseColors } from '@/theme/tokens'

import type { HomeSummary } from './homeService'

export interface HomeTile {
  label: string
  value: number
  icon: IconName
  phase: keyof typeof phaseColors
  emphasis?: boolean
}

export function getGreeting(hour: number) {
  if (hour < 12) return 'Buenos días'
  if (hour < 18) return 'Buenas tardes'
  return 'Buenas noches'
}

export function getHomeHero(profile: Profile, summary: HomeSummary) {
  if (profile.role === 'auditor') return null
  if (
    (profile.role === 'jefe_area' && summary.area_kind === 'tecnica') ||
    profile.role === 'administrador'
  ) {
    const count = summary.inbox.por_aceptar + summary.inbox.sin_asignar
    return {
      count,
      title: `${count} solicitudes esperan tu decisión`,
      detail: `${summary.inbox.por_aceptar} por aceptar y ${summary.inbox.sin_asignar} por asignar`,
      actionLabel: 'Revisar bandeja',
      target:
        profile.role === 'jefe_area'
          ? { scope: 'bandeja' as const }
          : {
              scope:
                summary.inbox.por_aceptar > 0 ? ('por_aceptar' as const) : ('sin_asignar' as const),
            },
    }
  }
  if (profile.role === 'tecnico') {
    const count =
      summary.mine.trabajos_por_iniciar +
      summary.mine.trabajos_en_ejecucion +
      summary.mine.trabajos_en_espera
    return {
      count,
      title: `Tienes ${count} trabajos asignados`,
      detail: 'Consulta tus tareas y continúa el trabajo',
      actionLabel: 'Ver mis trabajos',
      target: { scope: 'mis_trabajos' as const },
    }
  }
  const count = summary.mine.solicitudes_activas
  return {
    count,
    title: `${count} solicitudes activas`,
    detail: 'Sigue el progreso de tus solicitudes',
    actionLabel: 'Ver solicitudes',
    target: { scope: 'mias' as const, activeOnly: true },
  }
}

export function getHomeRecentCases(
  profile: Profile,
  areaKind: HomeSummary['area_kind'],
  cases: CaseRecord[],
) {
  return cases
    .filter((item) => !['aprobado', 'rechazado', 'cancelado'].includes(item.status))
    .filter((item) => {
      if (profile.role === 'tecnico') return item.assignedTo === profile.id
      if (profile.role === 'administrador' || profile.role === 'auditor') return true
      if (profile.role === 'jefe_area' && areaKind === 'tecnica')
        return item.targetAreaId === profile.areaId
      return (
        item.createdBy === profile.id ||
        (profile.role === 'jefe_area' && item.requestingAreaId === profile.areaId)
      )
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 3)
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
      {
        label: 'Por iniciar',
        value: summary.mine.trabajos_por_iniciar,
        icon: 'play-circle-outline',
        phase: 'curso',
      },
      {
        label: 'En ejecución',
        value: summary.mine.trabajos_en_ejecucion,
        icon: 'construct-outline',
        phase: 'curso',
      },
      {
        label: 'En espera',
        value: summary.mine.trabajos_en_espera,
        icon: 'pause-circle-outline',
        phase: 'detenida',
      },
    ]
  }
  if (profile.role === 'jefe_area' && summary.area_kind === 'tecnica') {
    return [
      {
        label: 'Por aceptar',
        value: summary.inbox.por_aceptar,
        icon: 'file-tray-outline',
        phase: 'nueva',
        emphasis: summary.inbox.por_aceptar > 0,
      },
      {
        label: 'Sin asignar',
        value: summary.inbox.sin_asignar,
        icon: 'person-add-outline',
        phase: 'curso',
        emphasis: summary.inbox.sin_asignar > 0,
      },
      {
        label: 'En espera',
        value: summary.cases.en_espera,
        icon: 'pause-circle-outline',
        phase: 'detenida',
      },
      {
        label: 'Alta prioridad activas',
        value: summary.cases.alta_prioridad_activas,
        icon: 'flag-outline',
        phase: 'rechazada',
      },
    ]
  }
  if (profile.role === 'administrador' || profile.role === 'auditor') {
    return [
      {
        label: 'Por aceptar',
        value: summary.inbox.por_aceptar,
        icon: 'file-tray-outline',
        phase: 'nueva',
      },
      {
        label: 'Sin asignar',
        value: summary.inbox.sin_asignar,
        icon: 'person-add-outline',
        phase: 'curso',
      },
      {
        label: 'En ejecución',
        value: summary.cases.en_ejecucion,
        icon: 'construct-outline',
        phase: 'curso',
      },
      {
        label: 'En espera',
        value: summary.cases.en_espera,
        icon: 'pause-circle-outline',
        phase: 'detenida',
      },
      {
        label: 'Cerradas en 30 días',
        value: summary.cases.cerradas_30_dias,
        icon: 'checkmark-done-outline',
        phase: 'cerrada',
      },
    ]
  }
  return profile.role === 'jefe_area'
    ? [
        {
          label: 'En curso',
          value: summary.mine.solicitudes_activas,
          icon: 'list-outline',
          phase: 'curso',
        },
        {
          label: 'Activas en mi área',
          value: summary.cases.activas,
          icon: 'list-outline',
          phase: 'curso',
        },
      ]
    : [
        {
          label: 'En curso',
          value: summary.mine.solicitudes_activas,
          icon: 'list-outline',
          phase: 'curso',
        },
      ]
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
