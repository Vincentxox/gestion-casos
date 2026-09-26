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
import { homeSummaryQueryKey } from '@/features/home/useHomeSummary'
import { feedback } from '@/services/feedback'

export const casesQueryKey = ['cases'] as const

export function useCases(enabled = true) {
  return useQuery({ queryKey: casesQueryKey, queryFn: listCases, enabled })
}

export function useCreateCase() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateCaseInput) => createCase(input),
    onSuccess: async () => {
      void feedback.success()
      await queryClient.invalidateQueries({ queryKey: casesQueryKey })
      await queryClient.invalidateQueries({ queryKey: homeSummaryQueryKey })
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
      await queryClient.invalidateQueries({ queryKey: homeSummaryQueryKey })
    },
  })
}

export function useChangeCaseStatus(caseId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: ChangeCaseStatusInput) => changeCaseStatus(caseId, input),
    onSuccess: async (_data, input) => {
      void (['rechazar', 'cancelar', 'pausar'].includes(input.action)
        ? feedback.warning()
        : feedback.success())
      await queryClient.invalidateQueries({ queryKey: casesQueryKey })
      await queryClient.invalidateQueries({ queryKey: homeSummaryQueryKey })
    },
  })
}

export function useAssignableProfiles(targetAreaId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['assignable-profiles', targetAreaId],
    queryFn: () => listAssignableProfiles(targetAreaId!),
    enabled: enabled && Boolean(targetAreaId),
  })
}

export function useAssignCase(caseId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (assignedTo: string) => assignCase(caseId, assignedTo),
    onSuccess: async () => {
      void feedback.success()
      await queryClient.invalidateQueries({ queryKey: casesQueryKey })
      await queryClient.invalidateQueries({ queryKey: homeSummaryQueryKey })
    },
  })
}
