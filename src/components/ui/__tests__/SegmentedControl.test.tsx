import { fireEvent, render } from '@testing-library/react-native'
import { StyleSheet } from 'react-native'

import { typography } from '@/theme/tokens'

import { SegmentedControl } from '../SegmentedControl'

describe('SegmentedControl', () => {
  test('mantiene el mismo tamaño de etiqueta y centra los contadores', async () => {
    const onChange = jest.fn()
    const screen = await render(
      <SegmentedControl
        onChange={onChange}
        segments={[
          { value: 'pendientes', label: 'Pendientes', count: 12 },
          { value: 'todas', label: 'Todas', count: 3 },
        ]}
        selected="pendientes"
      />,
    )

    const pending = screen.getByText('Pendientes')
    const all = screen.getByText('Todas')
    expect(pending.props.adjustsFontSizeToFit).toBeUndefined()
    expect(all.props.adjustsFontSizeToFit).toBeUndefined()
    expect(StyleSheet.flatten(pending.props.style).fontSize).toBe(typography.caption.fontSize)
    expect(StyleSheet.flatten(all.props.style).fontSize).toBe(typography.caption.fontSize)

    const count = screen.getByText('12')
    expect(StyleSheet.flatten(count.parent?.props.style)).toMatchObject({
      minWidth: 22,
      height: 22,
      alignItems: 'center',
      justifyContent: 'center',
    })
    expect(StyleSheet.flatten(count.props.style)).toMatchObject({
      lineHeight: typography.caption.fontSize,
      includeFontPadding: false,
      textAlignVertical: 'center',
    })

    await fireEvent.press(screen.getByRole('tab', { name: 'Todas, 3' }))
    expect(onChange).toHaveBeenCalledWith('todas')
  })
})
