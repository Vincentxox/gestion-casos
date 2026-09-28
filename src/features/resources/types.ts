export const RESOURCE_KINDS = ['material', 'herramienta', 'equipo'] as const
export type ResourceKind = (typeof RESOURCE_KINDS)[number]
export type UsageKind = 'recurso' | 'mano_de_obra'

export const RESOURCE_KIND_LABELS: Record<ResourceKind, string> = {
  material: 'Material',
  herramienta: 'Herramienta',
  equipo: 'Equipo',
}

export interface ResourceRecord {
  id: string
  kind: ResourceKind
  name: string
  description: string | null
  unit: string | null
  unitCost: number | null
  isActive: boolean
}

export interface ResourceInput {
  kind: ResourceKind
  name: string
  description: string
  unit: string
  unitCost: string
}

export interface CaseUsageRecord {
  id: string
  caseId: string
  kind: UsageKind
  resourceId: string | null
  resourceKind: ResourceKind | null
  resourceName: string | null
  unit: string | null
  unitCost: number | null
  quantity: number | null
  hours: number | null
  technicianId: string | null
  technicianName: string | null
  notes: string | null
  createdAt: string
}

export interface UsageInput {
  kind: UsageKind
  resourceId: string
  resourceKind: ResourceKind | null
  technicianId: string
  quantity: string
  hours: string
  notes: string
}
