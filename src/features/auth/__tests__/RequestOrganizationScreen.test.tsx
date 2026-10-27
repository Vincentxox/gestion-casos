import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { AppFeedback, useFeedback } from '@/components/feedback/AppFeedback'
import { useAuthStore } from '@/store/authStore'
import { RequestOrganizationScreen } from '../screens/RequestOrganizationScreen'
import { useRequestOrganizationCreation } from '../useOrganizationRequest'

jest.mock('@/store/authStore', () => ({ useAuthStore: jest.fn() }))
jest.mock('@/components/feedback/AppFeedback', () => ({
  AppFeedback: { toast: jest.fn(), show: jest.fn() },
  useFeedback: jest.fn(),
}))
jest.mock('../useOrganizationRequest', () => ({
  useRequestOrganizationCreation: jest.fn(),
  myOrganizationRequestKey: ['my-organization-creation-request'],
}))

const mutateAsync = jest.fn()
const alert = jest.fn().mockResolvedValue(undefined)
const goBack = jest.fn()
const props = {
  navigation: { goBack },
  route: { key: 'RequestOrganization', name: 'RequestOrganization', params: undefined },
} as unknown as Parameters<typeof RequestOrganizationScreen>[0]
const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
}

function mount() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  })
  return render(
    <QueryClientProvider client={client}>
      <SafeAreaProvider initialMetrics={metrics}>
        <RequestOrganizationScreen {...props} />
      </SafeAreaProvider>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  jest
    .mocked(useAuthStore)
    .mockImplementation((selector) =>
      selector({ session: { user: { id: 'u1', email: 'ana@example.test' } } } as never),
    )
  jest.mocked(useFeedback).mockReturnValue({ alert } as never)
  jest
    .mocked(useRequestOrganizationCreation)
    .mockReturnValue({ mutateAsync, isPending: false } as never)
  mutateAsync.mockResolvedValue('request-id')
})

test('requiere nombre y tamaño; envía los datos y vuelve con aviso', async () => {
  const screen = await mount()
  const submit = screen.getByRole('button', { name: 'Enviar solicitud' })
  expect(submit.props.accessibilityState.disabled).toBe(true)
  await fireEvent.changeText(
    screen.getAllByLabelText('Nombre de la empresa, obligatorio').at(-1)!,
    '  Mi Empresa  ',
  )
  expect(submit.props.accessibilityState.disabled).toBe(true)
  await fireEvent.press(screen.getByRole('radio', { name: '6-25' }))
  await waitFor(() => expect(submit.props.accessibilityState.disabled).toBe(false))
  await fireEvent.press(submit)
  await waitFor(() =>
    expect(mutateAsync).toHaveBeenCalledWith({
      organizationName: 'Mi Empresa',
      contactPhone: '',
      teamSize: '6-25',
      message: '',
    }),
  )
  expect(AppFeedback.toast).toHaveBeenCalledWith('Solicitud enviada', { tone: 'success' })
  expect(goBack).toHaveBeenCalled()
})

test('solo muestra el contador de mensaje después de 400 caracteres', async () => {
  const screen = await mount()
  const message = screen.getByLabelText('Mensaje (opcional)')
  await fireEvent.changeText(message, 'x'.repeat(400))
  expect(screen.queryByText('400 / 500')).toBeNull()
  await fireEvent.changeText(message, 'x'.repeat(401))
  expect(screen.getByText('401 / 500')).toBeTruthy()
})

test('pendiente duplicada muestra el error del servidor y regresa al cerrar', async () => {
  mutateAsync.mockRejectedValueOnce(new Error('Ya tienes una solicitud pendiente'))
  const screen = await mount()
  await fireEvent.changeText(
    screen.getAllByLabelText('Nombre de la empresa, obligatorio').at(-1)!,
    'Empresa',
  )
  await fireEvent.press(screen.getByRole('radio', { name: '1-5' }))
  await fireEvent.press(screen.getByRole('button', { name: 'Enviar solicitud' }))
  await waitFor(() =>
    expect(alert).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Ya tienes una solicitud pendiente' }),
    ),
  )
  expect(goBack).toHaveBeenCalled()
})
