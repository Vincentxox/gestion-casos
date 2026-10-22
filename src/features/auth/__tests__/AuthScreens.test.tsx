import { fireEvent, render, waitFor } from '@testing-library/react-native'
import { AuthApiError } from '@supabase/supabase-js'
import type { ReactElement } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { AppFeedback } from '@/components/feedback/AppFeedback'
import { useAuthStore } from '@/store/authStore'

import { LoginScreen } from '../screens/LoginScreen'
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen'
import { ResetPasswordScreen } from '../screens/ResetPasswordScreen'
import { requestPasswordReset, updatePassword } from '../authService'
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
  requestPasswordReset: jest.fn(),
  updatePassword: jest.fn(),
}))

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { version: '1.0.0' } },
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
  useAuthStore.setState({ initializationError: null, recoveryLinkError: null })
})

test('el inicio de sesión muestra la marca, el título y lleva a crear cuenta', async () => {
  const props = { navigation, route: { key: 'Login', name: 'Login' } } as unknown as Parameters<
    typeof LoginScreen
  >[0]
  const screen = await renderWithSafeArea(<LoginScreen {...props} />)

  expect(screen.getByLabelText('Nexo Casos')).toBeTruthy()
  expect(screen.getByRole('header', { name: 'Inicia sesión' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Ingresar' })).toBeTruthy()
  expect(screen.queryByText('Accede de forma segura a tus casos y documentos.')).toBeNull()
  expect(screen.getByText('versión 1.0.0')).toBeTruthy()
  expect(screen.getByLabelText('Google')).toBeTruthy()

  await fireEvent.press(screen.getByRole('button', { name: '¿No tienes una cuenta? Crear cuenta' }))
  expect(navigate).toHaveBeenCalledWith('Register')
})

test('recuperar contraseña abre el formulario con el correo escrito', async () => {
  const props = { navigation, route: { key: 'Login', name: 'Login' } } as unknown as Parameters<
    typeof LoginScreen
  >[0]
  const screen = await renderWithSafeArea(<LoginScreen {...props} />)
  await fireEvent.changeText(screen.getByLabelText('Correo electrónico'), 'vincent@empresa.com')
  await fireEvent.press(screen.getByRole('button', { name: '¿Olvidaste tu contraseña?' }))
  expect(navigate).toHaveBeenCalledWith('ForgotPassword', { email: 'vincent@empresa.com' })
})

const forgotProps = {
  navigation,
  route: {
    key: 'ForgotPassword',
    name: 'ForgotPassword',
    params: { email: 'vincent@empresa.com' },
  },
} as unknown as Parameters<typeof ForgotPasswordScreen>[0]

test('recuperar contraseña valida el correo y confirma sin revelar la cuenta', async () => {
  const request = jest.mocked(requestPasswordReset)
  request.mockResolvedValue()
  const screen = await renderWithSafeArea(<ForgotPasswordScreen {...forgotProps} />)
  await fireEvent.changeText(screen.getByLabelText('Correo electrónico'), 'incorrecto')
  await fireEvent.press(screen.getByRole('button', { name: 'Enviar enlace' }))
  expect(await screen.findByText('Ingresa un correo electrónico válido')).toBeTruthy()
  expect(request).not.toHaveBeenCalled()

  await fireEvent.changeText(screen.getByLabelText('Correo electrónico'), 'vincent@empresa.com')
  await fireEvent.press(screen.getByRole('button', { name: 'Enviar enlace' }))
  expect(await screen.findByText(/Si el correo tiene una cuenta/)).toBeTruthy()
  expect(request).toHaveBeenCalledWith('vincent@empresa.com')
})

test('un correo inexistente recibe la misma confirmación y el límite muestra espera', async () => {
  const request = jest.mocked(requestPasswordReset)
  request.mockRejectedValueOnce(new AuthApiError('not found', 404, 'user_not_found'))
  const screen = await renderWithSafeArea(<ForgotPasswordScreen {...forgotProps} />)
  await fireEvent.press(screen.getByRole('button', { name: 'Enviar enlace' }))
  expect(await screen.findByText(/Si el correo tiene una cuenta/)).toBeTruthy()

  request.mockRejectedValueOnce(new AuthApiError('rate', 429, 'over_email_send_rate_limit'))
  await fireEvent.press(screen.getByRole('button', { name: 'Enviar enlace' }))
  expect(await screen.findByText('Espera unos minutos antes de pedir otro enlace')).toBeTruthy()
})

test('la nueva contraseña usa la regla de Registro, guarda y permite cancelar', async () => {
  const update = jest.mocked(updatePassword)
  update.mockResolvedValue()
  const finish = jest.fn().mockResolvedValue(undefined)
  const logout = jest.fn().mockResolvedValue(undefined)
  useAuthStore.setState({ finishPasswordRecovery: finish, logout })
  const feedback = jest.spyOn(AppFeedback, 'show').mockImplementation(() => {})
  const screen = await renderWithSafeArea(<ResetPasswordScreen />)
  await fireEvent.changeText(screen.getByLabelText('Contraseña nueva'), 'short')
  await fireEvent.changeText(screen.getByLabelText('Confirmar contraseña'), 'short')
  await fireEvent.press(screen.getByRole('button', { name: 'Guardar contraseña' }))
  expect(await screen.findByText('La contraseña debe tener al menos 8 caracteres')).toBeTruthy()
  expect(update).not.toHaveBeenCalled()
  await fireEvent.changeText(screen.getByLabelText('Contraseña nueva'), 'Password1!')
  await fireEvent.changeText(screen.getByLabelText('Confirmar contraseña'), 'Password1!')
  await fireEvent.press(screen.getByRole('button', { name: 'Guardar contraseña' }))
  await waitFor(() => expect(update).toHaveBeenCalledWith('Password1!'))
  expect(finish).toHaveBeenCalled()
  expect(feedback).toHaveBeenCalledWith('Contraseña actualizada', 'Tu contraseña se actualizó')
  await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }))
  expect(logout).toHaveBeenCalled()
  feedback.mockRestore()
})

test('un error al actualizar conserva la sesión y muestra un mensaje seguro', async () => {
  jest.mocked(updatePassword).mockRejectedValue(new AuthApiError('server detail', 400, 'bad_json'))
  const finish = jest.fn()
  useAuthStore.setState({ finishPasswordRecovery: finish })
  const feedback = jest.spyOn(AppFeedback, 'show').mockImplementation(() => {})
  const screen = await renderWithSafeArea(<ResetPasswordScreen />)
  await fireEvent.changeText(screen.getByLabelText('Contraseña nueva'), 'Password1!')
  await fireEvent.changeText(screen.getByLabelText('Confirmar contraseña'), 'Password1!')
  await fireEvent.press(screen.getByRole('button', { name: 'Guardar contraseña' }))
  await waitFor(() =>
    expect(feedback).toHaveBeenCalledWith(
      'No fue posible guardar la contraseña',
      'No fue posible actualizar la contraseña. Inténtalo nuevamente.',
    ),
  )
  expect(finish).not.toHaveBeenCalled()
  feedback.mockRestore()
})

test('la contraseña repetida explica que debe ser distinta de la anterior', async () => {
  jest.mocked(updatePassword).mockRejectedValue(new AuthApiError('same', 422, 'same_password'))
  const finish = jest.fn()
  useAuthStore.setState({ finishPasswordRecovery: finish })
  const feedback = jest.spyOn(AppFeedback, 'show').mockImplementation(() => {})
  const screen = await renderWithSafeArea(<ResetPasswordScreen />)
  await fireEvent.changeText(screen.getByLabelText('Contraseña nueva'), 'Password1!')
  await fireEvent.changeText(screen.getByLabelText('Confirmar contraseña'), 'Password1!')
  await fireEvent.press(screen.getByRole('button', { name: 'Guardar contraseña' }))
  await waitFor(() =>
    expect(feedback).toHaveBeenCalledWith(
      'No fue posible guardar la contraseña',
      'La contraseña nueva debe ser distinta de la anterior.',
    ),
  )
  expect(finish).not.toHaveBeenCalled()
  feedback.mockRestore()
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
