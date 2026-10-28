import { supabase } from '@/services/supabase/client'
import {
  dismissNotifications,
  listReadNotificationIds,
  listNotifications,
  markNotificationsRead,
  restoreNotifications,
} from '../notificationService'

jest.mock('@/services/supabase/client', () => ({ supabase: { from: jest.fn(), rpc: jest.fn() } }))
jest.mock('@/services/supabase/formerMembers', () => ({
  listFormerMemberNames: jest.fn().mockResolvedValue(new Map([['former', 'Marta Díaz']])),
  memberDisplayName: jest.requireActual('@/services/supabase/formerMembers').memberDisplayName,
}))

test('lee solo los campos necesarios de los avisos visibles por RLS', async () => {
  const limit = jest.fn().mockResolvedValue({
    data: [
      {
        id: 1,
        case_id: 'case-1',
        title: 'Aviso',
        body: 'Texto',
        action: 'reasignar',
        case: { case_number: 'CAS-2026-00001', title: 'Fuga' },
        event: { actor_id: 'former', comment: 'Trabajo reasignado', actor: null },
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
    {
      id: 1,
      caseId: 'case-1',
      readAt: null,
      action: 'reasignar',
      caseNumber: 'CAS-2026-00001',
      actorId: 'former',
      actorName: 'Marta Díaz (dado de baja)',
      comment: 'Trabajo reasignado',
    },
  ])
  expect(select).toHaveBeenCalledWith(
    'id,case_id,title,body,action,created_at,read_at,case:cases!notifications_case_id_fkey(case_number,title),event:case_events!notifications_event_id_fkey(actor_id,comment,actor:profiles!case_events_actor_id_fkey(full_name))',
  )
})

test('marca un aviso o todos mediante la función autorizada', async () => {
  const rpc = supabase.rpc as jest.Mock
  rpc.mockResolvedValue({ data: 2, error: null })
  await expect(markNotificationsRead([1])).resolves.toBe(2)
  await markNotificationsRead()
  expect(rpc).toHaveBeenNthCalledWith(1, 'mark_notifications_read', { notification_ids: [1] })
  expect(rpc).toHaveBeenNthCalledWith(2, 'mark_notifications_read', {})
})

test('oculta y restaura avisos con los argumentos de C-023', async () => {
  const rpc = supabase.rpc as jest.Mock
  rpc.mockReset().mockResolvedValue({ data: 2, error: null })
  await expect(dismissNotifications([1, 2])).resolves.toBe(2)
  await expect(dismissNotifications(null)).resolves.toBe(2)
  await expect(restoreNotifications([1, 2])).resolves.toBe(2)
  expect(rpc).toHaveBeenNthCalledWith(1, 'dismiss_notifications', { notification_ids: [1, 2] })
  expect(rpc).toHaveBeenNthCalledWith(2, 'dismiss_notifications', {})
  expect(rpc).toHaveBeenNthCalledWith(3, 'restore_notifications', { notification_ids: [1, 2] })
})

test('recupera todos los IDs leídos en páginas para poder deshacer el borrado masivo', async () => {
  const first = Array.from({ length: 1000 }, (_, index) => ({ id: index + 1 }))
  const range = jest
    .fn()
    .mockResolvedValueOnce({ data: first, error: null })
    .mockResolvedValueOnce({ data: [{ id: 1001 }], error: null })
  const order = jest.fn().mockReturnValue({ range })
  const not = jest.fn().mockReturnValue({ order })
  const select = jest.fn().mockReturnValue({ not })
  ;(supabase.from as jest.Mock).mockReturnValue({ select })
  await expect(listReadNotificationIds()).resolves.toHaveLength(1001)
  expect(not).toHaveBeenCalledWith('read_at', 'is', null)
  expect(range).toHaveBeenNthCalledWith(1, 0, 999)
  expect(range).toHaveBeenNthCalledWith(2, 1000, 1999)
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
