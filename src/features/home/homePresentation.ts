import type { CaseStatus } from '@/features/cases/types'
import type { CaseStatusCount } from '@/features/cases/caseSearch'
import type { IconName } from '@/components/ui/Icon'
import type { phaseColors } from '@/theme/tokens'
import { plural } from '@/theme/formatters'

import type { HomeSummary, NextStepAction, NextStepCase } from './homeService'
import type { AppNotification } from '@/features/notifications/notificationService'

export const NEXT_STEP_LABELS: Record<NextStepAction, string> = {
  aceptar: 'Aceptar solicitud',
  asignar: 'Asignar técnico',
  iniciar: 'Iniciar trabajo',
  enviar_reporte: 'Completar reporte',
  validar_reporte: 'Validar reporte',
  aprobar_reporte: 'Aprobar reporte',
}

export const NEXT_STEP_BUTTON_LABELS: Record<NextStepAction, string> = {
  aceptar: 'Revisar',
  asignar: 'Asignar',
  iniciar: 'Iniciar',
  enviar_reporte: 'Completar',
  validar_reporte: 'Revisar',
  aprobar_reporte: 'Revisar',
}

export const NEXT_STEP_VISUALS: Record<
  NextStepAction,
  { icon: IconName; phase: keyof typeof phaseColors }
> = {
  aceptar: { icon: 'checkmark-circle-outline', phase: 'nueva' },
  asignar: { icon: 'person-add-outline', phase: 'curso' },
  iniciar: { icon: 'play-circle-outline', phase: 'curso' },
  enviar_reporte: { icon: 'document-text-outline', phase: 'revision' },
  validar_reporte: { icon: 'checkmark-done-outline', phase: 'revision' },
  aprobar_reporte: { icon: 'ribbon-outline', phase: 'cerrada' },
}

export function getHomePhases(counts: CaseStatusCount[]) {
  const byStatus = new Map(counts.map(({ status, total }) => [status, total]))
  const sum = (statuses: CaseStatus[]) =>
    statuses.reduce((total, status) => total + (byStatus.get(status) ?? 0), 0)
  const por_aceptar = sum(['solicitado'])
  const en_curso = sum(['aceptado', 'asignado', 'en_ejecucion', 'en_espera'])
  const en_revision = sum(['reporte_enviado', 'validado'])
  const cerradas = sum(['aprobado', 'rechazado', 'cancelado'])
  return {
    por_aceptar,
    en_curso,
    en_revision,
    cerradas,
    total: por_aceptar + en_curso + en_revision + cerradas,
  }
}

export function nextStepDueMeta(item: Pick<NextStepCase, 'dueAt'>, now: Date) {
  if (!item.dueAt) return 'sin plazo'
  const difference = new Date(item.dueAt).getTime() - now.getTime()
  if (!Number.isFinite(difference)) return 'sin plazo'
  const minutes = Math.ceil(Math.abs(difference) / 60_000)
  if (minutes === 0) return 'vence ahora'
  const amount =
    minutes < 60
      ? `${minutes} min`
      : minutes < 24 * 60
        ? `${Math.ceil(minutes / 60)} h`
        : `${Math.ceil(minutes / 1_440)} ${Math.ceil(minutes / 1_440) === 1 ? 'día' : 'días'}`
  return difference < 0 ? `venció hace ${amount}` : `vence en ${amount}`
}

export function nextStepDeadlineLabel(
  item: Pick<NextStepCase, 'dueAt' | 'overdueStage'>,
  now: Date,
) {
  if (item.overdueStage) return 'Vencida'
  if (!item.dueAt) return 'Sin plazo'
  const minutes = Math.ceil((new Date(item.dueAt).getTime() - now.getTime()) / 60_000)
  if (!Number.isFinite(minutes)) return 'Sin plazo'
  if (minutes <= 0) return 'Vence ahora'
  if (minutes < 60) return `Vence en ${minutes} min`
  if (minutes < 48 * 60) return `Vence en ${Math.ceil(minutes / 60)} h`
  return `Vence en ${Math.ceil(minutes / 1_440)} días`
}

export function getTodayNotifications(items: AppNotification[], now: Date) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime()
  return items
    .filter((item) => {
      const timestamp = new Date(item.createdAt).getTime()
      return timestamp >= start && timestamp < end
    })
    .slice(0, 3)
}

export function getGreeting(hour: number) {
  if (hour < 12) return 'Buenos días'
  if (hour < 18) return 'Buenas tardes'
  return 'Buenas noches'
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
