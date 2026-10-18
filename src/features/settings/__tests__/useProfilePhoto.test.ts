import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuthStore } from '@/store/authStore'

import { useClearOwnProfilePhoto, useUploadOwnProfilePhoto } from '../useProfilePhoto'
import { profilePhotoQueryKey, useSignedProfilePhoto } from '../useSignedProfilePhoto'
import {
  clearOwnProfilePhoto,
  getSignedProfilePhotoUrl,
  uploadOwnProfilePhoto,
} from '../profilePhotoService'

jest.mock('@tanstack/react-query', () => ({
  useMutation: jest.fn(),
  useQuery: jest.fn(),
  useQueryClient: jest.fn(),
}))
jest.mock('@/features/cases/useCases', () => ({ casesQueryKey: ['cases'] }))
jest.mock('@/store/authStore', () => ({ useAuthStore: { getState: jest.fn() } }))
jest.mock('../profilePhotoService', () => ({
  PROFILE_PHOTO_URL_SECONDS: 300,
  clearOwnProfilePhoto: jest.fn(),
  getSignedProfilePhotoUrl: jest.fn(),
  uploadOwnProfilePhoto: jest.fn(),
}))

beforeEach(() => {
  jest.clearAllMocks()
  ;(useQueryClient as jest.Mock).mockReturnValue({
    invalidateQueries: jest.fn().mockResolvedValue(undefined),
  })
  ;(useAuthStore.getState as jest.Mock).mockReturnValue({ applyOwnAvatar: jest.fn() })
})

test('firma por ruta y deja margen antes de expirar', async () => {
  useSignedProfilePhoto('org/u1/photo.jpg')
  const options = (useQuery as jest.Mock).mock.calls.at(-1)?.[0]
  expect(options.queryKey).toEqual([...profilePhotoQueryKey, 'org/u1/photo.jpg'])
  expect(options.staleTime).toBe(240_000)
  await options.queryFn()
  expect(getSignedProfilePhotoUrl).toHaveBeenCalledWith('org/u1/photo.jpg')
})

test('al cambiar o quitar la foto actualiza el perfil e invalida listas', async () => {
  useUploadOwnProfilePhoto()
  const uploadOptions = (useMutation as jest.Mock).mock.calls.at(-1)?.[0]
  const profile = { id: 'u1', organizationId: 'org', avatarUrl: null }
  await uploadOptions.mutationFn({ profile, uri: 'file://photo' })
  expect(uploadOwnProfilePhoto).toHaveBeenCalledWith(profile, 'file://photo')
  await uploadOptions.onSuccess('org/u1/photo.jpg')
  expect(useAuthStore.getState().applyOwnAvatar).toHaveBeenCalledWith('org/u1/photo.jpg')

  useClearOwnProfilePhoto()
  const clearOptions = (useMutation as jest.Mock).mock.calls.at(-1)?.[0]
  await clearOptions.mutationFn('org/u1/photo.jpg')
  expect(clearOwnProfilePhoto).toHaveBeenCalledWith('org/u1/photo.jpg')
  await clearOptions.onSuccess()
  expect(useAuthStore.getState().applyOwnAvatar).toHaveBeenCalledWith(null)
  const invalidate = (useQueryClient as jest.Mock).mock.results.at(-1)?.value.invalidateQueries
  for (const key of [
    ['managed-profiles'],
    ['assignable-profiles'],
    ['cases'],
    profilePhotoQueryKey,
  ]) {
    expect(invalidate).toHaveBeenCalledWith({ queryKey: key })
  }
})
