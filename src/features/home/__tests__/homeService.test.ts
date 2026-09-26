import { supabase } from '@/services/supabase/client'
import { getHomeSummary } from '../homeService'

jest.mock('@/services/supabase/client', () => ({ supabase: { rpc: jest.fn() } }))

test('obtiene el resumen del servidor', async () => {
  const rpc = supabase.rpc as jest.Mock
  rpc.mockResolvedValueOnce({ data: { has_area: true, role: 'tecnico' }, error: null })
  await expect(getHomeSummary()).resolves.toMatchObject({ has_area: true })
  expect(rpc).toHaveBeenCalledWith('get_home_summary')
  const error = new Error('Sin empresa')
  rpc.mockResolvedValueOnce({ error })
  await expect(getHomeSummary()).rejects.toBe(error)
})
