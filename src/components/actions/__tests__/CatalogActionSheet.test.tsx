import { fireEvent, render, waitFor } from '@testing-library/react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { CatalogActionSheet } from '../CatalogActionSheet'

test('ofrece editar y desactivar con el segundo paso destructivo', async () => {
  const onClose = jest.fn()
  const onEdit = jest.fn()
  const onToggle = jest.fn()
  const screen = await render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 400, height: 800 },
        insets: { top: 0, right: 0, bottom: 0, left: 0 },
      }}
    >
      <CatalogActionSheet
        name="Mantenimiento"
        active
        visible
        onClose={onClose}
        onEdit={onEdit}
        onToggle={onToggle}
      />
    </SafeAreaProvider>,
  )

  expect(screen.getByText('Opciones de Mantenimiento')).toBeTruthy()
  expect(screen.getByText('Cambiar sus datos')).toBeTruthy()
  expect(screen.getByText('No se podrá seleccionar en nuevos registros')).toBeTruthy()
  await fireEvent.press(screen.getByText('Editar'))
  await waitFor(() => expect(onEdit).toHaveBeenCalledTimes(1))
  expect(onToggle).not.toHaveBeenCalled()
  expect(onClose).toHaveBeenCalledTimes(1)
})

test('ofrece activar un catálogo inactivo', async () => {
  const onToggle = jest.fn()
  const screen = await render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 400, height: 800 },
        insets: { top: 0, right: 0, bottom: 0, left: 0 },
      }}
    >
      <CatalogActionSheet
        name="Cable"
        active={false}
        visible
        onClose={jest.fn()}
        onEdit={jest.fn()}
        onToggle={onToggle}
      />
    </SafeAreaProvider>,
  )

  await fireEvent.press(screen.getByText('Activar'))
  expect(screen.getByText('Volverá a estar disponible para nuevos registros')).toBeTruthy()
  await waitFor(() => expect(onToggle).toHaveBeenCalledTimes(1))
})
