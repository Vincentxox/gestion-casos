import type { Profile } from '@/features/auth/types'
import type { ScopeFilter, StatusFilter } from '@/features/cases/caseListPresentation'
import type { CaseRecord, CaseStatus } from '@/features/cases/types'
import type { IconName } from '@/components/ui/Icon'
import type { phaseColors } from '@/theme/tokens'
import { plural } from '@/theme/formatters'

import type { HomeSummary } from './homeService'

export interface HomeTile {
  id:
    | 'reportes_por_validar'
    | 'reportes_por_aprobar'
    | 'por_aceptar'
    | 'sin_asignar'
    | 'por_iniciar'
    | 'en_ejecucion'
    | 'en_espera'
    | 'cerradas_30_dias'
    | 'alta_prioridad'
    | 'activas_mi_area'
    | 'en_curso'
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
  const reportsToValidate = summary.inbox.reportes_por_validar
  const reportsToApprove = summary.inbox.reportes_por_aprobar
  if (
    (profile.role === 'jefe_area' && summary.area_kind === 'tecnica') ||
    profile.role === 'administrador' ||
    (profile.role === 'jefe_area' && reportsToValidate + reportsToApprove > 0)
  ) {
    const count =
      reportsToValidate + reportsToApprove + summary.inbox.por_aceptar + summary.inbox.sin_asignar
    const detail = [
      reportsToValidate > 0
        ? {
            id: 'reportes_por_validar' as const,
            label: `${reportsToValidate} ${plural(reportsToValidate, 'reporte por validar', 'reportes por validar')}`,
          }
        : null,
      reportsToApprove > 0
        ? {
            id: 'reportes_por_aprobar' as const,
            label: `${reportsToApprove} ${plural(reportsToApprove, 'reporte por aprobar', 'reportes por aprobar')}`,
          }
        : null,
      summary.inbox.por_aceptar > 0
        ? { id: 'por_aceptar' as const, label: `${summary.inbox.por_aceptar} por aceptar` }
        : null,
      summary.inbox.sin_asignar > 0
        ? { id: 'sin_asignar' as const, label: `${summary.inbox.sin_asignar} por asignar` }
        : null,
    ].filter((part): part is NonNullable<typeof part> => part !== null)
    return {
      count,
      eyebrow: 'TU BANDEJA',
      title: `${count} ${plural(count, 'pendiente requiere', 'pendientes requieren')} tu decisión`,
      detail,
      supportingText: null,
      actionLabel: 'Revisar bandeja',
      target: detail[0]
        ? getHomeTileTarget(profile, detail[0].id)
        : profile.role === 'jefe_area'
          ? { scope: 'bandeja' as const }
          : { scope: 'todas' as const },
    }
  }
  if (profile.role === 'tecnico') {
    const count =
      summary.mine.trabajos_por_iniciar +
      summary.mine.trabajos_en_ejecucion +
      summary.mine.trabajos_en_espera
    return {
      count,
      eyebrow: 'TUS TRABAJOS',
      title: `Tienes ${count} ${plural(count, 'trabajo asignado', 'trabajos asignados')}`,
      detail: [],
      supportingText: 'Consulta tus tareas y continúa el trabajo',
      actionLabel: 'Ver mis trabajos',
      target: { scope: 'mis_trabajos' as const },
    }
  }
  const count = summary.mine.solicitudes_activas
  return {
    count,
    eyebrow: 'TUS SOLICITUDES',
    title: `${count} ${plural(count, 'solicitud activa', 'solicitudes activas')}`,
    detail: [],
    supportingText: 'Sigue el progreso de tus solicitudes',
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
  id: HomeTile['id'],
): {
  scope?: ScopeFilter
  status?: StatusFilter
  exactStatus?: CaseStatus
  priority?: 'alta'
  sinceDays?: number
  activeOnly?: boolean
} {
  const chief = profile.role === 'jefe_area'
  if (id === 'reportes_por_validar' || id === 'reportes_por_aprobar')
    return {
      scope: chief ? 'mi_area' : 'todas',
      exactStatus: id === 'reportes_por_validar' ? 'reporte_enviado' : 'validado',
    }
  if (id === 'por_aceptar')
    return chief
      ? { scope: 'bandeja', exactStatus: 'solicitado' }
      : { scope: 'por_aceptar', exactStatus: 'solicitado' }
  if (id === 'sin_asignar')
    return chief
      ? { scope: 'bandeja', exactStatus: 'aceptado' }
      : { scope: 'sin_asignar', exactStatus: 'aceptado' }
  if (id === 'por_iniciar') return { scope: 'mis_trabajos', exactStatus: 'asignado' }
  if (id === 'en_espera')
    return {
      scope:
        profile.role === 'tecnico'
          ? 'mis_trabajos'
          : profile.role === 'jefe_area'
            ? 'mi_area'
            : 'todas',
      exactStatus: 'en_espera',
    }
  if (id === 'en_ejecucion')
    return {
      scope:
        profile.role === 'tecnico'
          ? 'mis_trabajos'
          : profile.role === 'jefe_area'
            ? 'mi_area'
            : 'todas',
      exactStatus: 'en_ejecucion',
    }
  if (id === 'cerradas_30_dias') return { status: 'cerradas', sinceDays: 30 }
  if (id === 'alta_prioridad') return { scope: 'mi_area', priority: 'alta', activeOnly: true }
  if (id === 'activas_mi_area') return { scope: 'mi_area', activeOnly: true }
  return { scope: 'mias', activeOnly: true }
}

export function getHomeTiles(profile: Profile, summary: HomeSummary): HomeTile[] {
  const reportTiles: HomeTile[] =
    profile.role === 'jefe_area' || profile.role === 'administrador'
      ? [
          ...(summary.inbox.reportes_por_validar > 0
            ? [
                {
                  id: 'reportes_por_validar' as const,
                  label: 'Por validar',
                  value: summary.inbox.reportes_por_validar,
                  icon: 'document-text-outline' as const,
                  phase: 'revision' as const,
                  emphasis: true,
                },
              ]
            : []),
          ...(summary.inbox.reportes_por_aprobar > 0
            ? [
                {
                  id: 'reportes_por_aprobar' as const,
                  label: 'Por aprobar',
                  value: summary.inbox.reportes_por_aprobar,
                  icon: 'checkmark-circle-outline' as const,
                  phase: 'revision' as const,
                  emphasis: true,
                },
              ]
            : []),
        ]
      : []
  if (profile.role === 'tecnico') {
    return [
      {
        id: 'por_iniciar',
        label: 'Por iniciar',
        value: summary.mine.trabajos_por_iniciar,
        icon: 'play-circle-outline',
        phase: 'curso',
      },
      {
        id: 'en_ejecucion',
        label: 'En ejecución',
        value: summary.mine.trabajos_en_ejecucion,
        icon: 'construct-outline',
        phase: 'curso',
      },
      {
        id: 'en_espera',
        label: 'En espera',
        value: summary.mine.trabajos_en_espera,
        icon: 'pause-circle-outline',
        phase: 'detenida',
      },
    ]
  }
  if (profile.role === 'jefe_area' && summary.area_kind === 'tecnica') {
    return [
      ...reportTiles,
      {
        id: 'por_aceptar',
        label: 'Por aceptar',
        value: summary.inbox.por_aceptar,
        icon: 'file-tray-outline',
        phase: 'nueva',
        emphasis: summary.inbox.por_aceptar > 0,
      },
      {
        id: 'sin_asignar',
        label: 'Sin asignar',
        value: summary.inbox.sin_asignar,
        icon: 'person-add-outline',
        phase: 'curso',
        emphasis: summary.inbox.sin_asignar > 0,
      },
      {
        id: 'en_espera',
        label: 'En espera',
        value: summary.cases.en_espera,
        icon: 'pause-circle-outline',
        phase: 'detenida',
      },
      {
        id: 'alta_prioridad',
        label: 'Alta prioridad activas',
        value: summary.cases.alta_prioridad_activas,
        icon: 'flag-outline',
        phase: 'rechazada',
      },
    ]
  }
  if (profile.role === 'administrador' || profile.role === 'auditor') {
    return [
      ...reportTiles,
      {
        id: 'por_aceptar',
        label: 'Por aceptar',
        value: summary.inbox.por_aceptar,
        icon: 'file-tray-outline',
        phase: 'nueva',
      },
      {
        id: 'sin_asignar',
        label: 'Sin asignar',
        value: summary.inbox.sin_asignar,
        icon: 'person-add-outline',
        phase: 'curso',
      },
      {
        id: 'en_ejecucion',
        label: 'En ejecución',
        value: summary.cases.en_ejecucion,
        icon: 'construct-outline',
        phase: 'curso',
      },
      {
        id: 'en_espera',
        label: 'En espera',
        value: summary.cases.en_espera,
        icon: 'pause-circle-outline',
        phase: 'detenida',
      },
      {
        id: 'cerradas_30_dias',
        label: 'Cerradas en 30 días',
        value: summary.cases.cerradas_30_dias,
        icon: 'checkmark-done-outline',
        phase: 'cerrada',
      },
    ]
  }
  return profile.role === 'jefe_area'
    ? [
        ...reportTiles,
        {
          id: 'en_curso',
          label: 'En curso',
          value: summary.mine.solicitudes_activas,
          icon: 'list-outline',
          phase: 'curso',
        },
        {
          id: 'activas_mi_area',
          label: 'Activas en mi área',
          value: summary.cases.activas,
          icon: 'list-outline',
          phase: 'curso',
        },
      ]
    : [
        {
          id: 'en_curso',
          label: 'En curso',
          value: summary.mine.solicitudes_activas,
          icon: 'list-outline',
          phase: 'curso',
        },
      ]
}

export function getAdminAlerts(admin: NonNullable<HomeSummary['admin']>) {
  return [
    ...(admin.conformidades_sin_firmante > 0
      ? [
          {
            label: `${admin.conformidades_sin_firmante} ${plural(admin.conformidades_sin_firmante, 'reporte', 'reportes')} sin firmante de conformidad`,
            screen: 'Users' as const,
          },
        ]
      : []),
    ...admin.areas_tecnicas_sin_jefe.map((name) => ({
      label: `${name} no tiene jefe de área`,
      screen: 'Users' as const,
    })),
    ...admin.areas_tecnicas_sin_tecnico.map((name) => ({
      label: `${name} no tiene técnicos`,
      screen: 'Users' as const,
    })),
    ...(admin.usuarios_sin_area > 0
      ? [
          {
            label: `${admin.usuarios_sin_area} ${plural(admin.usuarios_sin_area, 'usuario', 'usuarios')} sin área`,
            screen: 'Users' as const,
          },
        ]
      : []),
    ...(admin.usuarios_sin_nombre > 0
      ? [
          {
            label: `${admin.usuarios_sin_nombre} ${plural(admin.usuarios_sin_nombre, 'usuario', 'usuarios')} sin nombre`,
            screen: 'Users' as const,
          },
        ]
      : []),
    ...(admin.solicitudes_acceso_pendientes > 0
      ? [
          {
            label: `${admin.solicitudes_acceso_pendientes} ${plural(admin.solicitudes_acceso_pendientes, 'persona pidió', 'personas pidieron')} acceso`,
            screen: 'AccessRequests' as const,
          },
        ]
      : []),
    ...(admin.invitaciones_pendientes > 0
      ? [
          {
            label: `${admin.invitaciones_pendientes} ${plural(admin.invitaciones_pendientes, 'invitación pendiente', 'invitaciones pendientes')}`,
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
