export const CASE_STATUSES = [
  'solicitado',
  'aceptado',
  'rechazado',
  'cancelado',
  'asignado',
  'en_ejecucion',
  'en_espera',
  'reporte_enviado',
  'validado',
  'aprobado',
] as const
export const CASE_PRIORITIES = ['alta', 'media', 'baja'] as const
export const CASE_ACTIONS = [
  'aceptar',
  'rechazar',
  'cancelar',
  'asignar',
  'iniciar',
  'pausar',
  'reanudar',
] as const

export type CaseStatus = (typeof CASE_STATUSES)[number]
export type CasePriority = (typeof CASE_PRIORITIES)[number]
export type CaseAction = (typeof CASE_ACTIONS)[number]

export interface CaseRecord {
  id: string
  caseNumber: string
  title: string
  description: string
  category: string
  categoryId: string
  requestingAreaId: string
  requestingAreaName: string
  targetAreaId: string
  targetAreaName: string
  location: string
  priority: CasePriority
  status: CaseStatus
  createdBy: string
  assignedTo: string | null
  creatorName: string
  assigneeName: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateCaseInput {
  title: string
  description: string
  categoryId: string
  location: string
  priority: CasePriority
}

export type UpdateCaseInput = CreateCaseInput

export interface ChangeCaseStatusInput {
  action: CaseAction
  comment: string
}

export interface AssignableProfile {
  id: string
  fullName: string
  role: 'tecnico' | 'jefe_area'
  areaId: string
  areaName: string | null
}

export interface CaseStatusHistoryRecord {
  id: number
  previousStatus: CaseStatus | null
  newStatus: CaseStatus
  action: string
  actorName: string
  assigneeName: string | null
  comment: string | null
  createdAt: string
}
