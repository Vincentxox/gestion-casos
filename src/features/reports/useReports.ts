import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { casesQueryKey } from '@/features/cases/useCases'
import { photosQueryKey } from '@/features/photos/usePhotos'
import { homeSummaryQueryKey } from '@/features/home/useHomeSummary'
import { caseUsagesQueryKey } from '@/features/resources/useResources'

import {
  getReportDraft,
  listAreaChiefs,
  listCurrentReportSigners,
  listReportSignatures,
  listReportVersions,
  returnReport,
  saveReportDraft,
  signReport,
  type SignatureAction,
} from './reportService'
import type { ReportDraftInput } from './types'

export const reportsQueryKey = ['case-reports'] as const

export function useReportDraft(caseId: string) {
  return useQuery({
    queryKey: [...reportsQueryKey, caseId, 'draft'],
    queryFn: () => getReportDraft(caseId),
  })
}

export function useReportVersions(caseId: string) {
  return useQuery({
    queryKey: [...reportsQueryKey, caseId, 'versions'],
    queryFn: () => listReportVersions(caseId),
  })
}

export function useReportSignatures(caseId: string) {
  return useQuery({
    queryKey: [...reportsQueryKey, caseId, 'signatures'],
    queryFn: () => listReportSignatures(caseId),
  })
}

export function useCurrentReportSigners(caseId: string) {
  return useQuery({
    queryKey: [...reportsQueryKey, caseId, 'current-signers'],
    queryFn: () => listCurrentReportSigners(caseId),
  })
}

export function useAreaChiefs() {
  return useQuery({ queryKey: [...reportsQueryKey, 'chiefs'], queryFn: listAreaChiefs })
}

export function useSaveReportDraft(caseId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: ReportDraftInput) => saveReportDraft(caseId, input),
    onSuccess: (draft) => client.setQueryData([...reportsQueryKey, caseId, 'draft'], draft),
  })
}

async function invalidateReportData(client: ReturnType<typeof useQueryClient>, caseId: string) {
  await Promise.all([
    client.invalidateQueries({ queryKey: casesQueryKey }),
    client.invalidateQueries({ queryKey: [...reportsQueryKey, caseId] }),
    client.invalidateQueries({ queryKey: [...photosQueryKey, caseId] }),
    client.invalidateQueries({ queryKey: caseUsagesQueryKey(caseId) }),
    client.invalidateQueries({ queryKey: homeSummaryQueryKey }),
  ])
}

export function useSignReport(caseId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ action, stroke }: { action: SignatureAction; stroke: string }) =>
      signReport(caseId, action, stroke),
    onSuccess: () => invalidateReportData(client, caseId),
  })
}

export function useReturnReport(caseId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (reason: string) => returnReport(caseId, reason),
    onSuccess: () => invalidateReportData(client, caseId),
  })
}
