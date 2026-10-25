import { render } from '@testing-library/react-native'
import { StyleSheet } from 'react-native'
import { tone } from '@/theme/tokens'

import { OfflineBanner } from '../OfflineBanner'

let mockNetwork = { isConnected: false, isInternetReachable: false }
jest.mock('@react-native-community/netinfo', () => ({
  useNetInfo: () => mockNetwork,
}))
jest.mock('@/components/ui/Icon', () => ({
  Icon: ({ name }: { name: string }) => {
    const { Text } = jest.requireActual<typeof import('react-native')>('react-native')
    return <Text testID={`icon-${name}`}>{name}</Text>
  },
}))

test('muestra el aviso sin conexión', async () => {
  const screen = await render(<OfflineBanner />)

  expect(screen.getByText('Sin conexión')).toBeTruthy()
  expect(screen.getByText('Los cambios se enviarán al reconectar.')).toBeTruthy()
  expect(screen.getByTestId('icon-cloud-offline-outline')).toBeTruthy()
  expect(
    StyleSheet.flatten(screen.getByText('Sin conexión').parent?.parent?.props.style),
  ).toMatchObject({
    backgroundColor: tone.warning.bg,
    borderColor: tone.warning.border,
  })
})

test('permite un mensaje específico para la lista de Solicitudes', async () => {
  const screen = await render(<OfflineBanner message="Mostrando lo último que se cargó." />)
  expect(screen.getByText('Sin conexión')).toBeTruthy()
  expect(screen.getByText('Mostrando lo último que se cargó.')).toBeTruthy()
  expect(screen.queryByText('Los cambios se enviarán al reconectar.')).toBeNull()
})

test('oculta el aviso cuando vuelve la red', async () => {
  mockNetwork = { isConnected: true, isInternetReachable: true }
  const screen = await render(<OfflineBanner />)

  expect(screen.queryByText('Sin conexión')).toBeNull()
})
