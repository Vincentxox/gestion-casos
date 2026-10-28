import { fireEvent, render } from '@testing-library/react-native'
import { StyleSheet } from 'react-native'

import { colors } from '@/theme/tokens'

import { Chip } from '../Chip'

test('el chip seleccionable anuncia su estado y conserva área táctil de 44 px', async () => {
  const onPress = jest.fn()
  const screen = await render(<Chip label="Alta" selected onPress={onPress} />)
  const chip = screen.getByRole('button', { name: 'Alta' })
  expect(chip.props.accessibilityState).toEqual({ selected: true })
  expect(StyleSheet.flatten(chip.props.style)).toEqual(
    expect.objectContaining({ minHeight: 36, backgroundColor: colors.ink }),
  )
  expect(chip.props.hitSlop).toBe(4)
  await fireEvent.press(chip)
  expect(onPress).toHaveBeenCalledTimes(1)
})

test('el chip informativo mide 28 px y usa el tono semántico', async () => {
  const screen = await render(<Chip label="Activo" tone="success" />)
  const chip = screen.getByText('Activo').parent
  expect(StyleSheet.flatten(chip?.props.style)).toEqual(
    expect.objectContaining({ minHeight: 28, backgroundColor: colors.successSoft }),
  )
})

test('el chip pendiente tiene fondo blanco, borde y no muestra marca', async () => {
  const screen = await render(<Chip label="Diagnóstico" outlined />)
  const chip = screen.getByText('Diagnóstico').parent
  expect(StyleSheet.flatten(chip?.props.style)).toMatchObject({
    backgroundColor: colors.surface,
    borderColor: colors.cardBorder,
    borderWidth: 1,
  })
  expect(chip?.children).toHaveLength(1)
})
