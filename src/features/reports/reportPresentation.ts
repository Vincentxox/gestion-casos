import type { CasePriority } from '@/features/cases/types'
import { RESOURCE_KIND_LABELS, type ResourceKind } from '@/features/resources/types'
import { priorityMeta } from '@/theme/statusMeta'

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
