import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { homeSummaryQueryKey } from '@/features/home/useHomeSummary'
import { AppFeedback } from '@/components/feedback/AppFeedback'
import {
  dismissNotifications,
  listReadNotificationIds,
  listNotifications,
  markNotificationsRead,
  restoreNotifications,
  type AppNotification,
} from './notificationService'
import { notificationsQueryKey } from './notificationQueryKey'

export { notificationsQueryKey } from './notificationQueryKey'

export function useNotifications() {
  return useQuery({ queryKey: notificationsQueryKey, queryFn: listNotifications })
}

export function useReadNotificationIds() {
  return useQuery({
    queryKey: [...notificationsQueryKey, 'read-ids'],
    queryFn: listReadNotificationIds,
  })
}

export function useMarkNotificationsRead() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: markNotificationsRead,
    onError: () =>
      AppFeedback.show(
        'No fue posible marcar el aviso',
        'Comprueba tu conexión e inténtalo de nuevo.',
      ),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: notificationsQueryKey }),
        client.invalidateQueries({ queryKey: homeSummaryQueryKey }),
      ])
    },
  })
}

export function useDismissNotifications() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: dismissNotifications,
    onMutate: async (ids: number[] | null) => {
      await client.cancelQueries({ queryKey: notificationsQueryKey })
      const previous = client.getQueryData<AppNotification[]>(notificationsQueryKey)
      const removed =
        previous?.filter((item) => item.readAt && (ids === null || ids.includes(item.id))) ?? []
      client.setQueryData<AppNotification[]>(notificationsQueryKey, (items) =>
        items?.filter((item) => !removed.some((entry) => entry.id === item.id)),
      )
      return { removed }
    },
    onError: (_error, _ids, context) => {
      if (context?.removed.length) {
        client.setQueryData<AppNotification[]>(notificationsQueryKey, (items) =>
          [
            ...(items ?? []),
            ...context.removed.filter((item) => !items?.some((present) => present.id === item.id)),
          ].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        )
      }
      AppFeedback.show(
        'No fue posible borrar el aviso',
        'Comprueba tu conexión e inténtalo de nuevo.',
      )
    },
    onSettled: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: notificationsQueryKey }),
        client.invalidateQueries({ queryKey: homeSummaryQueryKey }),
      ])
    },
  })
}

export function useRestoreNotifications() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: restoreNotifications,
    onError: () =>
      AppFeedback.show(
        'No fue posible restaurar el aviso',
        'Comprueba tu conexión e inténtalo de nuevo.',
      ),
    onSettled: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: notificationsQueryKey }),
        client.invalidateQueries({ queryKey: homeSummaryQueryKey }),
      ])
    },
  })
}
