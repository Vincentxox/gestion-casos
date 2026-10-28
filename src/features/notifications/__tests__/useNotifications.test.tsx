import { act, renderHook, waitFor } from '@testing-library/react-native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { PropsWithChildren } from 'react'

import { AppFeedback } from '@/components/feedback/AppFeedback'
import type { AppNotification } from '../notificationService'
import { notificationsQueryKey, useDismissNotifications } from '../useNotifications'
import { dismissNotifications } from '../notificationService'

jest.mock('../notificationService', () => ({ dismissNotifications: jest.fn() }))
jest.mock('@/features/home/useHomeSummary', () => ({ homeSummaryQueryKey: ['home-summary'] }))
jest.spyOn(AppFeedback, 'show').mockImplementation(() => {})

const item = (id: number, read: boolean): AppNotification => ({
  id,
  caseId: 'case',
  title: 'Aviso',
  body: '',
  action: 'mensaje',
  caseNumber: null,
  caseTitle: null,
  actorId: null,
  actorName: null,
  comment: null,
  createdAt: '2026-10-24',
  readAt: read ? '2026-10-24' : null,
})

async function setup() {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false, gcTime: 0 }, queries: { retry: false } },
  })
  client.setQueryData(notificationsQueryKey, [item(1, true), item(2, false)])
  return {
    client,
    ...(await renderHook(() => useDismissNotifications(), {
      wrapper: ({ children }: PropsWithChildren) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    })),
  }
}

test('quita optimistamente solo los leídos y los repone al fallar', async () => {
  let reject!: (error: Error) => void
  ;(dismissNotifications as jest.Mock).mockImplementation(
    () =>
      new Promise((_resolve, fail) => {
        reject = fail
      }),
  )
  const { client, result, unmount } = await setup()
  await act(async () => {
    result.current.mutate([1, 2])
  })
  await waitFor(() =>
    expect(client.getQueryData<AppNotification[]>(notificationsQueryKey)?.map((n) => n.id)).toEqual(
      [2],
    ),
  )
  await act(async () => {
    reject(new Error('Sin conexión'))
  })
  await waitFor(() =>
    expect(client.getQueryData<AppNotification[]>(notificationsQueryKey)?.map((n) => n.id)).toEqual(
      [2, 1],
    ),
  )
  expect(AppFeedback.show).toHaveBeenCalledWith(
    'No fue posible borrar el aviso',
    expect.any(String),
    { tone: 'error' },
  )
  await waitFor(() => expect(result.current.isPending).toBe(false))
  await unmount()
  client.clear()
})
