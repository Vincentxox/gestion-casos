import { supabase } from '@/services/supabase/client'

export interface HomeSummary {
  role: string
  has_area: boolean
  area_kind: 'solicitante' | 'tecnica' | null
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
  inbox: { por_aceptar: number; sin_asignar: number }
  admin: null | {
    usuarios_sin_area: number
    usuarios_sin_nombre: number
    solicitudes_acceso_pendientes: number
    invitaciones_pendientes: number
    tipos_servicio_activos: number
    recursos_activos: number
    areas_tecnicas_sin_jefe: string[]
    areas_tecnicas_sin_tecnico: string[]
  }
}

export async function getHomeSummary(): Promise<HomeSummary> {
  const { data, error } = await supabase.rpc('get_home_summary')
  if (error) throw error
  return data as HomeSummary
}
