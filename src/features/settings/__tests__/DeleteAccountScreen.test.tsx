import { fireEvent, render, waitFor } from '@testing-library/react-native'
import { BackHandler } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { useFeedback } from '@/components/feedback/AppFeedback'
import { useAuthStore } from '@/store/authStore'

import { DeleteAccountScreen } from '../DeleteAccountScreen'
import {
  AccountDeletionBlockedError,
  AccountDeletionNetworkError,
  deleteOwnAccount,
  isSoleOrganizationMember,
} from '../accountDeletionService'

jest.mock('@/components/feedback/AppFeedback', () => ({ useFeedback: jest.fn() }))
jest.mock('@/store/authStore', () => ({ useAuthStore: jest.fn() }))
jest.mock('../accountDeletionService', () => ({
  AccountDeletionBlockedError: class AccountDeletionBlockedError extends Error {},
  AccountDeletionNetworkError: class AccountDeletionNetworkError extends Error {},
  deleteOwnAccount: jest.fn(),
  isSoleOrganizationMember: jest.fn(),
}))

const mockDelete = jest.mocked(deleteOwnAccount)
const mockSoleMember = jest.mocked(isSoleOrganizationMember)
const alert = jest.fn().mockResolvedValue(undefined)
const completeAccountDeletion = jest.fn().mockResolvedValue(undefined)
const setOptions = jest.fn()
const navigation = { setOptions, goBack: jest.fn() }
const props = {
  navigation,
  route: { key: 'DeleteAccount', name: 'DeleteAccount' },
} as unknown as Parameters<typeof DeleteAccountScreen>[0]
const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
}

function mount() {
  return render(
    <SafeAreaProvider initialMetrics={metrics}>
      <DeleteAccountScreen {...props} />
    </SafeAreaProvider>,
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.mocked(useFeedback).mockReturnValue({ alert } as never)
  jest.mocked(useAuthStore).mockImplementation((selector) =>
    selector({
      profile: { organizationId: 'org-1', organizationName: 'Empresa' },
      completeAccountDeletion,
    } as never),
  )
  mockSoleMember.mockResolvedValue(false)
  mockDelete.mockResolvedValue(undefined)
})

test('muestra qué se borra y conserva; exige ELIMINAR exacto', async () => {
  const screen = await mount()
  expect(screen.getByText('No se puede deshacer')).toBeTruthy()
  expect(screen.getByText('Empresa conserva')).toBeTruthy()
  expect(screen.getByText('Política de privacidad')).toBeTruthy()
  const button = screen.getByRole('button', { name: 'Eliminar mi cuenta' })
  expect(button.props.accessibilityState.disabled).toBe(true)
  const input = screen.getByLabelText('Escribe ELIMINAR para confirmar')
  for (const invalid of ['eliminar', ' ELIMINAR', '']) {
    await fireEvent.changeText(input, invalid)
    expect(button.props.accessibilityState.disabled).toBe(true)
  }
  await fireEvent.changeText(input, 'ELIMINAR')
  expect(screen.getByText('Coincide')).toBeTruthy()
  expect(button.props.accessibilityState.disabled).toBe(false)
})

test('una sola pulsación bloquea entrada y atrás mientras responde; éxito limpia y sale', async () => {
  let resolve: () => void = () => undefined
  mockDelete.mockImplementationOnce(() => new Promise<void>((done) => (resolve = done)))
  const backHandler = jest.spyOn(BackHandler, 'addEventListener')
  const screen = await mount()
  await fireEvent.changeText(screen.getByLabelText('Escribe ELIMINAR para confirmar'), 'ELIMINAR')
  await fireEvent.press(screen.getByRole('button', { name: 'Eliminar mi cuenta' }))
  expect(
    screen.getByRole('button', { name: 'Eliminando…' }).props.accessibilityState,
  ).toMatchObject({
    disabled: true,
    busy: true,
  })
  expect(screen.getByLabelText('Escribe ELIMINAR para confirmar').props.editable).toBe(false)
  expect(setOptions).toHaveBeenCalledWith({ headerBackVisible: false, gestureEnabled: false })
  expect(mockDelete).toHaveBeenCalledTimes(1)
  const handleBack = backHandler.mock.lastCall?.[1] as () => boolean
  expect(handleBack()).toBe(true)
  await fireEvent.press(screen.getByRole('button', { name: 'Eliminando…' }))
  expect(mockDelete).toHaveBeenCalledTimes(1)
  resolve()
  await waitFor(() => expect(completeAccountDeletion).toHaveBeenCalledTimes(1))
  expect(screen.getByLabelText('Escribe ELIMINAR para confirmar').props.value).toBe('')
  backHandler.mockRestore()
})

test('409 presenta el mensaje exacto y mantiene la confirmación', async () => {
  mockDelete.mockRejectedValueOnce(new AccountDeletionBlockedError('Reasigna el caso CAS-1'))
  const screen = await mount()
  await fireEvent.changeText(screen.getByLabelText('Escribe ELIMINAR para confirmar'), 'ELIMINAR')
  await fireEvent.press(screen.getByRole('button', { name: 'Eliminar mi cuenta' }))
  await waitFor(() =>
    expect(alert).toHaveBeenCalledWith({
      title: 'Aún no puedes eliminar tu cuenta',
      message: 'Reasigna el caso CAS-1',
      tone: 'danger',
      icon: 'warning-outline',
    }),
  )
  expect(screen.getByLabelText('Escribe ELIMINAR para confirmar').props.value).toBe('ELIMINAR')
  expect(completeAccountDeletion).not.toHaveBeenCalled()
})

test.each([
  [new AccountDeletionNetworkError('offline'), 'No hay conexión. Tu cuenta sigue igual.'],
  [new Error('500'), 'No terminamos de eliminar tu cuenta. Inténtalo de nuevo.'],
])('error con Reintentar repite la llamada', async (error, message) => {
  mockDelete.mockRejectedValueOnce(error).mockResolvedValueOnce(undefined)
  const screen = await mount()
  await fireEvent.changeText(screen.getByLabelText('Escribe ELIMINAR para confirmar'), 'ELIMINAR')
  await fireEvent.press(screen.getByRole('button', { name: 'Eliminar mi cuenta' }))
  expect(await screen.findByText(message)).toBeTruthy()
  await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }))
  await waitFor(() => expect(mockDelete).toHaveBeenCalledTimes(2))
})

test('aviso azul para único miembro', async () => {
  mockSoleMember.mockResolvedValueOnce(true)
  const screen = await mount()
  expect(await screen.findByText(/Eres la única persona en Empresa/)).toBeTruthy()
})

test('sin aviso azul cuando hay más miembros', async () => {
  const screen = await mount()
  await waitFor(() => expect(mockSoleMember).toHaveBeenCalled())
  expect(screen.queryByText(/Eres la única persona en Empresa/)).toBeNull()
})
