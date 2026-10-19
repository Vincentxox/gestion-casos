import type { QueryClient } from '@tanstack/react-query'

import { photosQueryKey } from '@/features/photos/usePhotos'
import { reportsQueryKey } from '@/features/reports/useReports'
import { nextStepsQueryKey } from '@/features/home/nextStepsQueryKey'

import { casesQueryKey } from './useCases'

export async function refreshCaseDetail(client: QueryClient, caseId: string) {
  await Promise.all([
    client.invalidateQueries({ queryKey: [...casesQueryKey, caseId] }),
    client.invalidateQueries({ queryKey: nextStepsQueryKey }),
    client.invalidateQueries({ queryKey: [...reportsQueryKey, caseId] }),
    client.invalidateQueries({ queryKey: [...photosQueryKey, caseId] }),
  ])
}
