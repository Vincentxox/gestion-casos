import { supabase } from '@/services/supabase/client'
import { listNotifications, markNotificationsRead } from '../notificationService'

jest.mock('@/services/supabase/client', () => ({ supabase: { from: jest.fn(), rpc: jest.fn() } }))

test('lee solo los campos necesarios de los avisos visibles por RLS', async () => {
  const limit = jest.fn().mockResolvedValue({
    data: [
      {
        id: 1,
        case_id: 'case-1',
        title: 'Aviso',
        body: 'Texto',
        created_at: '2026-10-14',
        read_at: null,
      },
    ],
    error: null,
  })
  const order = jest.fn().mockReturnValue({ limit })
  const select = jest.fn().mockReturnValue({ order })
  ;(supabase.from as jest.Mock).mockReturnValue({ select })
  await expect(listNotifications()).resolves.toMatchObject([
    { id: 1, caseId: 'case-1', readAt: null },
  ])
  expect(select).toHaveBeenCalledWith('id,case_id,title,body,created_at,read_at')
})

test('marca un aviso o todos mediante la función autorizada', async () => {
  const rpc = supabase.rpc as jest.Mock
  rpc.mockResolvedValue({ data: 2, error: null })
  await expect(markNotificationsRead([1])).resolves.toBe(2)
  await markNotificationsRead()
  expect(rpc).toHaveBeenNthCalledWith(1, 'mark_notifications_read', { notification_ids: [1] })
  expect(rpc).toHaveBeenNthCalledWith(2, 'mark_notifications_read', {})
})

test('propaga errores de lectura y marcado', async () => {
  const error = new Error('Sin conexión')
  const limit = jest.fn().mockResolvedValue({ data: null, error })
  ;(supabase.from as jest.Mock).mockReturnValue({
    select: jest.fn().mockReturnValue({ order: jest.fn().mockReturnValue({ limit }) }),
  })
  await expect(listNotifications()).rejects.toBe(error)
  ;(supabase.rpc as jest.Mock).mockResolvedValueOnce({ data: null, error })
  await expect(markNotificationsRead([1])).rejects.toBe(error)
})
