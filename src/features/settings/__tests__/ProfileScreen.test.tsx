import { fireEvent, render, waitFor } from '@testing-library/react-native'
import * as ImagePicker from 'expo-image-picker'

import { AppFeedback } from '@/components/feedback/AppFeedback'
import { useAuthStore } from '@/store/authStore'
import type { Profile } from '@/features/auth/types'

import { ProfileScreen } from '../ProfileScreen'
import { prepareProfilePhoto } from '../profilePhotoPreparation'
import { useClearOwnProfilePhoto, useUploadOwnProfilePhoto } from '../useProfilePhoto'

jest.mock('@/store/authStore', () => ({ useAuthStore: jest.fn() }))
jest.mock('../profileService', () => ({ updateOwnName: jest.fn() }))
jest.mock('../profilePhotoPreparation', () => ({ prepareProfilePhoto: jest.fn() }))
jest.mock('../useProfilePhoto', () => ({
  useClearOwnProfilePhoto: jest.fn(),
  useUploadOwnProfilePhoto: jest.fn(),
}))
jest.mock('../useSignedProfilePhoto', () => ({
  useSignedProfilePhoto: jest.fn(() => ({ data: undefined })),
}))
jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}))
jest.mock('@/components/feedback/AppFeedback', () => ({
  AppFeedback: { show: jest.fn(), toast: jest.fn() },
}))
jest.mock('@/components/ui/ScreenContainer', () => ({
  ScreenContainer: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))
jest.mock('@/components/sheets/BottomSheet', () => ({
  BottomSheet: ({ children, visible }: { children: React.ReactNode; visible: boolean }) =>
    visible ? <>{children}</> : null,
}))

const profile: Profile = {
  id: 'u1',
  fullName: 'Ana López',
  avatarUrl: null,
  role: 'tecnico',
  areaId: 'area',
  areaName: 'Tecnología',
  organizationId: 'org',
  organizationName: 'Empresa',
  organizationActive: true,
}
const upload = jest.fn()
const clear = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
  profile.avatarUrl = null
  ;(useAuthStore as unknown as jest.Mock).mockImplementation((selector) =>
    selector({
      profile,
      session: { user: { email: 'ana@example.test' } },
      logout: jest.fn(),
      applyOwnName: jest.fn(),
    }),
  )
  ;(useUploadOwnProfilePhoto as jest.Mock).mockReturnValue({
    mutateAsync: upload,
    isPending: false,
  })
  ;(useClearOwnProfilePhoto as jest.Mock).mockReturnValue({ mutateAsync: clear, isPending: false })
  ;(ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
    canceled: false,
    assets: [{ uri: 'file://original', width: 900, height: 700 }],
  })
  ;(prepareProfilePhoto as jest.Mock).mockResolvedValue('file://prepared')
  upload.mockResolvedValue('org/u1/new.jpg')
  clear.mockResolvedValue(undefined)
})

test('muestra datos compactos, ajustes y la opción de subir foto', async () => {
  const screen = await render(<ProfileScreen />)
  expect(screen.getAllByText('Ana López').length).toBeGreaterThan(0)
  expect(screen.getByText('ana@example.test')).toBeTruthy()
  expect(screen.getByLabelText('Apariencia')).toBeTruthy()
  expect(screen.getByLabelText('Notificaciones')).toBeTruthy()
  expect(screen.getByLabelText('Permisos de tu rol')).toBeTruthy()
  expect(screen.getByText(/Versión/)).toBeTruthy()
  await fireEvent.press(screen.getByLabelText('Cambiar foto de perfil'))
  await fireEvent.press(screen.getByText('Elegir de galería'))
  await waitFor(() => expect(upload).toHaveBeenCalledWith({ profile, uri: 'file://prepared' }))
  expect(ImagePicker.requestCameraPermissionsAsync).not.toHaveBeenCalled()
  expect(AppFeedback.toast).toHaveBeenCalledWith('Foto actualizada')
})

test('quita la foto por RPC y muestra el error del servidor en español', async () => {
  profile.avatarUrl = 'org/u1/old.jpg'
  clear.mockRejectedValueOnce({ code: 'P0001', message: 'Acceso denegado' })
  const screen = await render(<ProfileScreen />)
  await fireEvent.press(screen.getByLabelText('Cambiar foto de perfil'))
  await fireEvent.press(screen.getByText('Quitar foto'))
  await waitFor(() =>
    expect(AppFeedback.show).toHaveBeenCalledWith(
      'No fue posible quitar la foto',
      'Acceso denegado',
    ),
  )
  expect(clear).toHaveBeenCalledWith('org/u1/old.jpg')
})

test('muestra el error en español de set_profile_photo', async () => {
  upload.mockRejectedValueOnce({
    code: 'P0001',
    message: 'La foto debe estar en tu carpeta de perfil',
  })
  const screen = await render(<ProfileScreen />)
  await fireEvent.press(screen.getByLabelText('Cambiar foto de perfil'))
  await fireEvent.press(screen.getByText('Elegir de galería'))
  await waitFor(() =>
    expect(AppFeedback.show).toHaveBeenCalledWith(
      'No fue posible cambiar la foto',
      'La foto debe estar en tu carpeta de perfil',
    ),
  )
})
