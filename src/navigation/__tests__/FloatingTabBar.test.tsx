import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { act, fireEvent, render } from '@testing-library/react-native'
import { Keyboard, StyleSheet } from 'react-native'

import { colors } from '@/theme/tokens'

import { FloatingTabBar } from '../FloatingTabBar'

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 20, left: 0 }),
}))

function setup(index = 0, onCreate?: () => void) {
  const emit = jest.fn(() => ({ defaultPrevented: false }))
  const navigate = jest.fn()
  const routes = [
    { key: 'home', name: 'Home' },
    { key: 'cases', name: 'CasesTab' },
    { key: 'help', name: 'Help' },
  ]
  const props = {
    state: { index, routes },
    descriptors: {
      home: { options: { title: 'Inicio' } },
      cases: { options: { title: 'Mis trabajos', tabBarLabel: 'Solicitudes', tabBarBadge: 3 } },
      help: { options: { title: 'Ayuda' } },
    },
    navigation: { emit, navigate },
    insets: { top: 0, right: 0, bottom: 0, left: 0 },
  } as unknown as BottomTabBarProps
  return { emit, navigate, props, onCreate }
}

describe('FloatingTabBar', () => {
  test('usa la etiqueta corta, marca la pestaña activa y anuncia pendientes', async () => {
    const { props } = setup()
    const screen = await render(<FloatingTabBar {...props} />)
    expect(screen.getByText('Solicitudes')).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Mis trabajos, 3 pendientes' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Inicio' }).props.accessibilityState).toEqual({
      selected: true,
    })
  })

  test('el fondo y la zona táctil de la pestaña activa ocupan todo su espacio', async () => {
    const { props } = setup()
    const screen = await render(<FloatingTabBar {...props} />)
    const activeTab = screen.getByRole('tab', { name: 'Inicio' })
    const activeStyle = StyleSheet.flatten(activeTab.props.style)
    const slotStyle = StyleSheet.flatten(activeTab.parent?.props.style)

    expect(activeStyle.backgroundColor).toBe(colors.primarySoft)
    expect(activeStyle.flex).toBe(1)
    expect(activeStyle.minHeight).toBeGreaterThanOrEqual(44)
    expect(slotStyle.flex).toBe(1)
    expect(slotStyle.alignSelf).toBe('stretch')
    expect(slotStyle.alignItems).toBeUndefined()
  })

  test('navega solo a pestañas distintas de la actual', async () => {
    const { props, navigate, emit } = setup()
    const screen = await render(<FloatingTabBar {...props} />)
    await fireEvent.press(screen.getByRole('tab', { name: 'Inicio' }))
    expect(navigate).not.toHaveBeenCalled()
    await fireEvent.press(screen.getByRole('tab', { name: 'Ayuda' }))
    expect(emit).toHaveBeenCalledWith(expect.objectContaining({ type: 'tabPress', target: 'help' }))
    expect(navigate).toHaveBeenCalledWith('Help', undefined)
  })

  test('muestra el botón + solo cuando se puede crear', async () => {
    const onCreate = jest.fn()
    const { props } = setup()
    const screen = await render(<FloatingTabBar {...props} onCreate={onCreate} />)
    await fireEvent.press(screen.getByRole('button', { name: 'Nueva solicitud' }))
    expect(onCreate).toHaveBeenCalled()

    await screen.rerender(<FloatingTabBar {...props} />)
    expect(screen.queryByRole('button', { name: 'Nueva solicitud' })).toBeNull()
  })

  test('se oculta mientras el teclado está abierto', async () => {
    const listeners: Record<string, () => void> = {}
    jest.spyOn(Keyboard, 'addListener').mockImplementation((event, callback) => {
      listeners[event] = callback as () => void
      return { remove: jest.fn() } as unknown as ReturnType<typeof Keyboard.addListener>
    })
    const { props } = setup()
    const screen = await render(<FloatingTabBar {...props} />)
    const show = Object.keys(listeners).find((name) => name.includes('Show'))
    const hide = Object.keys(listeners).find((name) => name.includes('Hide'))
    await act(async () => listeners[show!]?.())
    expect(screen.queryByTestId('floating-tab-bar')).toBeNull()
    await act(async () => listeners[hide!]?.())
    expect(screen.getByTestId('floating-tab-bar')).toBeTruthy()
  })

  test('se oculta, junto con Nueva solicitud, en pantallas apiladas', async () => {
    const { props } = setup(1)
    const onCreate = jest.fn()
    const root = await render(<FloatingTabBar {...props} onCreate={onCreate} />)
    expect(root.getByTestId('floating-tab-bar')).toBeTruthy()

    const nestedProps = {
      ...props,
      state: {
        ...props.state,
        routes: props.state.routes.map((route) =>
          route.name === 'CasesTab'
            ? { ...route, state: { index: 1, routes: [{ name: 'Cases' }, { name: 'CaseDetail' }] } }
            : route,
        ),
      },
    } as unknown as BottomTabBarProps
    await root.rerender(<FloatingTabBar {...nestedProps} onCreate={onCreate} />)
    expect(root.queryByTestId('floating-tab-bar')).toBeNull()
    expect(root.queryByRole('button', { name: 'Nueva solicitud' })).toBeNull()
  })

  test('reserva más ancho para Solicitudes sin truncar su etiqueta', async () => {
    const { props } = setup(1)
    const screen = await render(<FloatingTabBar {...props} />)
    const casesTab = screen.getByRole('tab', { name: 'Mis trabajos, 3 pendientes' })
    const slotStyle = StyleSheet.flatten(casesTab.parent?.props.style)
    expect(slotStyle.flex).toBeGreaterThan(1)
    expect(screen.getByText('Solicitudes').props.numberOfLines).toBeUndefined()
  })
})
