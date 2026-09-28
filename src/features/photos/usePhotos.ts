import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { listCasePhotos, deleteCasePhoto, getSignedPhotoUrl } from './photoService'
import type { CasePhoto } from './types'

export const photosQueryKey = ['case-photos'] as const

export function useCasePhotos(caseId: string) {
  return useQuery({ queryKey: [...photosQueryKey, caseId], queryFn: () => listCasePhotos(caseId) })
}

export function usePhotoUrl(path: string | undefined) {
  return useQuery({
    queryKey: ['photo-url', path],
    queryFn: () => getSignedPhotoUrl(path!),
    enabled: Boolean(path),
    staleTime: 4 * 60 * 1000,
  })
}

export function useDeletePhoto(caseId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (photo: CasePhoto) => deleteCasePhoto(photo),
    onSuccess: () => client.invalidateQueries({ queryKey: [...photosQueryKey, caseId] }),
  })
}
