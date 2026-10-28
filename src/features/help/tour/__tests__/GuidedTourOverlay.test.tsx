import { act, fireEvent, render, waitFor } from '@testing-library/react-native'

import { getTutorialFor } from '../../helpContent'
import { GuidedTourOverlay, visibleRect } from '../GuidedTourOverlay'
import { useGuidedTour } from '../useGuidedTour'

const steps = getTutorialFor('tecnico')
const routes = ['Home', 'CasesTab', 'Help'].map((name) => ({ name, key: name }))
const navigation = { navigate: jest.fn() }

const visible = { x: 20, y: 100, width: 300, height: 80 }

function show(index = 0, rect: typeof visible | null = visible) {
  useGuidedTour.setState({
    userId: 'person',
    ready: true,
    started: true,
    hiddenOnHome: false,
    seen: [],
    steps,
    index,
    active: true,
    target: steps[index]!.target,
    rect,
  })
}

describe('GuidedTourOverlay', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    show()
  })

  test('muestra el texto del rol, avanza y marca visto', async () => {
    const screen = await render(
      <GuidedTourOverlay state={{ routes, index: 0 } as never} navigation={navigation as never} />,
    )
    expect(screen.getByText('PASO 1 DE 5')).toBeTruthy()
    expect(screen.getByText('Lo urgente, primero')).toBeTruthy()
    await fireEvent.press(screen.getByText('Siguiente'))
    await waitFor(() => expect(useGuidedTour.getState().seen).toContain('inicio'))
    await act(() => {
      useGuidedTour.setState({ rect: visible })
    })
    expect(screen.getByText('Tus avisos')).toBeTruthy()
  })

  test('Saltar cierra y Terminar cierra en el último paso', async () => {
    const screen = await render(
      <GuidedTourOverlay state={{ routes, index: 0 } as never} navigation={navigation as never} />,
    )
    await fireEvent.press(screen.getByText('Saltar'))
    await waitFor(() => expect(useGuidedTour.getState().active).toBe(false))
    await act(() => {
      show(steps.length - 1)
    })
    expect(screen.getByText('Terminar')).toBeTruthy()
    await fireEvent.press(screen.getByText('Terminar'))
    await waitFor(() => expect(useGuidedTour.getState().active).toBe(false))
    expect(useGuidedTour.getState().seen).toContain('ayuda')
  })

  test('navega a Solicitudes y usa su pestaña si no encuentra el control', async () => {
    jest.useFakeTimers()
    await act(async () => {
      show(2, null)
    })
    const screen = await render(
      <GuidedTourOverlay state={{ routes, index: 0 } as never} navigation={navigation as never} />,
    )
    expect(navigation.navigate).toHaveBeenCalledWith('CasesTab', { screen: 'Cases' })
    // The bubble waits for the control instead of showing in the center first.
    expect(screen.queryByText(/PASO 3 DE/)).toBeNull()
    await act(() => {
      jest.advanceTimersByTime(1500)
    })
    expect(useGuidedTour.getState().target).toBe('tab:CasesTab')
    expect(screen.getByText(/Encuentra esta opción en Solicitudes/)).toBeTruthy()
    jest.useRealTimers()
  })

  test('alinea el recuadro aunque la ventana mida desde debajo de la barra de estado', () => {
    const rect = { x: 20, y: 100, width: 300, height: 80 }
    // Android can place the full-screen modal root 30 points above the measured window.
    expect(visibleRect(rect, { x: 0, y: -30 }, 400, 800)).toEqual({
      x: 16,
      y: 126,
      width: 308,
      height: 88,
    })
    expect(visibleRect(rect, { x: 0, y: 0 }, 400, 800)?.y).toBe(96)
  })
})
