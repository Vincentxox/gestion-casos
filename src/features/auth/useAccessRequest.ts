import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  cancelMyAccessRequest,
  getMyAccessRequest,
  requestOrganizationAccess,
} from './accessService'

export const myAccessRequestQueryKey = ['my-access-request'] as const

export function useMyAccessRequest() {
  return useQuery({
    queryKey: myAccessRequestQueryKey,
    queryFn: getMyAccessRequest,
    refetchInterval: (query) => (query.state.data?.status === 'pendiente' ? 45_000 : false),
  })
}

export function useRequestOrganizationAccess() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: requestOrganizationAccess,
    onSuccess: () => client.invalidateQueries({ queryKey: myAccessRequestQueryKey }),
  })
}

export function useCancelMyAccessRequest() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: cancelMyAccessRequest,
    onSuccess: () => client.invalidateQueries({ queryKey: myAccessRequestQueryKey }),
  })
}
