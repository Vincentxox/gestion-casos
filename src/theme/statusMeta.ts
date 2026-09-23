import type { ComponentProps } from 'react'
import type { Ionicons } from '@expo/vector-icons'

import type { CasePriority, CaseStatus } from '@/features/cases/types'
import { phaseColors } from '@/theme/tokens'

type IconName = ComponentProps<typeof Ionicons>['name']
type Phase = keyof typeof phaseColors

export const statusMeta: Record<CaseStatus, { label: string; phase: Phase; icon: IconName }> = {
  solicitado: { label: 'Solicitada', phase: 'nueva', icon: 'file-tray-outline' },
  aceptado: { label: 'Aceptada', phase: 'curso', icon: 'checkmark-circle-outline' },
  asignado: { label: 'Asignada', phase: 'curso', icon: 'person-add-outline' },
  en_ejecucion: { label: 'En ejecución', phase: 'curso', icon: 'construct-outline' },
  en_espera: { label: 'En espera', phase: 'detenida', icon: 'pause-circle-outline' },
  reporte_enviado: { label: 'Reporte enviado', phase: 'revision', icon: 'document-text-outline' },
  validado: { label: 'Validada', phase: 'revision', icon: 'shield-checkmark-outline' },
  aprobado: { label: 'Aprobada', phase: 'cerrada', icon: 'checkmark-done-outline' },
  rechazado: { label: 'Rechazada', phase: 'rechazada', icon: 'close-circle-outline' },
  cancelado: { label: 'Cancelada', phase: 'cancelada', icon: 'remove-circle-outline' },
}

export const priorityMeta: Record<CasePriority, { label: string; color: string }> = {
  alta: { label: 'Alta', color: '#B91C1C' },
  media: { label: 'Media', color: '#B45309' },
  baja: { label: 'Baja', color: '#64748B' },
}

export const actionMeta = {
  crear: { verb: 'creó la solicitud', phase: 'nueva', icon: 'file-tray-outline' },
  aceptar: { verb: 'aceptó la solicitud', phase: 'curso', icon: 'checkmark-circle-outline' },
  rechazar: { verb: 'rechazó la solicitud', phase: 'rechazada', icon: 'close-circle-outline' },
  cancelar: { verb: 'canceló la solicitud', phase: 'cancelada', icon: 'remove-circle-outline' },
  asignar: { verb: 'asignó la solicitud', phase: 'curso', icon: 'person-add-outline' },
  reasignar: { verb: 'reasignó la solicitud', phase: 'curso', icon: 'swap-horizontal-outline' },
  iniciar: { verb: 'inició el trabajo', phase: 'curso', icon: 'construct-outline' },
  pausar: { verb: 'pausó el trabajo', phase: 'detenida', icon: 'pause-circle-outline' },
  reanudar: { verb: 'reanudó el trabajo', phase: 'curso', icon: 'play-circle-outline' },
} satisfies Record<string, { verb: string; phase: Phase; icon: IconName }>
