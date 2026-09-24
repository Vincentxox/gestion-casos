import { fireEvent, render } from '@testing-library/react-native'

import { AccessRequestsScreen } from '../screens/AccessRequestsScreen'

jest.mock('@/features/areas/useAreas', () => ({
  useAreas: () => ({ data: [], isError: false, refetch: jest.fn() }),
}))
jest.mock('../useAccessRequests', () => ({
  useAccessRequests: () => ({
    data: [],
    isError: false,
    isLoading: false,
    isRefetching: false,
    refetch: jest.fn(),
  }),
  useApproveAccessRequest: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useRejectAccessRequest: () => ({ mutateAsync: jest.fn(), isPending: false }),
}))

test('usa pestañas accesibles y estado vacío para solicitudes pendientes', async () => {
  const screen = await render(<AccessRequestsScreen />)
  expect(screen.getByRole('tab', { name: 'Pendientes' })).toBeTruthy()
  expect(screen.getByText('Todo al día')).toBeTruthy()
  expect(screen.getByText('No hay solicitudes pendientes.')).toBeTruthy()

  await fireEvent.press(screen.getByRole('tab', { name: 'Resueltas' }))
  expect(screen.getByText('Sin solicitudes resueltas')).toBeTruthy()
})
