import type { CasePriority } from '@/features/cases/types'
import { RESOURCE_KIND_LABELS, type ResourceKind } from '@/features/resources/types'
import { priorityMeta } from '@/theme/statusMeta'
import type { ReportSignature } from './types'

export function photoRequirementLabel(count: number, minimum: number): string {
  return minimum === 0
    ? `Fotos de después: ${count} (opcional)`
    : `Fotos de después: ${count} de ${minimum}`
}

export function reviewPriorityLabel(priority: string): string {
  return priority in priorityMeta ? priorityMeta[priority as CasePriority].label : priority
}

export function reviewResourceKindLabel(kind: unknown): string | null {
  if (typeof kind !== 'string') return null
  if (kind === 'mano_de_obra') return 'Mano de obra'
  return kind in RESOURCE_KIND_LABELS ? RESOURCE_KIND_LABELS[kind as ResourceKind] : kind
}

export function reviewQuantityLabel(quantity: unknown, unit: unknown): string | null {
  if (typeof quantity !== 'number') return null
  return `${quantity} ${typeof unit === 'string' && unit.trim() ? unit.trim() : 'unidad'}`
}

export function reviewHoursLabel(hours: unknown): string | null {
  return typeof hours === 'number' ? `${hours} h` : null
}

const DATE_LABELS: Record<string, string> = {
  creada: 'Creada',
  aceptada: 'Aceptada',
  asignada: 'Asignada',
  iniciada: 'Iniciada',
  enviada: 'Enviada',
}

const DATE_ORDER = ['creada', 'aceptada', 'asignada', 'iniciada', 'enviada']

export function orderedReviewDates(
  dates: Record<string, string | null>,
): [string, string | null][] {
  const entries = Object.entries(dates)
  return entries.sort(([left], [right]) => {
    const leftIndex = DATE_ORDER.indexOf(left)
    const rightIndex = DATE_ORDER.indexOf(right)
    if (leftIndex === -1) return rightIndex === -1 ? left.localeCompare(right) : 1
    if (rightIndex === -1) return -1
    return leftIndex - rightIndex
  })
}

export function reviewDateLabel(key: string): string {
  return DATE_LABELS[key] ?? key.replaceAll('_', ' ')
}

export function reportElapsedLabel(createdAt: string | null, sentAt: string | null): string | null {
  if (!createdAt || !sentAt) return null
  const elapsed = Date.parse(sentAt) - Date.parse(createdAt)
  if (!Number.isFinite(elapsed) || elapsed < 0) return null
  const totalHours = Math.floor(elapsed / 3_600_000)
  const days = Math.floor(totalHours / 24)
  const hours = totalHours % 24
  if (days > 0) return `Resuelta en ${days} d ${hours} h`
  if (totalHours > 0) return `Resuelta en ${totalHours} h`
  return `Resuelta en ${Math.max(1, Math.floor(elapsed / 60_000))} min`
}

export function reportVerificationCode(hash: string): string {
  return (
    hash
      .slice(0, 12)
      .toUpperCase()
      .match(/.{1,4}/g)
      ?.join('-') ?? ''
  )
}

export const REPORT_SIGNATURE_STEPS = [
  { type: 'ejecucion', label: 'Ejecución', action: 'submit' },
  { type: 'validacion_tecnica', label: 'Validación técnica', action: 'validate' },
  { type: 'conformidad', label: 'Conformidad', action: 'approve' },
] as const

export function reportSignatureSteps(
  signatures: ReportSignature[],
  currentAction: 'submit' | 'validate' | 'approve' | null,
) {
  return REPORT_SIGNATURE_STEPS.map((step) => {
    const signature = signatures.find((entry) => entry.type === step.type)
    return {
      ...step,
      signature,
      isCurrent: !signature && step.action === currentAction,
      isSubstitute: signature?.signerRole === 'administrador' && step.type !== 'ejecucion',
    }
  })
}
