import { act, fireEvent, render, waitFor } from '@testing-library/react-native'

import { getTutorialFor } from '../../helpContent'
import { GuidedTourOverlay } from '../GuidedTourOverlay'
import { useGuidedTour } from '../useGuidedTour'

const steps = getTutorialFor('tecnico')
const routes = ['Home', 'CasesTab', 'Help'].map((name) => ({ name, key: name }))
const navigation = { navigate: jest.fn() }

function show(index = 0) {
  useGuidedTour.setState({
    userId: 'person',
    ready: true,
    autoAllowed: true,
    autoShown: true,
    seen: [],
    steps,
    index,
    active: true,
    target: steps[index]!.target,
    rect: null,
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
      show(2)
    })
    const screen = await render(
      <GuidedTourOverlay state={{ routes, index: 0 } as never} navigation={navigation as never} />,
    )
    expect(navigation.navigate).toHaveBeenCalledWith('CasesTab', { screen: 'Cases' })
    await act(() => {
      jest.advanceTimersByTime(1500)
    })
    expect(useGuidedTour.getState().target).toBe('tab:CasesTab')
    expect(screen.getByText(/Encuentra esta opción en Solicitudes/)).toBeTruthy()
    jest.useRealTimers()
  })
})
