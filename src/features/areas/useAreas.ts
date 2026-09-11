import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { createArea, listAreas, setAreaActive, updateArea } from './areaService'
import type { AreaInput } from './types'

export const areasQueryKey = ['areas'] as const

export function useAreas() {
  return useQuery({ queryKey: areasQueryKey, queryFn: listAreas })
}

function useInvalidateAreas() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: areasQueryKey })
}

export function useCreateArea() {
  const invalidate = useInvalidateAreas()
  return useMutation({ mutationFn: createArea, onSuccess: invalidate })
}

export function useUpdateArea() {
  const invalidate = useInvalidateAreas()
  return useMutation({
    mutationFn: ({ areaId, input }: { areaId: string; input: AreaInput }) =>
      updateArea(areaId, input),
    onSuccess: invalidate,
  })
}

export function useSetAreaActive() {
  const invalidate = useInvalidateAreas()
  return useMutation({
    mutationFn: ({ areaId, isActive }: { areaId: string; isActive: boolean }) =>
      setAreaActive(areaId, isActive),
    onSuccess: invalidate,
  })
}
