import { render } from '@testing-library/react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { ReturnSheet } from '../components/ReturnSheet'

test('marca el motivo de devolución como obligatorio sin cambiar el botón', async () => {
  const screen = await render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 400, height: 800 },
        insets: { top: 0, right: 0, bottom: 0, left: 0 },
      }}
    >
      <ReturnSheet
        visible
        loading={false}
        label="Devolver"
        nextVersion={2}
        onClose={jest.fn()}
        onReturn={jest.fn().mockResolvedValue(undefined)}
      />
    </SafeAreaProvider>,
  )

  expect(screen.getByText('Motivo de la devolución *')).toBeTruthy()
  expect(screen.getByLabelText('Motivo de la devolución, obligatorio')).toBeTruthy()
  expect(screen.getByLabelText('Devolver')).toBeTruthy()
})
