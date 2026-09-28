import { supabase } from '@/services/supabase/client'

import type { AreaInput, AreaRecord } from './types'

interface AreaRow {
  id: string
  name: string
  description: string | null
  is_active: boolean
  kind: AreaRecord['kind']
  created_at: string
  updated_at: string
}

function mapArea(row: AreaRow): AreaRecord {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    isActive: row.is_active,
    kind: row.kind,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function listAreas(): Promise<AreaRecord[]> {
  const { data, error } = await supabase.from('areas').select('*').order('name')
  if (error) throw error
  return (data as AreaRow[]).map(mapArea)
}

export async function createArea(input: AreaInput): Promise<AreaRecord> {
  const { data, error } = await supabase
    .from('areas')
    .insert({
      name: input.name.trim(),
      description: input.description.trim() || null,
      kind: input.kind,
    })
    .select('*')
    .single()

  if (error) throw error
  return mapArea(data as AreaRow)
}

export async function updateArea(areaId: string, input: AreaInput): Promise<AreaRecord> {
  const { data, error } = await supabase
    .from('areas')
    .update({
      name: input.name.trim(),
      description: input.description.trim() || null,
      kind: input.kind,
    })
    .eq('id', areaId)
    .select('*')
    .single()

  if (error) throw error
  return mapArea(data as AreaRow)
}

export async function setAreaActive(areaId: string, isActive: boolean): Promise<AreaRecord> {
  const { data, error } = await supabase
    .from('areas')
    .update({ is_active: isActive })
    .eq('id', areaId)
    .select('*')
    .single()

  if (error) throw error
  return mapArea(data as AreaRow)
}
