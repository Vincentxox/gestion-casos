import { fireEvent, render, waitFor } from '@testing-library/react-native'
import * as ImagePicker from 'expo-image-picker'
import { StyleSheet } from 'react-native'

import { AppFeedback } from '@/components/feedback/AppFeedback'
import { useAuthStore } from '@/store/authStore'
import type { Profile } from '@/features/auth/types'
import { colors, radius } from '@/theme/tokens'

import { ProfileScreen } from '../ProfileScreen'
import { updateOwnName } from '../profileService'
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
const applyOwnName = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
  profile.avatarUrl = null
  ;(useAuthStore as unknown as jest.Mock).mockImplementation((selector) =>
    selector({
      profile,
      session: { user: { email: 'ana@example.test' } },
      logout: jest.fn(),
      applyOwnName,
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
  ;(updateOwnName as jest.Mock).mockResolvedValue('Ana M. López')
})

test('muestra datos compactos, ajustes y la opción de subir foto', async () => {
  const screen = await render(<ProfileScreen />)
  expect(screen.getByRole('header', { name: 'Mi perfil' })).toBeTruthy()
  const name = screen.getByText('Ana López')
  expect(StyleSheet.flatten(name.parent?.parent?.parent?.props.style)).toMatchObject({
    flexDirection: 'row',
  })
  expect(screen.getByText('ana@example.test')).toBeTruthy()
  expect(screen.getByLabelText('Apariencia')).toBeTruthy()
  expect(screen.getByLabelText('Notificaciones')).toBeTruthy()
  expect(screen.getByLabelText('Permisos de tu rol')).toBeTruthy()
  expect(screen.getByText(/Nexo Casos · versión/)).toBeTruthy()
  const camera = screen.getByRole('button', { name: 'Cambiar foto de perfil' })
  expect(StyleSheet.flatten(camera.props.style)).toMatchObject({ width: 44, height: 44 })
  expect(StyleSheet.flatten(screen.getByTestId('profile-camera-circle').props.style)).toMatchObject(
    {
      width: 32,
      height: 32,
    },
  )
  await fireEvent.press(camera)
  await fireEvent.press(screen.getByText('Elegir de galería'))
  await waitFor(() => expect(upload).toHaveBeenCalledWith({ profile, uri: 'file://prepared' }))
  expect(ImagePicker.requestCameraPermissionsAsync).not.toHaveBeenCalled()
  expect(AppFeedback.toast).toHaveBeenCalledWith('Foto actualizada', { tone: 'success' })
})

test('la fila y Editar abren la edición del nombre actual y conservan el guardado', async () => {
  const screen = await render(<ProfileScreen />)
  const pencil = screen.getByRole('button', { name: 'Editar nombre' })
  const camera = screen.getByRole('button', { name: 'Cambiar foto de perfil' })
  const identity = screen.getByText('Ana López').parent?.parent?.parent
  if (!identity) throw new Error('No se encontró la fila de identidad')
  expect(StyleSheet.flatten(pencil.props.style)).toMatchObject({ minWidth: 64, minHeight: 44 })
  expect(camera).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Editar perfil' })).toBeNull()
  expect(identity.props.accessible).toBe(false)
  await fireEvent.press(identity)
  await fireEvent.changeText(screen.getByDisplayValue('Ana López'), 'Ana M. López')
  await fireEvent.press(screen.getByRole('button', { name: 'Guardar' }))
  await waitFor(() => expect(updateOwnName).toHaveBeenCalledWith('u1', 'Ana M. López'))
  expect(applyOwnName).toHaveBeenCalledWith('Ana M. López')
})

test('Empresa, Área y Correo son filas de 52 px con etiquetas de 72 px', async () => {
  const screen = await render(<ProfileScreen />)
  for (const label of ['Empresa', 'Área', 'Correo']) {
    const field = screen
      .getAllByText(label)
      .find((item) => StyleSheet.flatten(item.props.style)?.width === 72)
    if (!field) throw new Error(`No se encontró la etiqueta ${label}`)
    expect(StyleSheet.flatten(field.props.style)).toMatchObject({ width: 72 })
    expect(StyleSheet.flatten(field.parent?.props.style)).toMatchObject({
      minHeight: 52,
      flexDirection: 'row',
    })
  }
})

test('Cerrar sesión es un botón accesible de contorno rojo y 52 px', async () => {
  const screen = await render(<ProfileScreen />)
  const logout = screen.getByRole('button', { name: 'Cerrar sesión' })
  expect(StyleSheet.flatten(logout.props.style)).toMatchObject({
    minHeight: 52,
    borderColor: colors.dangerBorder,
    borderRadius: radius.pill,
    backgroundColor: colors.background,
  })
  expect(StyleSheet.flatten(screen.getByText('Cerrar sesión').props.style)).toMatchObject({
    color: colors.dangerText,
  })
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
      { tone: 'error' },
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
      { tone: 'error' },
    ),
  )
})
