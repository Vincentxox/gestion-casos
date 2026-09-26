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

export const priorityMeta: Record<CasePriority, { label: string; color: string; icon: IconName }> =
  {
    alta: { label: 'Alta', color: '#B91C1C', icon: 'flag' },
    media: { label: 'Media', color: '#B45309', icon: 'flag-outline' },
    baja: { label: 'Baja', color: '#64748B', icon: 'flag-outline' },
  }

export const actionMeta = {
  crear: {
    label: 'Crear solicitud',
    description: 'Registra la solicitud',
    verb: 'creó la solicitud',
    phase: 'nueva',
    icon: 'file-tray-outline',
  },
  aceptar: {
    label: 'Aceptar solicitud',
    description: 'La solicitud queda lista para asignar',
    verb: 'aceptó la solicitud',
    phase: 'curso',
    icon: 'checkmark-circle-outline',
  },
  rechazar: {
    label: 'Rechazar solicitud',
    description: 'El área técnica no la atenderá. Pide un motivo.',
    verb: 'rechazó la solicitud',
    phase: 'rechazada',
    icon: 'close-circle-outline',
  },
  cancelar: {
    label: 'Cancelar solicitud',
    description: 'Quien la pidió la retira antes de que la acepten.',
    verb: 'canceló la solicitud',
    phase: 'cancelada',
    icon: 'remove-circle-outline',
  },
  asignar: {
    label: 'Asignar personal',
    description: 'Elige a la persona responsable',
    verb: 'asignó la solicitud',
    phase: 'curso',
    icon: 'person-add-outline',
  },
  reasignar: {
    label: 'Reasignar personal',
    description: 'Cambia la persona responsable',
    verb: 'reasignó la solicitud',
    phase: 'curso',
    icon: 'swap-horizontal-outline',
  },
  iniciar: {
    label: 'Iniciar trabajo',
    description: 'El trabajo pasa a ejecución',
    verb: 'inició el trabajo',
    phase: 'curso',
    icon: 'construct-outline',
  },
  pausar: {
    label: 'Pausar trabajo',
    description: 'El trabajo queda en espera',
    verb: 'pausó el trabajo',
    phase: 'detenida',
    icon: 'pause-circle-outline',
  },
  reanudar: {
    label: 'Reanudar trabajo',
    description: 'El trabajo vuelve a ejecución',
    verb: 'reanudó el trabajo',
    phase: 'curso',
    icon: 'play-circle-outline',
  },
} satisfies Record<
  string,
  { label: string; description: string; verb: string; phase: Phase; icon: IconName }
>
