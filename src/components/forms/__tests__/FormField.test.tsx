import { fireEvent, render } from '@testing-library/react-native'
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native'

import { colors } from '@/theme/tokens'

import { FormField } from '../FormField'

// Estilo del recuadro que envuelve el campo: el primer antecesor con color de fondo.
interface RenderedNode {
  parent: RenderedNode | null
  props: { style?: StyleProp<ViewStyle> }
}
function fieldBox(input: RenderedNode) {
  let node = input.parent
  while (node) {
    const style = StyleSheet.flatten(node.props.style)
    if (style?.backgroundColor) return style
    node = node.parent
  }
  throw new Error('Sin recuadro')
}

describe('FormField', () => {
  test('permite mostrar y volver a ocultar una contraseña', async () => {
    const screen = await render(
      <FormField label="Contraseña" onChangeText={jest.fn()} secureTextEntry value="Password1!" />,
    )
    const input = screen.getByLabelText('Contraseña')

    expect(input.props.secureTextEntry).toBe(true)

    await fireEvent.press(screen.getByLabelText('Mostrar contraseña'))
    expect(input.props.secureTextEntry).toBe(false)

    await fireEvent.press(screen.getByLabelText('Ocultar contraseña'))
    expect(input.props.secureTextEntry).toBe(true)
  })

  test('relaciona el mensaje de validación con el campo', async () => {
    const screen = await render(
      <FormField error="El correo es obligatorio" label="Correo" onChangeText={jest.fn()} />,
    )

    expect(screen.getByText('El correo es obligatorio')).toBeTruthy()
    expect(screen.getByLabelText('Correo').props.accessibilityHint).toBe('El correo es obligatorio')
  })

  test('señala un campo obligatorio y muestra su contador', async () => {
    const screen = await render(
      <FormField
        label="Título"
        maxLength={120}
        onChangeText={jest.fn()}
        required
        showCharacterCount
        value="Fuga"
      />,
    )

    expect(screen.getAllByLabelText('Título, obligatorio')).toHaveLength(2)
    expect(screen.getByText('4 / 120')).toBeTruthy()
    expect(screen.getByText('*')).toBeTruthy()
  })

  test('la variante rellena quita el borde y conserva el borde de error', async () => {
    const screen = await render(
      <FormField label="Correo" onChangeText={jest.fn()} testID="campo" variant="filled" />,
    )
    const container = fieldBox(screen.getByTestId('campo'))
    expect(container.backgroundColor).toBe(colors.surfaceMuted)
    expect(container.borderColor).toBe(colors.surfaceMuted)

    await screen.rerender(
      <FormField
        error="Obligatorio"
        label="Correo"
        onChangeText={jest.fn()}
        testID="campo"
        variant="filled"
      />,
    )
    const withError = fieldBox(screen.getByTestId('campo'))
    expect(withError.borderColor).toBe(colors.error)
  })
})
