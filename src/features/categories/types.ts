export interface CategoryRecord {
  id: string
  areaId: string
  areaName: string
  name: string
  description: string | null
  isActive: boolean
  minAfterPhotos: number
  createdAt: string
  updatedAt: string
}

export interface CategoryInput {
  areaId: string
  name: string
  description: string
  minAfterPhotos: number
}
