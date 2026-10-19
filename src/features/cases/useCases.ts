import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  assignCase,
  changeCaseStatus,
  countCasesByStatus,
  createCase,
  getCase,
  getCaseActions,
  listAssignableProfiles,
  listCaseHistory,
  listCases,
  CASE_PAGE_SIZE,
  sendCaseMessage,
  updateCase,
} from './caseService'
import type { ChangeCaseStatusInput, CreateCaseInput, UpdateCaseInput } from './types'
import { homeSummaryQueryKey } from '@/features/home/useHomeSummary'
import { notificationsQueryKey } from '@/features/notifications/notificationQueryKey'
import { feedback } from '@/services/feedback'
import type { CaseSearchFilters } from './caseSearch'

export const casesQueryKey = ['cases'] as const

export function useCases(filters: CaseSearchFilters, enabled = true) {
  return useInfiniteQuery({
    queryKey: [...casesQueryKey, 'search', filters],
    queryFn: ({ pageParam }) => listCases(filters, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) =>
      lastPage.length === CASE_PAGE_SIZE ? pages.length : undefined,
    enabled,
  })
}

export function useCaseCounts(filters: CaseSearchFilters, enabled = true) {
  return useQuery({
    queryKey: [
      ...casesQueryKey,
      'counts',
      filters.scope,
      filters.statuses,
      filters.priorities,
      filters.createdFrom,
      filters.createdTo,
      filters.overdueOnly,
      filters.unassignedOnly,
      filters.searchText,
    ],
    queryFn: () => countCasesByStatus(filters),
    enabled,
  })
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

export function useCaseActions(caseId: string) {
  return useQuery({
    queryKey: [...casesQueryKey, caseId, 'actions'],
    queryFn: () => getCaseActions(caseId),
  })
}

export function useCaseHistory(caseId: string) {
  return useQuery({
    queryKey: [...casesQueryKey, caseId, 'history'],
    queryFn: () => listCaseHistory(caseId),
  })
}

export function useSendCaseMessage(caseId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (message: string) => sendCaseMessage(caseId, message),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [...casesQueryKey, caseId, 'history'] }),
        queryClient.invalidateQueries({ queryKey: [...casesQueryKey, caseId, 'actions'] }),
        queryClient.invalidateQueries({ queryKey: notificationsQueryKey }),
      ])
    },
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
    mutationFn: ({ assignedTo, comment }: { assignedTo: string; comment?: string }) =>
      assignCase(caseId, assignedTo, comment),
    onSuccess: async () => {
      void feedback.success()
      await queryClient.invalidateQueries({ queryKey: casesQueryKey })
      await queryClient.invalidateQueries({ queryKey: homeSummaryQueryKey })
    },
  })
}
