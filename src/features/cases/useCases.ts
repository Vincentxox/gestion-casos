import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { createCase, getCase, listCaseHistory, listCases } from './caseService'
import type { CreateCaseInput } from './types'

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
