import type { CaseStatus } from './types'

/** Los cinco hitos visibles en la tarjeta; un cierre sin aprobación no tiene barra. */
export function getCaseStep(status: CaseStatus): number | null {
  switch (status) {
    case 'solicitado':
      return 1
    case 'aceptado':
    case 'asignado':
      return 2
    case 'en_ejecucion':
    case 'en_espera':
      return 3
    case 'reporte_enviado':
    case 'validado':
      return 4
    case 'aprobado':
      return 5
    case 'rechazado':
    case 'cancelado':
      return null
  }
}
