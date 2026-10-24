import { fireEvent, render } from '@testing-library/react-native'
import { Pressable, StyleSheet, Text } from 'react-native'

import { ScreenHeader } from '../ScreenHeader'

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: jest.requireActual<typeof import('react-native')>('react-native').View,
}))

test('expone un volver accesible y la acción opcional', async () => {
  const onBack = jest.fn()
  const onAction = jest.fn()
  const screen = await render(
    <ScreenHeader
      title="Recursos"
      onBack={onBack}
      action={{ label: 'Nuevo', onPress: onAction }}
    />,
  )
  expect(screen.getByRole('header', { name: 'Recursos' })).toBeTruthy()
  const back = screen.getByRole('button', { name: 'Volver' })
  expect(StyleSheet.flatten(back.props.style)).toEqual(
    expect.objectContaining({ width: 44, height: 44 }),
  )
  await fireEvent.press(back)
  await fireEvent.press(screen.getByRole('button', { name: 'Nuevo' }))
  expect(onBack).toHaveBeenCalledTimes(1)
  expect(onAction).toHaveBeenCalledTimes(1)
})

test('la acción derecha dinámica tiene prioridad sobre la acción fija', async () => {
  const screen = await render(
    <ScreenHeader
      title="Avisos"
      onBack={() => {}}
      action={{ label: 'Nuevo', onPress: () => {} }}
      right={
        <Pressable accessibilityRole="button" accessibilityLabel="Más opciones">
          <Text>Opciones</Text>
        </Pressable>
      }
    />,
  )
  expect(screen.getByRole('button', { name: 'Más opciones' })).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Nuevo' })).toBeNull()
})
