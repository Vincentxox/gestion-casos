import { z } from 'zod'

import { supabase } from '@/services/supabase/client'

const maintenanceRoleSchema = z.enum([
  'administrador',
  'coordinador',
  'tecnico',
  'auditor',
  'visualizador',
])

const maintenanceUserSchema = z.object({
  id: z.string().uuid(),
  nombre_completo: z.string(),
  rol: maintenanceRoleSchema,
  rol_confirmado_en: z.string().nullable(),
  creado_en: z.string(),
})

export type MaintenanceUser = z.infer<typeof maintenanceUserSchema>
export type AssignableRole = 'coordinador' | 'tecnico' | 'visualizador'

export async function getPendingRoleCount(): Promise<number> {
  const { count, error } = await supabase
    .from('perfiles')
    .select('id', { count: 'exact', head: true })
    .is('rol_confirmado_en', null)

  if (error) throw error
  return count ?? 0
}

export async function getMaintenanceUsers(): Promise<MaintenanceUser[]> {
  const { data, error } = await supabase
    .from('perfiles')
    .select('id,nombre_completo,rol,rol_confirmado_en,creado_en')
    .order('creado_en', { ascending: false })

  if (error) throw error
  return z.array(maintenanceUserSchema).parse(data)
}

export async function assignMaintenanceRole(input: {
  userId: string
  role: AssignableRole
}): Promise<void> {
  const { error } = await supabase.rpc('set_user_role', {
    target_user_id: input.userId,
    new_role: input.role,
  })

  if (error) throw error
}
