import { fireEvent, render } from '@testing-library/react-native'
import type { ReactElement } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { AppFeedback } from '@/components/feedback/AppFeedback'
import { useAuthStore } from '@/store/authStore'

import { LoginScreen } from '../screens/LoginScreen'
import { PendingInvitationScreen } from '../screens/PendingInvitationScreen'
import { RegisterScreen } from '../screens/RegisterScreen'

jest.mock('@/features/auth/authService', () => ({
  getCurrentSession: jest.fn(),
  resolveSessionProfile: jest.fn(),
  signIn: jest.fn(),
  signInWithGoogle: jest.fn(),
  signOut: jest.fn(),
  signUp: jest.fn(),
  retryPendingInvitation: jest.fn(),
}))

jest.mock('../accessService', () => ({
  normalizeJoinCode: (value: string) => value.replace(/[^a-z0-9]/gi, '').toUpperCase(),
}))

let mockRequest: { status: string; organizationName?: string; decisionNote?: string } | null = null
const mockMutate = jest.fn()
jest.mock('../useAccessRequest', () => ({
  useMyAccessRequest: () => ({
    data: mockRequest,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
  useRequestOrganizationAccess: () => ({ mutateAsync: mockMutate, isPending: false }),
  useCancelMyAccessRequest: () => ({ mutateAsync: jest.fn(), isPending: false }),
}))

const navigate = jest.fn()
const goBack = jest.fn()
const navigation = { navigate, goBack }
const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
}

function renderWithSafeArea(element: ReactElement) {
  return render(<SafeAreaProvider initialMetrics={metrics}>{element}</SafeAreaProvider>)
}

beforeEach(() => {
  jest.clearAllMocks()
  mockRequest = null
  useAuthStore.setState({ initializationError: null })
})

test('el inicio de sesión muestra la marca, el título y lleva a crear cuenta', async () => {
  const props = { navigation, route: { key: 'Login', name: 'Login' } } as unknown as Parameters<
    typeof LoginScreen
  >[0]
  const screen = await renderWithSafeArea(<LoginScreen {...props} />)

  expect(screen.getByLabelText('Nexo Casos')).toBeTruthy()
  expect(screen.getByRole('header', { name: 'Inicia sesión' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Ingresar' })).toBeTruthy()

  await fireEvent.press(screen.getByRole('button', { name: '¿No tienes una cuenta? Crear cuenta' }))
  expect(navigate).toHaveBeenCalledWith('Register')
})

test('crear cuenta tiene su propio botón para volver y enlace a iniciar sesión', async () => {
  const props = {
    navigation,
    route: { key: 'Register', name: 'Register' },
  } as unknown as Parameters<typeof RegisterScreen>[0]
  const screen = await renderWithSafeArea(<RegisterScreen {...props} />)

  expect(screen.getByRole('header', { name: 'Crea tu cuenta' })).toBeTruthy()
  await fireEvent.press(screen.getByRole('button', { name: 'Volver' }))
  expect(goBack).toHaveBeenCalledTimes(1)

  await fireEvent.press(
    screen.getByRole('button', { name: '¿Ya tienes una cuenta? Inicia sesión' }),
  )
  expect(navigate).toHaveBeenCalledWith('Login')
})

test('entrar a la empresa muestra el código sin pasos extra y valida su largo', async () => {
  const show = jest.spyOn(AppFeedback, 'show').mockImplementation(() => {})
  const screen = await renderWithSafeArea(<PendingInvitationScreen />)

  expect(screen.getByLabelText('Paso 2 de 3: elegir empresa')).toBeTruthy()
  await fireEvent.changeText(screen.getByLabelText('Código de empresa'), 'abcd')
  await fireEvent.press(screen.getByRole('button', { name: 'Solicitar acceso' }))

  expect(show).toHaveBeenCalledWith(
    'Código incompleto',
    'Escribe los ocho caracteres del código de tu empresa.',
  )
  expect(mockMutate).not.toHaveBeenCalled()
  show.mockRestore()
})

test('con una solicitud pendiente muestra a qué empresa se envió y oculta el código', async () => {
  mockRequest = { status: 'pendiente', organizationName: 'Clínica Norte' }
  const screen = await renderWithSafeArea(<PendingInvitationScreen />)

  expect(screen.getByLabelText('Paso 2 de 3: solicitud enviada')).toBeTruthy()
  expect(screen.getByText('Solicitud enviada a Clínica Norte')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Cancelar solicitud' })).toBeTruthy()
  expect(screen.queryByLabelText('Código de empresa')).toBeNull()
})
