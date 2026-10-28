import { fireEvent, render } from '@testing-library/react-native'
import { StyleSheet } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import type { AccessRequest } from '../accessRequestService'
import { AccessRequestsScreen } from '../screens/AccessRequestsScreen'

let mockRequests: AccessRequest[] = []

function inSafeArea(children: React.ReactNode) {
  return (
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 400, height: 800 },
        insets: { top: 0, right: 0, bottom: 0, left: 0 },
      }}
    >
      {children}
    </SafeAreaProvider>
  )
}

jest.mock('@/features/areas/useAreas', () => ({
  useAreas: () => ({ data: [], isError: false, refetch: jest.fn() }),
}))
jest.mock('../useAccessRequests', () => ({
  useAccessRequests: () => ({
    data: mockRequests,
    isError: false,
    isLoading: false,
    isRefetching: false,
    refetch: jest.fn(),
  }),
  useApproveAccessRequest: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useRejectAccessRequest: () => ({ mutateAsync: jest.fn(), isPending: false }),
}))

test('usa pestañas accesibles y estado vacío para solicitudes pendientes', async () => {
  mockRequests = []
  const screen = await render(inSafeArea(<AccessRequestsScreen />))
  expect(screen.getByRole('tab', { name: 'Pendientes' })).toBeTruthy()
  expect(screen.getByText('Todo al día')).toBeTruthy()
  expect(screen.getByText('No hay solicitudes pendientes.')).toBeTruthy()

  await fireEvent.press(screen.getByRole('tab', { name: 'Resueltas' }))
  expect(screen.getByText('Sin solicitudes resueltas')).toBeTruthy()
})

test('abre la hoja de una solicitud con altura y ambas acciones visibles', async () => {
  mockRequests = [
    {
      id: 'request-1',
      email: 'persona@example.com',
      fullName: 'Persona de prueba',
      status: 'pendiente',
      createdAt: '2026-09-25T12:00:00Z',
      decisionNote: null,
    },
  ]
  const screen = await render(inSafeArea(<AccessRequestsScreen />))

  await fireEvent.press(
    screen.getByRole('button', { name: 'Revisar solicitud de Persona de prueba' }),
  )

  const approveAction = screen.getByText('Aprobar acceso')
  expect(approveAction).toBeTruthy()
  expect(screen.getByText('Rechazar acceso')).toBeTruthy()
  let ancestor = approveAction.parent
  let hasMeasuredSheet = false
  while (ancestor) {
    if (StyleSheet.flatten(ancestor.props.style)?.height === '80%') {
      hasMeasuredSheet = true
      break
    }
    ancestor = ancestor.parent
  }
  expect(hasMeasuredSheet).toBe(true)
})
