import { supabase } from '@/services/supabase/client'

import {
  assignMaintenanceRole,
  getMaintenanceUsers,
  getPendingRoleCount,
} from '../maintenanceUserService'

jest.mock('@/services/supabase/client', () => ({
  supabase: { from: jest.fn(), rpc: jest.fn() },
}))

const from = supabase.from as unknown as jest.Mock
const rpc = supabase.rpc as unknown as jest.Mock
const userId = '00000000-0000-4000-8000-000000000001'

beforeEach(() => jest.clearAllMocks())

test('la campana cuenta solo perfiles cuyo rol aún no se confirmó', async () => {
  const is = jest.fn().mockResolvedValue({ count: 2, error: null })
  const select = jest.fn().mockReturnValue({ is })
  from.mockReturnValue({ select })

  await expect(getPendingRoleCount()).resolves.toBe(2)
  expect(from).toHaveBeenCalledWith('perfiles')
  expect(select).toHaveBeenCalledWith('id', { count: 'exact', head: true })
  expect(is).toHaveBeenCalledWith('rol_confirmado_en', null)
})

test('la lista conserva los perfiles pendientes para asignarles rol', async () => {
  const order = jest.fn().mockResolvedValue({
    data: [
      {
        id: userId,
        nombre_completo: 'Usuario de prueba',
        rol: 'visualizador',
        rol_confirmado_en: null,
        creado_en: '2026-09-20T10:00:00Z',
      },
    ],
    error: null,
  })
  from.mockReturnValue({ select: jest.fn().mockReturnValue({ order }) })

  await expect(getMaintenanceUsers()).resolves.toHaveLength(1)
  expect(order).toHaveBeenCalledWith('creado_en', { ascending: false })
})

test('asignar rol llama a la función protegida de la base', async () => {
  rpc.mockResolvedValue({ error: null })

  await assignMaintenanceRole({ userId, role: 'tecnico' })

  expect(rpc).toHaveBeenCalledWith('set_user_role', {
    target_user_id: userId,
    new_role: 'tecnico',
  })
})

test('propaga errores de permisos al intentar asignar un rol', async () => {
  const error = new Error('Acceso denegado')
  rpc.mockResolvedValue({ error })

  await expect(assignMaintenanceRole({ userId, role: 'coordinador' })).rejects.toBe(error)
})
