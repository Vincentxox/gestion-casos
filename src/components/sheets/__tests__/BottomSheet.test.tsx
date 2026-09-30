import type { ReactNode } from 'react'
import { fireEvent, render } from '@testing-library/react-native'
import { Text } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { ActionSheet } from '@/components/actions/ActionSheet'

import { BottomSheet } from '../BottomSheet'

function withSafeArea(children: ReactNode) {
  return (
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 400, height: 800 },
        insets: { top: 24, right: 0, bottom: 20, left: 0 },
      }}
    >
      {children}
    </SafeAreaProvider>
  )
}

test('cierra con X, fondo y atrás; muestra el pie solo cuando se configura', async () => {
  const onClose = jest.fn()
  const onSave = jest.fn()
  const screen = await render(
    withSafeArea(
      <BottomSheet
        title="Nueva área"
        visible
        onClose={onClose}
        footerAction={{ label: 'Guardar área', onPress: onSave }}
      >
        <Text>Nombre del área</Text>
      </BottomSheet>,
    ),
  )

  expect(screen.getByText('Guardar área')).toBeTruthy()
  await fireEvent.press(screen.getByLabelText('Cerrar Nueva área'))
  await fireEvent.press(
    screen.getByTestId('bottom-sheet-backdrop', { includeHiddenElements: true }),
  )
  const modal = screen.getByTestId('bottom-sheet').parent?.parent
  if (!modal) throw new Error('No se encontró el modal')
  await fireEvent(modal, 'requestClose')
  expect(onClose).toHaveBeenCalledTimes(3)
  await fireEvent.press(screen.getByText('Guardar área'))
  expect(onSave).toHaveBeenCalledTimes(1)

  await screen.rerender(
    withSafeArea(
      <BottomSheet title="Opciones" visible onClose={onClose}>
        <Text>Sin acción principal</Text>
      </BottomSheet>,
    ),
  )
  expect(screen.queryByText('Guardar área')).toBeNull()
})

test('pone las acciones destructivas al final y separadas', async () => {
  const screen = await render(
    withSafeArea(
      <ActionSheet
        title="Más acciones"
        visible
        onClose={jest.fn()}
        onSelect={jest.fn()}
        actions={[
          { id: 'cancelar', label: 'Cancelar solicitud', destructive: true },
          { id: 'editar', label: 'Editar' },
          { id: 'rechazar', label: 'Rechazar', destructive: true },
        ]}
      />,
    ),
  )
  const labels = screen
    .getAllByText(/Editar|Cancelar solicitud|Rechazar/)
    .map((node) => node.props.children)
  expect(screen.getByTestId('bottom-sheet').props.style).toEqual(
    expect.arrayContaining([expect.objectContaining({ height: 'auto' })]),
  )
  expect(labels.indexOf('Editar')).toBeLessThan(labels.indexOf('Cancelar solicitud'))
  expect(labels.indexOf('Cancelar solicitud')).toBeLessThan(labels.indexOf('Rechazar'))
})

test('mantiene desplazable un menú de cuatro o más acciones', async () => {
  const screen = await render(
    withSafeArea(
      <ActionSheet
        title="Más acciones"
        visible
        onClose={jest.fn()}
        onSelect={jest.fn()}
        actions={['aceptar', 'asignar', 'iniciar', 'cancelar'].map((id) => ({ id, label: id }))}
      />,
    ),
  )
  expect(screen.getByTestId('bottom-sheet').props.style).toEqual(
    expect.arrayContaining([expect.objectContaining({ height: '55%' })]),
  )
})
