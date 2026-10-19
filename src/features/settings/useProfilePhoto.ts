import { useMutation, useQueryClient } from '@tanstack/react-query'

import { useAuthStore } from '@/store/authStore'

import {
  clearOwnProfilePhoto,
  uploadOwnProfilePhoto,
  type OwnPhotoProfile,
} from './profilePhotoService'
import { profilePhotoQueryKey } from './useSignedProfilePhoto'

function usePhotoInvalidation() {
  const queryClient = useQueryClient()
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['managed-profiles'] }),
      queryClient.invalidateQueries({ queryKey: ['assignable-profiles'] }),
      queryClient.invalidateQueries({ queryKey: ['cases'] }),
      queryClient.invalidateQueries({ queryKey: profilePhotoQueryKey }),
    ])
  }
}

export function useUploadOwnProfilePhoto() {
  const invalidate = usePhotoInvalidation()
  return useMutation({
    mutationFn: ({ profile, uri }: { profile: OwnPhotoProfile; uri: string }) =>
      uploadOwnProfilePhoto(profile, uri),
    onSuccess: async (path) => {
      useAuthStore.getState().applyOwnAvatar(path)
      await invalidate()
    },
  })
}

export function useClearOwnProfilePhoto() {
  const invalidate = usePhotoInvalidation()
  return useMutation({
    mutationFn: (previousPath: string | null) => clearOwnProfilePhoto(previousPath),
    onSuccess: async () => {
      useAuthStore.getState().applyOwnAvatar(null)
      await invalidate()
    },
  })
}
