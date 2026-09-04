import { fireEvent, render } from '@testing-library/react-native'

import { FormField } from '../FormField'

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
})
