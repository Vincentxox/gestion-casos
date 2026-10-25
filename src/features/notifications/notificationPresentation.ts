import type { IconName } from '@/components/ui/Icon'
import type { AppNotification } from './notificationService'
import { colors, phaseColors } from '@/theme/tokens'
import { formatCaseCardDate } from '@/theme/formatters'

export type NotificationFilter = 'all' | 'unread'
export type NotificationGroupName = 'Hoy' | 'Ayer' | 'Esta semana' | 'Anteriores'

export function notificationAppearance(action: AppNotification['action']): {
  icon: IconName
  foreground: string
  background: string
} {
  switch (action) {
    case 'asignar':
    case 'reasignar':
      return {
        icon: 'person-add-outline',
        foreground: phaseColors.curso.fg,
        background: phaseColors.curso.bg,
      }
    case 'enviar_reporte':
    case 'validar_reporte':
      return {
        icon: 'document-text-outline',
        foreground: phaseColors.revision.fg,
        background: phaseColors.revision.bg,
      }
    case 'aprobar_reporte':
      return {
        icon: 'checkmark-circle-outline',
        foreground: phaseColors.cerrada.fg,
        background: phaseColors.cerrada.bg,
      }
    case 'pausar':
      return {
        icon: 'pause-outline',
        foreground: phaseColors.detenida.fg,
        background: phaseColors.detenida.bg,
      }
    case 'rechazar':
    case 'cancelar':
      return {
        icon: 'close-circle-outline',
        foreground: phaseColors.rechazada.fg,
        background: phaseColors.rechazada.bg,
      }
    case 'devolver_reporte':
      return {
        icon: 'arrow-undo-outline',
        foreground: phaseColors.nueva.fg,
        background: phaseColors.nueva.bg,
      }
    case 'crear':
      return {
        icon: 'add-circle-outline',
        foreground: colors.primary,
        background: colors.primarySoft,
      }
    case 'mensaje':
      return {
        icon: 'chatbubble-outline',
        foreground: colors.primary,
        background: colors.primarySoft,
      }
    default:
      return {
        icon: 'notifications-outline',
        foreground: colors.neutral,
        background: colors.neutralSoft,
      }
  }
}

export function filterNotifications(items: AppNotification[], filter: NotificationFilter) {
  return filter === 'unread' ? items.filter((item) => !item.readAt) : items
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

export function notificationGroupName(createdAt: string, now: Date): NotificationGroupName {
  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) return 'Anteriores'
  const difference = startOfDay(now) - startOfDay(date)
  if (difference === 0) return 'Hoy'
  if (difference === 86_400_000) return 'Ayer'
  const weekday = (now.getDay() + 6) % 7
  if (difference > 0 && difference <= weekday * 86_400_000) return 'Esta semana'
  return 'Anteriores'
}

export function notificationTimeLabel(createdAt: string, now: Date): string {
  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) return ''
  return formatCaseCardDate(createdAt, now.getTime())
}

export function groupNotifications(items: AppNotification[], now: Date) {
  const order: NotificationGroupName[] = ['Hoy', 'Ayer', 'Esta semana', 'Anteriores']
  return order
    .map((title) => ({
      title,
      items: items.filter((item) => notificationGroupName(item.createdAt, now) === title),
    }))
    .filter((group) => group.items.length > 0)
}
