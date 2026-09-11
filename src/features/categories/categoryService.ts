import { supabase } from '@/services/supabase/client'

import type { CategoryInput, CategoryRecord } from './types'

interface CategoryRow {
  id: string
  area_id: string
  name: string
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  area: { name: string } | null
}

function mapCategory(row: CategoryRow): CategoryRecord {
  return {
    id: row.id,
    areaId: row.area_id,
    areaName: row.area?.name ?? 'Área no disponible',
    name: row.name,
    description: row.description,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

const categorySelection = '*, area:areas(name)'

export async function listCategories(): Promise<CategoryRecord[]> {
  const { data, error } = await supabase.from('categories').select(categorySelection).order('name')
  if (error) throw error
  return (data as unknown as CategoryRow[]).map(mapCategory)
}

export async function createCategory(input: CategoryInput): Promise<CategoryRecord> {
  const { data, error } = await supabase
    .from('categories')
    .insert({
      area_id: input.areaId,
      name: input.name.trim(),
      description: input.description.trim() || null,
    })
    .select(categorySelection)
    .single()
  if (error) throw error
  return mapCategory(data as unknown as CategoryRow)
}

export async function updateCategory(
  categoryId: string,
  input: CategoryInput,
): Promise<CategoryRecord> {
  const { data, error } = await supabase
    .from('categories')
    .update({
      area_id: input.areaId,
      name: input.name.trim(),
      description: input.description.trim() || null,
    })
    .eq('id', categoryId)
    .select(categorySelection)
    .single()
  if (error) throw error
  return mapCategory(data as unknown as CategoryRow)
}

export async function setCategoryActive(
  categoryId: string,
  isActive: boolean,
): Promise<CategoryRecord> {
  const { data, error } = await supabase
    .from('categories')
    .update({ is_active: isActive })
    .eq('id', categoryId)
    .select(categorySelection)
    .single()
  if (error) throw error
  return mapCategory(data as unknown as CategoryRow)
}
