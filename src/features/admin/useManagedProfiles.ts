import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { listManagedProfiles, setManagedProfileArea } from './userService'

const managedProfilesQueryKey = ['managed-profiles'] as const

export function useManagedProfiles() {
  return useQuery({ queryKey: managedProfilesQueryKey, queryFn: listManagedProfiles })
}

export function useSetManagedProfileArea() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, areaId }: { userId: string; areaId: string | null }) =>
      setManagedProfileArea(userId, areaId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: managedProfilesQueryKey }),
  })
}
