import { fireEvent, render } from '@testing-library/react-native'
import { StyleSheet } from 'react-native'

import { Button } from '../Button'
import { colors } from '@/theme/tokens'

test('aplica flex y ancho al contenedor animado, no al botón interno', async () => {
  const screen = await render(
    <Button label="Continuar" containerStyle={{ flex: 1, width: 160 }} style={{ opacity: 0.8 }} />,
  )
  const pressable = screen.getByLabelText('Continuar')
  expect(StyleSheet.flatten(pressable.parent?.props.style)).toEqual(
    expect.objectContaining({ flex: 1, width: 160 }),
  )
  expect(StyleSheet.flatten(pressable.props.style)).not.toEqual(
    expect.objectContaining({ flex: 1, width: 160 }),
  )
})

test('usa el fondo y texto neutros cuando está desactivado', async () => {
  const screen = await render(<Button label="Guardar" disabled />)
  const button = screen.getByRole('button', { name: 'Guardar' })
  const style = StyleSheet.flatten(button.props.style)
  expect(style.backgroundColor).toBe(colors.disabledBg)
  expect(style.opacity).toBe(1)
  expect(screen.getByText('Guardar').props.style).toEqual(
    expect.arrayContaining([expect.objectContaining({ color: colors.disabledText })]),
  )
})

test('una acción visualmente desactivada puede explicar qué falta sin ejecutar la acción', async () => {
  const onPress = jest.fn()
  const onDisabledPress = jest.fn()
  const screen = await render(
    <Button label="Revisar" disabled onPress={onPress} onDisabledPress={onDisabledPress} />,
  )
  const button = screen.getByRole('button', { name: 'Revisar' })
  expect(StyleSheet.flatten(button.props.style).backgroundColor).toBe(colors.disabledBg)
  await fireEvent.press(button)
  expect(onDisabledPress).toHaveBeenCalledTimes(1)
  expect(onPress).not.toHaveBeenCalled()
})
