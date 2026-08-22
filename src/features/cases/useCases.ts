import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  assignCase,
  changeCaseStatus,
  createCase,
  getCase,
  listAssignableProfiles,
  listCaseHistory,
  listCases,
  updateCase,
} from './caseService'
import type { ChangeCaseStatusInput, CreateCaseInput, UpdateCaseInput } from './types'

export const casesQueryKey = ['cases'] as const

export function useCases() {
  return useQuery({ queryKey: casesQueryKey, queryFn: listCases })
}

export function useCreateCase() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ input, userId }: { input: CreateCaseInput; userId: string }) =>
      createCase(input, userId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: casesQueryKey })
    },
  })
}

export function useCaseDetail(caseId: string) {
  return useQuery({ queryKey: [...casesQueryKey, caseId], queryFn: () => getCase(caseId) })
}

export function useCaseHistory(caseId: string) {
  return useQuery({
    queryKey: [...casesQueryKey, caseId, 'history'],
    queryFn: () => listCaseHistory(caseId),
  })
}

export function useUpdateCase(caseId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UpdateCaseInput) => updateCase(caseId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: casesQueryKey })
    },
  })
}

export function useChangeCaseStatus(caseId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: ChangeCaseStatusInput) => changeCaseStatus(caseId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: casesQueryKey })
    },
  })
}

export function useAssignableProfiles(enabled: boolean) {
  return useQuery({
    queryKey: ['assignable-profiles'],
    queryFn: listAssignableProfiles,
    enabled,
  })
}

export function useAssignCase(caseId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (assignedTo: string | null) => assignCase(caseId, assignedTo),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: casesQueryKey })
    },
  })
}
