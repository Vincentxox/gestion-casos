export interface AreaRecord {
  id: string
  name: string
  description: string | null
  isActive: boolean
  kind: 'solicitante' | 'tecnica'
  createdAt: string
  updatedAt: string
}

export interface AreaInput {
  name: string
  description: string
  kind: AreaRecord['kind']
}
