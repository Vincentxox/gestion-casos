import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { listManagedProfiles, setMemberAccess } from './userService'
import type { ManagedProfile } from './types'

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
