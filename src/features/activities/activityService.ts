import { z } from 'zod'

import { supabase } from '@/services/supabase/client'

export const ACTIVITY_PAGE_SIZE = 10

export type ActivityStatusFilter = 'todas' | 'activas' | 'en_proceso' | 'finalizadas'
export type PriorityDirection = 'asc' | 'desc'
export type ActivityPriority = 'baja' | 'media' | 'alta'

const areaSchema = z.object({ id: z.string().uuid(), nombre: z.string() })
const activityTypeSchema = z.object({ id: z.string().uuid(), nombre: z.string() })
const employeeSchema = z.object({ id: z.string().uuid(), nombres: z.string(), apellidos: z.string() })
const technicianSchema = z.object({ id: z.string().uuid(), nombre_completo: z.string() })
const equipmentSchema = z.object({
  id: z.string().uuid(),
  numero_serie: z.string(),
  modelo: z.object({ nombre: z.string(), marca: z.object({ nombre: z.string() }) }),
})
const activitySchema = z.object({
  id: z.string().uuid(),
  descripcion: z.string(),
  estado: z.enum(['pendiente', 'en_proceso', 'finalizada']),
  prioridad: z.enum(['baja', 'media', 'alta']),
  creado_en: z.string(),
  solicitud: z.object({
    numero_solicitud: z.string(),
    id_area: z.string().uuid(),
    area: z.object({ nombre: z.string() }),
    tipo: z.object({ nombre: z.string() }),
  }),
})

export type MaintenanceArea = z.infer<typeof areaSchema>
export type MaintenanceActivityType = z.infer<typeof activityTypeSchema>
export type MaintenanceEmployee = z.infer<typeof employeeSchema>
export type MaintenanceTechnician = z.infer<typeof technicianSchema>
export type MaintenanceEquipment = z.infer<typeof equipmentSchema>
export type MaintenanceActivity = z.infer<typeof activitySchema>

export type ActivityPageOptions = {
  page: number
  areaId: string | null
  status: ActivityStatusFilter
  priorityDirection: PriorityDirection
}

export async function getActivityAreas(): Promise<MaintenanceArea[]> {
  const { data, error } = await supabase.from('areas').select('id,nombre').order('nombre')
  if (error) throw error
  return z.array(areaSchema).parse(data)
}

export async function getActivityTypes(): Promise<MaintenanceActivityType[]> {
  const { data, error } = await supabase
    .from('tipos_actividad')
    .select('id,nombre')
    .eq('activo', true)
    .order('nombre')
  if (error) throw error
  return z.array(activityTypeSchema).parse(data)
}

export async function getAreaEmployees(areaId: string): Promise<MaintenanceEmployee[]> {
  const { data, error } = await supabase
    .from('empleados')
    .select('id,nombres,apellidos')
    .eq('id_area', areaId)
    .eq('activo', true)
    .order('apellidos')
  if (error) throw error
  return z.array(employeeSchema).parse(data)
}

export async function getAreaEquipment(areaId: string): Promise<MaintenanceEquipment[]> {
  const { data, error } = await supabase
    .from('equipos')
    .select('id,numero_serie,modelo:modelos(nombre,marca:marcas(nombre))')
    .eq('id_area', areaId)
    .eq('activo', true)
    .order('numero_serie')
  if (error) throw error
  return z.array(equipmentSchema).parse(data)
}

export async function getMaintenanceTechnicians(): Promise<MaintenanceTechnician[]> {
  const { data, error } = await supabase
    .from('perfiles')
    .select('id,nombre_completo')
    .eq('rol', 'tecnico')
    .order('nombre_completo')
  if (error) throw error
  return z.array(technicianSchema).parse(data)
}

export async function assignMaintenanceTechnician(input: {
  activityId: string
  technicianId: string
}): Promise<void> {
  const { error } = await supabase.from('asignaciones_actividad').insert({
    id_actividad: input.activityId,
    id_tecnico: input.technicianId,
  })
  if (error) throw error
}

export async function getActivitiesPage(options: ActivityPageOptions) {
  let query = supabase
    .from('actividades')
    .select(
      'id,descripcion,estado,prioridad,creado_en,solicitud:solicitudes_mantenimiento!inner(numero_solicitud,id_area,area:areas(nombre),tipo:tipos_actividad(nombre))',
      { count: 'exact' },
    )

  if (options.areaId) query = query.eq('solicitud.id_area', options.areaId)
  if (options.status === 'activas') query = query.in('estado', ['pendiente', 'en_proceso'])
  if (options.status === 'en_proceso') query = query.eq('estado', 'en_proceso')
  if (options.status === 'finalizadas') query = query.eq('estado', 'finalizada')

  const first = options.page * ACTIVITY_PAGE_SIZE
  const { data, error, count } = await query
    .order('prioridad', { ascending: options.priorityDirection === 'asc' })
    .order('creado_en', { ascending: false })
    .order('id', { ascending: true })
    .range(first, first + ACTIVITY_PAGE_SIZE - 1)

  if (error) throw error
  return { items: z.array(activitySchema).parse(data), total: count ?? 0 }
}

export async function createMaintenanceRequestWithActivity(input: {
  requestNumber: string
  areaId: string
  equipmentId: string | null
  employeeId: string
  requestedOn: string
  activityTypeId: string
  requestDescription: string
  activityDescription: string
  priority: ActivityPriority
}): Promise<void> {
  const { error } = await supabase.rpc('crear_solicitud_con_actividad', {
    p_numero_solicitud: input.requestNumber.trim(),
    p_id_area: input.areaId,
    p_id_equipo: input.equipmentId,
    p_id_empleado: input.employeeId,
    p_fecha_solicitud: input.requestedOn,
    p_id_tipo_actividad: input.activityTypeId,
    p_descripcion_solicitud: input.requestDescription.trim(),
    p_descripcion_actividad: input.activityDescription.trim(),
    p_prioridad: input.priority,
  })
  if (error) throw error
}
