import { fireEvent, render, waitFor } from '@testing-library/react-native'

import { AppFeedback } from '@/components/feedback/AppFeedback'

import { ChangeCaseStatusScreen, statusActionPresentation } from '../screens/ChangeCaseStatusScreen'

test('el botón nombra la acción y rechazar o cancelar son destructivos', () => {
  expect(statusActionPresentation('rechazar')).toMatchObject({
    label: 'Rechazar solicitud',
    commentLabel: 'Motivo del rechazo',
    variant: 'destructive',
  })
  expect(statusActionPresentation('cancelar').variant).toBe('destructive')
  expect(statusActionPresentation('aceptar').variant).toBe('primary')
})

let mockActionsResponse: {
  data: Record<string, { allowed: boolean }>
  isPending: boolean
  isFetching?: boolean
  error: Error | null
  refetch?: jest.Mock
} = {
  data: { rechazar: { allowed: true }, aceptar: { allowed: true } },
  isPending: false,
  error: null,
}

jest.mock('@/store/authStore', () => ({
  useAuthStore: () => ({ id: 'chief', role: 'jefe_area' }),
}))
jest.mock('../useCases', () => ({
  useCaseDetail: () => ({
    data: { status: 'solicitado' },
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  }),
  useCaseActions: () => mockActionsResponse,
  useChangeCaseStatus: () => ({ mutateAsync: jest.fn(), isPending: false }),
}))

beforeEach(() => {
  mockActionsResponse = {
    data: { rechazar: { allowed: true }, aceptar: { allowed: true } },
    isPending: false,
    error: null,
  }
})

const screenProps = {
  navigation: { goBack: jest.fn() },
  route: { params: { caseId: 'case', action: 'rechazar' } },
} as unknown as Parameters<typeof ChangeCaseStatusScreen>[0]

test('solo muestra acciones permitidas y ninguna mientras carga o con respuesta vacía', async () => {
  mockActionsResponse.data.rechazar = { allowed: false }
  const allowed = await render(<ChangeCaseStatusScreen {...screenProps} />)
  expect(allowed.queryByText('Rechazar solicitud')).toBeNull()
  expect(allowed.getByRole('button', { name: 'Aceptar solicitud' })).toBeTruthy()

  mockActionsResponse = { data: {}, isPending: true, isFetching: true, error: null }
  await allowed.rerender(<ChangeCaseStatusScreen {...screenProps} />)
  expect(allowed.queryByRole('button', { name: /Confirmar/ })).toBeNull()

  mockActionsResponse = { data: {}, isPending: false, error: null }
  await allowed.rerender(<ChangeCaseStatusScreen {...screenProps} />)
  expect(
    allowed.getByText('No hay acciones disponibles para tu rol y el estado actual'),
  ).toBeTruthy()
})

test('si falla la consulta de acciones ofrece reintentar', async () => {
  const refetch = jest.fn()
  mockActionsResponse = { data: {}, isPending: false, error: new Error('sin red'), refetch }
  const screen = await render(<ChangeCaseStatusScreen {...screenProps} />)
  await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }))
  expect(refetch).toHaveBeenCalled()
})

test('mantiene las acciones permitidas durante una recarga en segundo plano', async () => {
  const screen = await render(<ChangeCaseStatusScreen {...screenProps} />)
  expect(screen.getByRole('button', { name: 'Rechazar solicitud' })).toBeTruthy()

  mockActionsResponse = {
    data: { rechazar: { allowed: true }, aceptar: { allowed: true } },
    isPending: false,
    isFetching: true,
    error: null,
  }
  await screen.rerender(<ChangeCaseStatusScreen {...screenProps} />)
  expect(screen.getByRole('button', { name: 'Rechazar solicitud' })).toBeTruthy()
})

test('limpia el error del motivo al cambiar de Rechazar a Aceptar', async () => {
  const props = {
    navigation: { goBack: jest.fn() },
    route: { params: { caseId: 'case', action: 'rechazar' } },
  } as unknown as Parameters<typeof ChangeCaseStatusScreen>[0]
  const screen = await render(<ChangeCaseStatusScreen {...props} />)

  await fireEvent.press(screen.getByRole('button', { name: 'Rechazar solicitud' }))
  expect(screen.getByText('Explica el motivo con al menos 3 caracteres.')).toBeTruthy()

  await fireEvent.press(screen.getByText('Aceptar solicitud'))
  expect(screen.queryByText('Explica el motivo con al menos 3 caracteres.')).toBeNull()
})

test('muestra el mensaje de la acción aceptada, no uno genérico', async () => {
  const toast = jest.spyOn(AppFeedback, 'toast').mockImplementation(() => {})
  const props = {
    navigation: { goBack: jest.fn() },
    route: { params: { caseId: 'case', action: 'aceptar' } },
  } as unknown as Parameters<typeof ChangeCaseStatusScreen>[0]
  const screen = await render(<ChangeCaseStatusScreen {...props} />)

  await fireEvent.press(screen.getByRole('button', { name: 'Aceptar solicitud' }))
  await waitFor(() => expect(toast).toHaveBeenCalledWith('Solicitud aceptada', { tone: 'success' }))
  toast.mockRestore()
})
