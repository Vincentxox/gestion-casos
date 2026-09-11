export const CASE_STATUSES = ['abierto', 'en_progreso', 'cerrado'] as const
export const CASE_PRIORITIES = ['alta', 'media', 'baja'] as const

export type CaseStatus = (typeof CASE_STATUSES)[number]
export type CasePriority = (typeof CASE_PRIORITIES)[number]

export interface CaseRecord {
  id: string
  caseNumber: string
  title: string
  description: string
  category: string
  location: string
  priority: CasePriority
  status: CaseStatus
  createdBy: string
  assignedTo: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateCaseInput {
  title: string
  description: string
  category: string
  location: string
  priority: CasePriority
}

export type UpdateCaseInput = CreateCaseInput

export interface ChangeCaseStatusInput {
  status: CaseStatus
  comment: string
}

export interface AssignableProfile {
  id: string
  fullName: string
  role: 'administrador' | 'auditor' | 'visualizador'
  areaName: string | null
}

export interface CaseStatusHistoryRecord {
  id: number
  previousStatus: CaseStatus | null
  newStatus: CaseStatus
  changedBy: string
  comment: string | null
  createdAt: string
}
