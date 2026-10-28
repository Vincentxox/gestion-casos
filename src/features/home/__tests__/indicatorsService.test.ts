import { supabase } from '@/services/supabase/client'
import {
  getCaseIndicators,
  listPriorityTargets,
  setPriorityTarget,
  validatePriorityTarget,
} from '../indicatorsService'

jest.mock('@/services/supabase/client', () => ({ supabase: { from: jest.fn(), rpc: jest.fn() } }))

test('valida los límites y el orden de los plazos', () => {
  expect(validatePriorityTarget(0, 24)).not.toBeNull()
  expect(validatePriorityTarget(4, 3)).not.toBeNull()
  expect(validatePriorityTarget(4, 24)).toBeNull()
})

test('consulta indicadores y propaga errores', async () => {
  const rpc = supabase.rpc as jest.Mock
  rpc.mockResolvedValueOnce({ data: { total: 3 }, error: null })
  await expect(getCaseIndicators()).resolves.toMatchObject({ total: 3 })
  const error = new Error('Sin permiso')
  rpc.mockResolvedValueOnce({ data: null, error })
  await expect(getCaseIndicators()).rejects.toBe(error)
})

test('lee y actualiza plazos con el contrato del servidor', async () => {
  const eq = jest.fn().mockResolvedValue({
    data: [{ priority: 'alta', accept_hours: 4, resolve_hours: 24 }],
    error: null,
  })
  ;(supabase.from as jest.Mock).mockReturnValue({ select: jest.fn().mockReturnValue({ eq }) })
  await expect(listPriorityTargets('org')).resolves.toEqual([
    { priority: 'alta', acceptHours: 4, resolveHours: 24 },
  ])
  const rpc = supabase.rpc as jest.Mock
  rpc.mockResolvedValueOnce({
    data: { priority: 'alta', accept_hours: 5, resolve_hours: 25 },
    error: null,
  })
  await expect(
    setPriorityTarget({ priority: 'alta', acceptHours: 5, resolveHours: 25 }),
  ).resolves.toMatchObject({ acceptHours: 5 })
  expect(rpc).toHaveBeenCalledWith('set_priority_target', {
    target_priority: 'alta',
    new_accept_hours: 5,
    new_resolve_hours: 25,
  })
  await expect(
    setPriorityTarget({ priority: 'alta', acceptHours: 30, resolveHours: 20 }),
  ).rejects.toThrow()
})

test('ordena prioridades y conserva errores de lectura y escritura', async () => {
  const eq = jest.fn().mockResolvedValueOnce({
    data: ['baja', 'alta', 'media'].map((priority) => ({
      priority,
      accept_hours: 4,
      resolve_hours: 24,
    })),
    error: null,
  })
  ;(supabase.from as jest.Mock).mockReturnValue({ select: jest.fn().mockReturnValue({ eq }) })
  expect((await listPriorityTargets('org')).map((item) => item.priority)).toEqual([
    'alta',
    'media',
    'baja',
  ])
  const error = new Error('Sin conexión')
  eq.mockResolvedValueOnce({ data: null, error })
  await expect(listPriorityTargets('org')).rejects.toBe(error)
  ;(supabase.rpc as jest.Mock).mockResolvedValueOnce({ data: null, error })
  await expect(
    setPriorityTarget({ priority: 'media', acceptHours: 8, resolveHours: 72 }),
  ).rejects.toBe(error)
})

test('envía el intervalo de creación al servidor', async () => {
  const rpc = supabase.rpc as jest.Mock
  rpc.mockResolvedValueOnce({ data: { total: 0 }, error: null })
  await getCaseIndicators('2026-10-01T00:00:00Z', '2026-11-01T00:00:00Z')
  expect(rpc).toHaveBeenLastCalledWith('get_case_indicators', {
    period_start: '2026-10-01T00:00:00Z',
    period_end: '2026-11-01T00:00:00Z',
  })
})
