import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { deactivateMember, listManagedProfiles, setMemberAccess } from './userService'
import type { ManagedProfile } from './types'
import { casesQueryKey } from '@/features/cases/useCases'
import { homeSummaryQueryKey } from '@/features/home/useHomeSummary'
import { reportsQueryKey } from '@/features/reports/useReports'

const managedProfilesQueryKey = ['managed-profiles'] as const

export function useManagedProfiles() {
  return useQuery({ queryKey: managedProfilesQueryKey, queryFn: listManagedProfiles })
}

export function useSetMemberAccess() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      userId,
      role,
      areaId,
    }: {
      userId: string
      role: ManagedProfile['role']
      areaId: string | null
    }) => setMemberAccess(userId, role, areaId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: managedProfilesQueryKey }),
  })
}

export function useDeactivateMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deactivateMember,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: managedProfilesQueryKey }),
        queryClient.invalidateQueries({ queryKey: ['assignable-profiles'] }),
        queryClient.invalidateQueries({ queryKey: casesQueryKey }),
        queryClient.invalidateQueries({ queryKey: reportsQueryKey }),
        queryClient.invalidateQueries({ queryKey: homeSummaryQueryKey }),
      ])
    },
  })
}
