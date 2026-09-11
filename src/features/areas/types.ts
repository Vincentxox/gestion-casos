export interface AreaRecord {
  id: string
  name: string
  description: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface AreaInput {
  name: string
  description: string
}
