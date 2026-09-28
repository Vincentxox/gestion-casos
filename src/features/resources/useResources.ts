import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  addCaseUsage,
  createResource,
  deleteCaseUsage,
  listCaseUsages,
  listResources,
  setResourceActive,
  updateCaseUsage,
  updateResource,
} from './resourceService'
import type { ResourceInput, UsageInput } from './types'

export const resourcesQueryKey = ['resources'] as const
export const caseUsagesQueryKey = (caseId: string) => ['cases', caseId, 'usages'] as const

export function useResources() {
  return useQuery({ queryKey: resourcesQueryKey, queryFn: listResources })
}

export function useCreateResource() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: createResource,
    onSuccess: () => client.invalidateQueries({ queryKey: resourcesQueryKey }),
  })
}

export function useUpdateResource() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ resourceId, input }: { resourceId: string; input: ResourceInput }) =>
      updateResource(resourceId, input),
    onSuccess: () => client.invalidateQueries({ queryKey: resourcesQueryKey }),
  })
}

export function useSetResourceActive() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ resourceId, isActive }: { resourceId: string; isActive: boolean }) =>
      setResourceActive(resourceId, isActive),
    onSuccess: () => client.invalidateQueries({ queryKey: resourcesQueryKey }),
  })
}

export function useCaseUsages(caseId: string) {
  return useQuery({ queryKey: caseUsagesQueryKey(caseId), queryFn: () => listCaseUsages(caseId) })
}

export function useAddCaseUsage(caseId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: UsageInput) => addCaseUsage(caseId, input),
    onSuccess: () => client.invalidateQueries({ queryKey: caseUsagesQueryKey(caseId) }),
  })
}

export function useUpdateCaseUsage(caseId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({
      usageId,
      input,
    }: {
      usageId: string
      input: Pick<UsageInput, 'quantity' | 'hours' | 'notes'>
    }) => updateCaseUsage(usageId, input),
    onSuccess: () => client.invalidateQueries({ queryKey: caseUsagesQueryKey(caseId) }),
  })
}

export function useDeleteCaseUsage(caseId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: deleteCaseUsage,
    onSuccess: () => client.invalidateQueries({ queryKey: caseUsagesQueryKey(caseId) }),
  })
}
