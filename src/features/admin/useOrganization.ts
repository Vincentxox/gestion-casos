import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  getOrganization,
  getOrganizationJoinCode,
  regenerateOrganizationJoinCode,
  renameOrganization,
} from './organizationService'

export const organizationQueryKey = ['organization'] as const

export function useOrganization(organizationId: string | null | undefined) {
  return useQuery({
    queryKey: [...organizationQueryKey, organizationId],
    queryFn: () => getOrganization(organizationId!),
    enabled: Boolean(organizationId),
  })
}

export function useRenameOrganization(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => renameOrganization(organizationId, name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: organizationQueryKey }),
  })
}

export const joinCodeQueryKey = ['organization-join-code'] as const

export function useOrganizationJoinCode() {
  return useQuery({ queryKey: joinCodeQueryKey, queryFn: getOrganizationJoinCode })
}

export function useRegenerateOrganizationJoinCode() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: regenerateOrganizationJoinCode,
    onSuccess: (code) => client.setQueryData(joinCodeQueryKey, code),
  })
}
