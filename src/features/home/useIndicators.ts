import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getCaseIndicators, listPriorityTargets, setPriorityTarget } from './indicatorsService'

export const indicatorsQueryKey = ['case-indicators'] as const
export const priorityTargetsQueryKey = ['priority-targets'] as const

export function useCaseIndicators(
  enabled: boolean,
  periodStart: string | null = null,
  periodEnd: string | null = null,
) {
  return useQuery({
    queryKey: [...indicatorsQueryKey, periodStart, periodEnd],
    queryFn: () => getCaseIndicators(periodStart, periodEnd),
    enabled,
  })
}

export function usePriorityTargets(organizationId: string | null | undefined) {
  return useQuery({
    queryKey: [...priorityTargetsQueryKey, organizationId],
    queryFn: () => listPriorityTargets(organizationId!),
    enabled: Boolean(organizationId),
  })
}

export function useSetPriorityTarget() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: setPriorityTarget,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: priorityTargetsQueryKey })
      await client.invalidateQueries({ queryKey: indicatorsQueryKey })
    },
  })
}
