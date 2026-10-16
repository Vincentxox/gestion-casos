import { supabase } from '@/services/supabase/client'
import type { CasePriority } from '@/features/cases/types'
import { CASE_PRIORITIES } from '@/features/cases/types'
import { priorityTargetSchema } from './schemas'

export interface PriorityTarget {
  priority: CasePriority
  acceptHours: number
  resolveHours: number
}

export interface CaseIndicators {
  total: number
  por_estado: Record<string, number>
  por_prioridad: Record<CasePriority, number>
  vencidas_hoy: {
    aceptacion: number
    resolucion: number
    alta: number
    media: number
    baja: number
  }
  fuera_de_plazo: { aceptacion: number; resolucion: number }
  tiempos_promedio_horas: {
    aceptacion: number | null
    resolucion: number | null
    envio_a_aprobacion: number | null
  }
  por_area_destino: { area_id: string; nombre: string; total: number }[]
  por_area_solicitante: { area_id: string; nombre: string; total: number }[]
  costo_recursos_por_area: {
    area_id: string
    nombre: string
    costo: number
    horas_mano_de_obra: number
  }[]
}

export async function getCaseIndicators(
  periodStart: string | null = null,
  periodEnd: string | null = null,
): Promise<CaseIndicators> {
  const { data, error } = await supabase.rpc('get_case_indicators', {
    period_start: periodStart ?? undefined,
    period_end: periodEnd ?? undefined,
  })
  if (error) throw error
  return data as unknown as CaseIndicators
}

export async function listPriorityTargets(organizationId: string): Promise<PriorityTarget[]> {
  const { data, error } = await supabase
    .from('priority_targets')
    .select('priority,accept_hours,resolve_hours')
    .eq('organization_id', organizationId)
  if (error) throw error
  return data
    .map((row) => ({
      priority: row.priority,
      acceptHours: row.accept_hours,
      resolveHours: row.resolve_hours,
    }))
    .sort((a, b) => CASE_PRIORITIES.indexOf(a.priority) - CASE_PRIORITIES.indexOf(b.priority))
}

export function validatePriorityTarget(acceptHours: number, resolveHours: number): string | null {
  const result = priorityTargetSchema.safeParse({ acceptHours, resolveHours })
  return result.success ? null : result.error.issues[0]!.message
}

export async function setPriorityTarget(target: PriorityTarget): Promise<PriorityTarget> {
  const validation = validatePriorityTarget(target.acceptHours, target.resolveHours)
  if (validation) throw new Error(validation)
  const { data, error } = await supabase.rpc('set_priority_target', {
    target_priority: target.priority,
    new_accept_hours: target.acceptHours,
    new_resolve_hours: target.resolveHours,
  })
  if (error) throw error
  return {
    priority: data.priority,
    acceptHours: data.accept_hours,
    resolveHours: data.resolve_hours,
  }
}
