import { supabase } from '@/services/supabase/client'
import { getHomeSummary, listNextSteps } from '../homeService'

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

test('lista hasta 20 decisiones con conteo exacto, plazo y acción calculada', async () => {
  const range = jest.fn().mockResolvedValue({
    data: [
      {
        id: 'case-1',
        case_number: 'CAS-2026-00001',
        title: 'Fuga',
        priority: 'alta',
        status: 'solicitado',
        next_step: 'aceptar',
        due_at: '2026-10-19T12:00:00Z',
        overdue_stage: null,
        category: { name: 'Plomería' },
        updated_at: '2026-10-18T10:00:00Z',
      },
    ],
    count: 23,
    error: null,
  })
  const order = jest.fn().mockReturnValue({ order: jest.fn().mockReturnValue({ range }) })
  const select = jest.fn().mockReturnValue({ order })
  ;(supabase.rpc as jest.Mock).mockReturnValueOnce({ select })

  await expect(listNextSteps()).resolves.toEqual({
    total: 23,
    items: [
      {
        id: 'case-1',
        caseNumber: 'CAS-2026-00001',
        title: 'Fuga',
        category: 'Plomería',
        priority: 'alta',
        status: 'solicitado',
        action: 'aceptar',
        dueAt: '2026-10-19T12:00:00Z',
        overdueStage: null,
        updatedAt: '2026-10-18T10:00:00Z',
      },
    ],
  })
  expect(supabase.rpc).toHaveBeenCalledWith('list_next_steps', undefined, { count: 'exact' })
  expect(select).toHaveBeenCalledWith(expect.stringContaining('next_step,due_at,overdue_stage'))
  expect(order).toHaveBeenCalledWith('due_at', { ascending: true, nullsFirst: false })
  expect(range).toHaveBeenCalledWith(0, 19)
})

test('la cola vacía no es error y la RPC propaga errores', async () => {
  const range = jest
    .fn()
    .mockResolvedValueOnce({ data: [], count: 0, error: null })
    .mockResolvedValueOnce({ data: null, count: null, error: new Error('Sin conexión') })
  const order = jest.fn().mockReturnValue({ order: jest.fn().mockReturnValue({ range }) })
  ;(supabase.rpc as jest.Mock).mockReturnValue({ select: jest.fn().mockReturnValue({ order }) })
  await expect(listNextSteps()).resolves.toEqual({ items: [], total: 0 })
  await expect(listNextSteps()).rejects.toThrow('Sin conexión')
})
