import { supabase } from '@/services/supabase/client'
import {
  approveAccessRequest,
  listAccessRequests,
  rejectAccessRequest,
} from '../accessRequestService'

jest.mock('@/services/supabase/client', () => ({ supabase: { from: jest.fn(), rpc: jest.fn() } }))

test('lista solicitudes y ejecuta decisiones con parámetros del contrato', async () => {
  const query = { select: jest.fn(), order: jest.fn(), limit: jest.fn() }
  ;(supabase.from as jest.Mock).mockReturnValue(query)
  query.select.mockReturnValue(query)
  query.order.mockReturnValue(query)
  query.limit.mockResolvedValue({
    data: [
      {
        id: '1',
        email: 'a@example.com',
        full_name: 'Ana',
        status: 'pendiente',
        created_at: '2026-01-01',
        decision_note: null,
      },
    ],
    error: null,
  })
  await expect(listAccessRequests()).resolves.toMatchObject([
    { fullName: 'Ana', status: 'pendiente' },
  ])
  const rpc = supabase.rpc as jest.Mock
  rpc.mockResolvedValue({ error: null })
  await approveAccessRequest('1', 'tecnico', 'area')
  expect(rpc).toHaveBeenCalledWith('approve_access_request', {
    target_request_id: '1',
    new_role: 'tecnico',
    new_area_id: 'area',
  })
  await rejectAccessRequest('1', '  Motivo  ')
  expect(rpc).toHaveBeenCalledWith('reject_access_request', {
    target_request_id: '1',
    note: 'Motivo',
  })
})

test('propaga errores del servidor', async () => {
  const error = new Error('Acceso denegado')
  ;(supabase.rpc as jest.Mock).mockResolvedValue({ error })
  await expect(approveAccessRequest('1', 'auditor', null)).rejects.toBe(error)
  await expect(rejectAccessRequest('1', '')).rejects.toBe(error)
})
