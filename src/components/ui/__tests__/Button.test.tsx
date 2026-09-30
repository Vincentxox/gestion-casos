import { render } from '@testing-library/react-native'
import { StyleSheet } from 'react-native'

import { Button } from '../Button'

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
