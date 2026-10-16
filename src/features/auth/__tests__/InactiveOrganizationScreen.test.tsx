import { act, fireEvent, render, waitFor } from '@testing-library/react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { useAuthStore } from '@/store/authStore'

import { confirmLogout } from '../confirmLogout'
import { InactiveOrganizationScreen } from '../screens/InactiveOrganizationScreen'

jest.mock('../confirmLogout', () => ({ confirmLogout: jest.fn() }))
jest.mock('@/features/auth/authService', () => ({
  getCurrentSession: jest.fn(),
  resolveSessionProfile: jest.fn(),
  signIn: jest.fn(),
  signInWithGoogle: jest.fn(),
  signOut: jest.fn(),
  signUp: jest.fn(),
  retryPendingInvitation: jest.fn(),
}))

const mockConfirmLogout = jest.mocked(confirmLogout)
const refreshProfile = jest.fn()
const logout = jest.fn()

function renderScreen() {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 400, height: 800 },
        insets: { top: 0, right: 0, bottom: 0, left: 0 },
      }}
    >
      <InactiveOrganizationScreen />
    </SafeAreaProvider>,
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  useAuthStore.setState({ refreshProfile, logout })
})

test('muestra la explicación y avisa si la empresa sigue inactiva', async () => {
  refreshProfile.mockResolvedValue({ organizationActive: false })
  const screen = await renderScreen()

  expect(screen.getByRole('header', { name: 'Tu empresa está inactiva' })).toBeTruthy()
  expect(screen.getByText(/Tu cuenta sigue activa/)).toBeTruthy()
  await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }))

  await waitFor(() => expect(refreshProfile).toHaveBeenCalledTimes(1))
  expect(screen.getByText('Tu empresa sigue inactiva. Inténtalo de nuevo más tarde.')).toBeTruthy()
})

test('reintenta y deja el ruteo al perfil reactivado', async () => {
  refreshProfile.mockResolvedValue({ organizationActive: true })
  const screen = await renderScreen()

  await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }))

  await waitFor(() => expect(refreshProfile).toHaveBeenCalledTimes(1))
  expect(screen.queryByRole('alert')).toBeNull()
})

test('muestra un error de red y permite reintentar', async () => {
  refreshProfile.mockRejectedValueOnce(new Error('Sin red')).mockResolvedValue({
    organizationActive: false,
  })
  const screen = await renderScreen()

  await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }))
  await waitFor(() => expect(screen.getByText('Sin red')).toBeTruthy())
  await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }))
  await waitFor(() => expect(refreshProfile).toHaveBeenCalledTimes(2))
})

test('solo cierra sesión tras la confirmación', async () => {
  logout.mockResolvedValue(undefined)
  const screen = await renderScreen()

  await fireEvent.press(screen.getByRole('button', { name: 'Cerrar sesión' }))

  expect(logout).not.toHaveBeenCalled()
  expect(mockConfirmLogout).toHaveBeenCalledTimes(1)
  await act(async () => {
    mockConfirmLogout.mock.calls[0]?.[0]()
  })
  expect(logout).toHaveBeenCalledTimes(1)
})

test('permite reintentar si falla el cierre de sesión', async () => {
  logout.mockRejectedValue(new Error('Sin conexión'))
  const screen = await renderScreen()

  await fireEvent.press(screen.getByRole('button', { name: 'Cerrar sesión' }))
  await act(async () => {
    mockConfirmLogout.mock.calls[0]?.[0]()
  })

  expect(screen.getByText('Sin conexión')).toBeTruthy()
  await fireEvent.press(screen.getByRole('button', { name: 'Cerrar sesión' }))
  expect(mockConfirmLogout).toHaveBeenCalledTimes(2)
})
