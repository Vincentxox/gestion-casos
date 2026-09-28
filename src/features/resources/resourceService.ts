import { supabase } from '@/services/supabase/client'

import type {
  CaseUsageRecord,
  ResourceInput,
  ResourceRecord,
  ResourceKind,
  UsageInput,
  UsageKind,
} from './types'

interface ResourceRow {
  id: string
  kind: ResourceKind
  name: string
  description: string | null
  unit: string | null
  unit_cost: number | null
  is_active: boolean
}

interface UsageRow {
  id: string
  case_id: string
  kind: UsageKind
  resource_id: string | null
  resource_kind: ResourceKind | null
  resource_name: string | null
  unit: string | null
  unit_cost: number | null
  quantity: number | null
  hours: number | null
  technician_id: string | null
  technician: { full_name: string } | null
  notes: string | null
  created_at: string
}

const resourceSelection = 'id, kind, name, description, unit, unit_cost, is_active'
const usageSelection =
  'id, case_id, kind, resource_id, resource_kind, resource_name, unit, unit_cost, quantity, hours, technician_id, technician:profiles!case_resource_usages_technician_id_fkey(full_name), notes, created_at'

function mapResource(row: ResourceRow): ResourceRecord {
  return {
    id: row.id,
    kind: row.kind,
    name: row.name,
    description: row.description,
    unit: row.unit,
    unitCost: row.unit_cost,
    isActive: row.is_active,
  }
}

function mapUsage(row: UsageRow): CaseUsageRecord {
  return {
    id: row.id,
    caseId: row.case_id,
    kind: row.kind,
    resourceId: row.resource_id,
    resourceKind: row.resource_kind,
    resourceName: row.resource_name,
    unit: row.unit,
    unitCost: row.unit_cost,
    quantity: row.quantity,
    hours: row.hours,
    technicianId: row.technician_id,
    technicianName: row.technician?.full_name ?? null,
    notes: row.notes,
    createdAt: row.created_at,
  }
}

function resourcePayload(input: ResourceInput) {
  return {
    kind: input.kind,
    name: input.name.trim(),
    description: input.description.trim() || null,
    unit: input.unit.trim() || null,
    unit_cost: input.unitCost.trim() ? Number(input.unitCost) : null,
  }
}

export async function listResources(): Promise<ResourceRecord[]> {
  const { data, error } = await supabase.from('resources').select(resourceSelection).order('name')
  if (error) throw error
  return (data as ResourceRow[]).map(mapResource)
}

export async function createResource(input: ResourceInput): Promise<ResourceRecord> {
  const { data, error } = await supabase
    .from('resources')
    .insert(resourcePayload(input))
    .select(resourceSelection)
    .single()
  if (error) throw error
  return mapResource(data as ResourceRow)
}

export async function updateResource(
  resourceId: string,
  input: ResourceInput,
): Promise<ResourceRecord> {
  const { data, error } = await supabase
    .from('resources')
    .update(resourcePayload(input))
    .eq('id', resourceId)
    .select(resourceSelection)
    .single()
  if (error) throw error
  return mapResource(data as ResourceRow)
}

export async function setResourceActive(resourceId: string, isActive: boolean): Promise<void> {
  const { error } = await supabase
    .from('resources')
    .update({ is_active: isActive })
    .eq('id', resourceId)
    .select('id')
    .single()
  if (error) throw error
}

export async function listCaseUsages(caseId: string): Promise<CaseUsageRecord[]> {
  const { data, error } = await supabase
    .from('case_resource_usages')
    .select(usageSelection)
    .eq('case_id', caseId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as unknown as UsageRow[]).map(mapUsage)
}

export async function addCaseUsage(caseId: string, input: UsageInput): Promise<void> {
  if (input.kind === 'recurso') {
    const { error } = await supabase.from('case_resource_usages').insert({
      case_id: caseId,
      kind: 'recurso',
      resource_id: input.resourceId,
      quantity: input.quantity ? Number(input.quantity) : null,
      hours: input.hours ? Number(input.hours) : null,
      notes: input.notes.trim() || null,
    })
    if (error) throw error
  } else {
    const { error } = await supabase.from('case_resource_usages').insert({
      case_id: caseId,
      kind: 'mano_de_obra',
      technician_id: input.technicianId,
      hours: Number(input.hours),
      notes: input.notes.trim() || null,
    })
    if (error) throw error
  }
}

export async function updateCaseUsage(
  usageId: string,
  input: Pick<UsageInput, 'quantity' | 'hours' | 'notes'>,
): Promise<void> {
  const { error } = await supabase
    .from('case_resource_usages')
    .update({
      quantity: input.quantity ? Number(input.quantity) : null,
      hours: input.hours ? Number(input.hours) : null,
      notes: input.notes.trim() || null,
    })
    .eq('id', usageId)
    .select('id')
    .single()
  if (error?.code === 'PGRST116')
    throw new Error('Este registro ya no se puede modificar; actualiza la pantalla')
  if (error) throw error
}

export async function deleteCaseUsage(usageId: string): Promise<void> {
  const { error } = await supabase
    .from('case_resource_usages')
    .delete()
    .eq('id', usageId)
    .select('id')
    .single()
  if (error?.code === 'PGRST116')
    throw new Error('Este registro ya no se puede eliminar; actualiza la pantalla')
  if (error) throw error
}
