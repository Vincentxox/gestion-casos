import type { CaseActionName, CaseRecord, CaseStatus } from './types'

const NEXT_ACTION: Record<CaseStatus, CaseActionName | null> = {
  solicitado: 'aceptar',
  aceptado: 'asignar',
  rechazado: null,
  cancelado: null,
  asignado: 'iniciar',
  en_ejecucion: 'enviar_reporte',
  en_espera: 'reanudar',
  reporte_enviado: 'validar_reporte',
  validado: 'aprobar_reporte',
  aprobado: null,
}

export function getNextWorkflowAction(status: CaseStatus): CaseActionName | null {
  return NEXT_ACTION[status]
}

export function getWaitingPresentation(
  item: Pick<CaseRecord, 'status' | 'assigneeName'>,
): { banner: string; tracking: string } | null {
  const firstName = item.assigneeName?.trim().split(/\s+/)[0]
  const technician = firstName ?? 'el técnico'
  switch (item.status) {
    case 'solicitado':
      return {
        banner: 'Esperando: el área técnica acepta la solicitud',
        tracking: 'Esperando que el área técnica la acepte',
      }
    case 'aceptado':
      return {
        banner: 'Esperando: el área técnica asigna un responsable',
        tracking: 'Esperando que se asigne un técnico',
      }
    case 'asignado':
      return {
        banner: `Esperando: ${technician} inicia el trabajo`,
        tracking: `Esperando que ${technician} inicie el trabajo`,
      }
    case 'en_ejecucion':
      return {
        banner: `Esperando: ${technician} envía el reporte del trabajo`,
        tracking: `Trabajo en curso${firstName ? ` · ${firstName}` : ''}`,
      }
    case 'en_espera':
      return {
        banner: `Esperando: ${technician} reanuda el trabajo`,
        tracking: `Trabajo en pausa${firstName ? ` · ${firstName}` : ''}`,
      }
    case 'reporte_enviado':
      return {
        banner: 'Esperando: el área técnica valida el reporte',
        tracking: 'Esperando la validación del reporte',
      }
    case 'validado':
      return {
        banner: 'Esperando: el área solicitante aprueba el reporte',
        tracking: 'Esperando la aprobación del reporte',
      }
    default:
      return null
  }
}
