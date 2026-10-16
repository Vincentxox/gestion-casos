import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { homeSummaryQueryKey } from '@/features/home/useHomeSummary'
import { AppFeedback } from '@/components/feedback/AppFeedback'
import { listNotifications, markNotificationsRead } from './notificationService'

export const notificationsQueryKey = ['notifications'] as const

export function useNotifications() {
  return useQuery({ queryKey: notificationsQueryKey, queryFn: listNotifications })
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
