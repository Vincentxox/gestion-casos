import { z } from 'zod'

import { supabase } from '@/services/supabase/client'

const activitySchema = z.object({
  id: z.string().uuid(),
  descripcion: z.string(),
  estado: z.enum(['pendiente', 'en_proceso', 'finalizada']),
})

const assignmentSchema = z.object({
  actividad: activitySchema.nullable(),
})

export type AssignedActivity = z.infer<typeof activitySchema>

export async function getRecentAssignedActivities(userId: string): Promise<AssignedActivity[]> {
  const { data, error } = await supabase
    .from('asignaciones_actividad')
    .select('actividad:actividades(id, descripcion, estado)')
    .eq('id_tecnico', userId)
    .eq('activa', true)
    .order('asignada_en', { ascending: false })
    .limit(10)

  if (error) throw error

  return z
    .array(assignmentSchema)
    .parse(data)
    .flatMap(({ actividad }) => (actividad ? [actividad] : []))
}
