import type { CaseRecord, CaseStatus, CaseStatusHistoryRecord } from './types'

export type TrackingStep = {
  key: string
  label: string
  state: 'done' | 'current' | 'pending' | 'danger' | 'cancelled'
  detail: string
  event?: CaseStatusHistoryRecord
}

const DEFINITIONS = [
  {
    key: 'solicitada',
    label: 'Solicitada',
    action: 'crear',
    pending: 'La solicitud se envía al área técnica',
  },
  {
    key: 'aceptada',
    label: 'Aceptada',
    action: 'aceptar',
    pending: 'El área técnica acepta la solicitud',
  },
  {
    key: 'asignar',
    label: 'Personal asignado',
    action: 'asignar',
    pending: 'Se asigna al responsable del trabajo',
  },
  {
    key: 'ejecucion',
    label: 'En ejecución',
    action: 'iniciar',
    pending: 'El técnico inicia el trabajo',
  },
  {
    key: 'reporte',
    label: 'Revisión y firmas',
    action: 'enviar_reporte',
    pending: 'Validación y aprobación',
  },
  {
    key: 'cerrada',
    label: 'Cerrada',
    action: 'aprobar_reporte',
    pending: 'Con firma de conformidad',
  },
] as const

const CURRENT: Record<CaseStatus, number> = {
  solicitado: 0,
  aceptado: 2,
  asignado: 3,
  en_ejecucion: 3,
  en_espera: 3,
  reporte_enviado: 4,
  validado: 4,
  aprobado: 5,
  rechazado: 0,
  cancelado: 0,
}

/** Server history supplies the person and time; status only chooses the visible stage. */
export function getCaseTrackingSteps(
  item: Pick<CaseRecord, 'status'>,
  events: CaseStatusHistoryRecord[],
  currentDetail: string,
): TrackingStep[] {
  const terminal = item.status === 'rechazado' || item.status === 'cancelado'
  const terminalEvent = terminal
    ? events.find((event) => event.newStatus === item.status)
    : undefined
  const current =
    terminal && terminalEvent?.previousStatus
      ? CURRENT[terminalEvent.previousStatus]
      : CURRENT[item.status]
  const definitions = terminal ? DEFINITIONS.slice(0, current + 1) : DEFINITIONS
  const steps: TrackingStep[] = definitions.map((definition, index) => {
    const event = events.find((entry) => entry.action === definition.action)
    const state =
      terminal || item.status === 'aprobado' || index < current
        ? 'done'
        : index === current
          ? 'current'
          : 'pending'
    return {
      key: definition.key,
      label: definition.label,
      state,
      detail: state === 'current' ? currentDetail : definition.pending,
      event,
    }
  })
  if (terminal) {
    steps.push({
      key: item.status,
      label: item.status === 'rechazado' ? 'Rechazada' : 'Cancelada',
      state: item.status === 'cancelado' ? 'cancelled' : 'danger',
      detail: item.status === 'rechazado' ? 'Solicitud rechazada' : 'Solicitud cancelada',
      event: terminalEvent,
    })
  }
  return steps
}
