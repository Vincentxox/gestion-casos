import { render } from '@testing-library/react-native'

import { OfflineBanner } from '../OfflineBanner'

let mockNetwork = { isConnected: false, isInternetReachable: false }
jest.mock('@react-native-community/netinfo', () => ({
  useNetInfo: () => mockNetwork,
}))

test('muestra el aviso sin conexión', async () => {
  const screen = await render(<OfflineBanner />)

  expect(screen.getByText('Sin conexión')).toBeTruthy()
  expect(screen.getByText('Los cambios se enviarán al reconectar.')).toBeTruthy()
})

test('permite un mensaje específico para la lista de Solicitudes', async () => {
  const screen = await render(
    <OfflineBanner message="Sin conexión · Mostrando lo último que se cargó." />,
  )
  expect(screen.getByText('Sin conexión · Mostrando lo último que se cargó.')).toBeTruthy()
  expect(screen.queryByText('Los cambios se enviarán al reconectar.')).toBeNull()
})

test('oculta el aviso cuando vuelve la red', async () => {
  mockNetwork = { isConnected: true, isInternetReachable: true }
  const screen = await render(<OfflineBanner />)

  expect(screen.queryByText('Sin conexión')).toBeNull()
})
