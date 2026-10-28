import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  cancelOrganizationCreationRequest,
  getMyOrganizationCreationRequest,
  isPlatformAdmin,
  listOrganizationCreationRequests,
  requestOrganizationCreation,
  reviewOrganizationCreationRequest,
  type OrganizationRequestStatus,
} from './organizationRequestService'

export const myOrganizationRequestKey = ['my-organization-creation-request'] as const
export const platformAdminKey = ['is-platform-admin'] as const
export const organizationRequestsKey = ['organization-creation-requests'] as const

export function useMyOrganizationCreationRequest() {
  return useQuery({
    queryKey: myOrganizationRequestKey,
    queryFn: getMyOrganizationCreationRequest,
    refetchInterval: (query) => (query.state.data?.status === 'pendiente' ? 45_000 : false),
  })
}

export function useRequestOrganizationCreation() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: requestOrganizationCreation,
    onSuccess: () => client.invalidateQueries({ queryKey: myOrganizationRequestKey }),
  })
}

export function useCancelOrganizationCreationRequest() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: cancelOrganizationCreationRequest,
    onSuccess: () => client.invalidateQueries({ queryKey: myOrganizationRequestKey }),
  })
}

export function useIsPlatformAdmin() {
  return useQuery({ queryKey: platformAdminKey, queryFn: isPlatformAdmin, retry: false })
}

export function useOrganizationCreationRequests(status: OrganizationRequestStatus, enabled = true) {
  return useQuery({
    queryKey: [...organizationRequestsKey, status],
    queryFn: () => listOrganizationCreationRequests(status),
    enabled,
  })
}

export function useReviewedOrganizationCreationRequests(enabled = true) {
  return useQuery({
    queryKey: [...organizationRequestsKey, 'reviewed'],
    queryFn: async () => {
      const rows = await Promise.all(
        (['aprobada', 'rechazada', 'cancelada'] as const).map(listOrganizationCreationRequests),
      )
      return rows
        .flat()
        .sort((a, b) => (b.reviewedAt ?? b.createdAt).localeCompare(a.reviewedAt ?? a.createdAt))
    },
    enabled,
  })
}

export function useReviewOrganizationCreationRequest() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: reviewOrganizationCreationRequest,
    onSuccess: () => client.invalidateQueries({ queryKey: organizationRequestsKey }),
  })
}
