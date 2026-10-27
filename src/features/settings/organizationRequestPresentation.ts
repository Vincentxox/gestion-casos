import type {
  OrganizationRequestStatus,
  TeamSize,
} from '@/features/auth/organizationRequestService'
import { formatCaseDueDate, formatTrackingMoment } from '@/theme/formatters'

export function formatOrganizationRequestDate(value: string, short = false) {
  return short ? formatCaseDueDate(value) : formatTrackingMoment(value)
}

export function organizationRequestStatusLabel(status: OrganizationRequestStatus) {
  return {
    pendiente: 'Por revisar',
    aprobada: 'Aprobada',
    rechazada: 'Rechazada',
    cancelada: 'Cancelada',
  }[status]
}

export function teamSizeLabel(value: TeamSize) {
  return `${value.replace('-', '–')} personas`
}
