import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AppRole } from '@/features/auth/types'
import { homeSummaryQueryKey } from '@/features/home/useHomeSummary'
import { feedback } from '@/services/feedback'

import {
  approveAccessRequest,
  listAccessRequests,
  rejectAccessRequest,
} from './accessRequestService'

export const accessRequestsQueryKey = ['access-requests'] as const

export function useAccessRequests() {
  return useQuery({ queryKey: accessRequestsQueryKey, queryFn: listAccessRequests })
}

export function useApproveAccessRequest() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, role, areaId }: { id: string; role: AppRole; areaId: string | null }) =>
      approveAccessRequest(id, role, areaId),
    onSuccess: async () => {
      void feedback.success()
      await client.invalidateQueries({ queryKey: accessRequestsQueryKey })
      await client.invalidateQueries({ queryKey: homeSummaryQueryKey })
    },
  })
}

export function useRejectAccessRequest() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) => rejectAccessRequest(id, note),
    onSuccess: async () => {
      void feedback.warning()
      await client.invalidateQueries({ queryKey: accessRequestsQueryKey })
      await client.invalidateQueries({ queryKey: homeSummaryQueryKey })
    },
  })
}
