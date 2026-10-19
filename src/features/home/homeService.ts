import { supabase } from '@/services/supabase/client'
import type { CasePriority, CaseStatus } from '@/features/cases/types'

export type NextStepAction =
  'aceptar' | 'asignar' | 'iniciar' | 'enviar_reporte' | 'validar_reporte' | 'aprobar_reporte'

export interface NextStepCase {
  id: string
  caseNumber: string
  title: string
  category: string
  priority: CasePriority
  status: CaseStatus
  action: NextStepAction
  dueAt: string | null
  overdueStage: 'aceptacion' | 'resolucion' | null
  updatedAt: string
}

export interface NextStepsResult {
  items: NextStepCase[]
  total: number
}

interface NextStepRow {
  id: string
  case_number: string
  title: string
  priority: CasePriority
  status: CaseStatus
  next_step: NextStepAction
  due_at: string | null
  overdue_stage: 'aceptacion' | 'resolucion' | null
  category: { name: string } | null
  updated_at: string
}

export async function listNextSteps(): Promise<NextStepsResult> {
  const { data, count, error } = await supabase
    .rpc('list_next_steps', undefined, { count: 'exact' })
    .select(
      'id,case_number,title,priority,status,next_step,due_at,overdue_stage,category:categories!cases_category_id_fkey(name),updated_at',
    )
    .order('due_at', { ascending: true, nullsFirst: false })
    .order('updated_at', { ascending: true })
    .range(0, 19)
  if (error) throw error
  const rows = data as unknown as NextStepRow[]
  return {
    items: rows.map((row) => ({
      id: row.id,
      caseNumber: row.case_number,
      title: row.title,
      category: row.category?.name ?? 'Tipo no disponible',
      priority: row.priority,
      status: row.status,
      action: row.next_step,
      dueAt: row.due_at,
      overdueStage: row.overdue_stage,
      updatedAt: row.updated_at,
    })),
    total: count ?? rows.length,
  }
}

export interface HomeSummary {
  role: string
  has_area: boolean
  area_kind: 'solicitante' | 'tecnica' | null
  notificaciones_sin_leer?: number
  cases: {
    activas: number
    solicitado: number
    aceptado: number
    asignado: number
    en_ejecucion: number
    en_espera: number
    en_revision: number
    cerradas_30_dias: number
    alta_prioridad_activas: number
  }
  mine: {
    solicitudes_activas: number
    trabajos_por_iniciar: number
    trabajos_en_ejecucion: number
    trabajos_en_espera: number
  }
  inbox: {
    por_aceptar: number
    sin_asignar: number
    reportes_por_validar: number
    reportes_por_aprobar: number
  }
  admin: null | {
    usuarios_sin_area: number
    usuarios_sin_nombre: number
    solicitudes_acceso_pendientes: number
    invitaciones_pendientes: number
    tipos_servicio_activos: number
    recursos_activos: number
    areas_tecnicas_sin_jefe: string[]
    areas_tecnicas_sin_tecnico: string[]
    conformidades_sin_firmante: number
  }
}

export async function getHomeSummary(): Promise<HomeSummary> {
  const { data, error } = await supabase.rpc('get_home_summary')
  if (error) throw error
  return data as unknown as HomeSummary
}
