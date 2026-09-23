import { useQuery } from '@tanstack/react-query'

import { getHomeSummary } from './homeService'

export const homeSummaryQueryKey = ['home-summary'] as const

export function useHomeSummary(enabled = true) {
  return useQuery({ queryKey: homeSummaryQueryKey, queryFn: getHomeSummary, enabled })
}
