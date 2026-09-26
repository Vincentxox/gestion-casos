import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { createInvitation, listInvitations, revokeInvitation } from './invitationService'
import { feedback } from '@/services/feedback'

export const invitationsQueryKey = ['invitations'] as const

export function useInvitations() {
  return useQuery({ queryKey: invitationsQueryKey, queryFn: listInvitations })
}

export function useCreateInvitation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createInvitation,
    onSuccess: () => {
      void feedback.success()
      return queryClient.invalidateQueries({ queryKey: invitationsQueryKey })
    },
  })
}

export function useRevokeInvitation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: revokeInvitation,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: invitationsQueryKey }),
  })
}
