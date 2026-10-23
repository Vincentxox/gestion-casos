import { act, fireEvent, render, waitFor } from '@testing-library/react-native'

import { HelpScreen } from '../HelpScreen'
import { useGuidedTour } from '../tour/useGuidedTour'

let mockRole: string | undefined = 'jefe_area'

jest.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (state: unknown) => unknown) =>
    selector({ profile: mockRole ? { id: 'person', role: mockRole, areaId: 'area' } : null }),
}))
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: jest.requireActual<typeof import('react-native')>('react-native').View,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}))

describe('HelpScreen', () => {
  beforeEach(() => {
    mockRole = 'jefe_area'
    useGuidedTour.setState({
      userId: 'person',
      ready: true,
      seen: [],
      autoShown: true,
      active: false,
      steps: [],
      index: 0,
      target: null,
      rect: null,
    })
  })

  test('muestra el recorrido del rol y Mostrarme inicia en ese paso', async () => {
    const screen = await render(<HelpScreen />)
    expect(screen.getByText('Aprende Nexo en 5 pasos')).toBeTruthy()
    expect(screen.getByText('Tu recorrido')).toBeTruthy()
    await fireEvent.press(screen.getByLabelText('Paso 2: Tu área en números'))
    await waitFor(() => expect(useGuidedTour.getState().index).toBe(1))
    expect(useGuidedTour.getState().active).toBe(true)
  })

  test('Empieza aquí cambia entre Empezar, Continuar y Repetir', async () => {
    const screen = await render(<HelpScreen />)
    expect(screen.getByText('Empezar recorrido')).toBeTruthy()
    await act(() => {
      useGuidedTour.setState({ seen: ['inicio'] })
    })
    expect(screen.getByText('Continuar recorrido')).toBeTruthy()
    await act(() => {
      useGuidedTour.setState({ seen: ['inicio', 'tu-area', 'crear', 'decidir', 'indicadores'] })
    })
    expect(screen.getByText('Repetir recorrido')).toBeTruthy()
    await fireEvent.press(screen.getByText('Repetir recorrido'))
    await waitFor(() => expect(useGuidedTour.getState().seen).toEqual([]))
  })

  test('una guía abre la hoja y lleva a Solicitudes', async () => {
    const navigate = jest.fn()
    const screen = await render(
      <HelpScreen
        navigation={
          { navigate, addListener: jest.fn(() => jest.fn()), setParams: jest.fn() } as never
        }
      />,
    )
    await fireEvent.press(screen.getByText('Aceptar y asignar'))
    expect(screen.getByText(/Abre una solicitud «Por aceptar»/)).toBeTruthy()
    await fireEvent.press(screen.getByText('Ir a Solicitudes'))
    expect(navigate).toHaveBeenCalledWith('CasesTab', { screen: 'Cases', params: undefined })
  })

  test.each([
    ['Crear una solicitud', 'Crear solicitud', 'CasesTab', 'CreateCase'],
    ['Leer los indicadores', 'Abrir Indicadores', 'CasesTab', 'Indicators'],
    ['Sumar a tu equipo', 'Ir a Invitaciones', 'Administration', 'Invitations'],
  ])(
    'la guía %s conserva una pantalla anterior para volver',
    async (title, action, tab, screenName) => {
      mockRole = 'administrador'
      const navigate = jest.fn()
      const screen = await render(
        <HelpScreen
          navigation={
            { navigate, addListener: jest.fn(() => jest.fn()), setParams: jest.fn() } as never
          }
        />,
      )
      await fireEvent.press(screen.getByText(title))
      await fireEvent.press(screen.getByText(action))
      expect(navigate).toHaveBeenCalledWith(tab, { screen: screenName, initial: false })
    },
  )

  test('abre una pregunta a la vez', async () => {
    const screen = await render(<HelpScreen />)
    await fireEvent.press(screen.getByText('¿Qué es «En espera»?'))
    expect(screen.getByText(/El motivo queda en Seguimiento/)).toBeTruthy()
    await fireEvent.press(screen.getByText('¿Funciona sin internet?'))
    expect(screen.queryByText(/El motivo queda en Seguimiento/)).toBeNull()
    expect(screen.getByText(/se suben solas/)).toBeTruthy()
  })

  test('la búsqueda filtra las tres secciones y oculta Empieza aquí', async () => {
    const screen = await render(<HelpScreen />)
    await fireEvent.changeText(screen.getByLabelText('Buscar en la ayuda'), 'repuesto')
    expect(screen.getByText('¿Qué es «En espera»?')).toBeTruthy()
    expect(screen.queryByText('EMPIEZA AQUÍ')).toBeNull()
    expect(screen.queryByText('Cómo leer una solicitud')).toBeNull()
    await fireEvent.changeText(screen.getByLabelText('Buscar en la ayuda'), 'xyz')
    expect(screen.getByText(/No encontramos nada sobre «xyz»/)).toBeTruthy()
  })

  test('no muestra nada sin perfil', async () => {
    mockRole = undefined
    const screen = await render(<HelpScreen />)
    expect(screen.toJSON()).toBeNull()
  })

  test('todos los roles ven la guía de la tarjeta con enlace directo', async () => {
    for (const role of ['solicitante', 'tecnico', 'jefe_area', 'administrador', 'auditor']) {
      mockRole = role
      const screen = await render(
        <HelpScreen route={{ key: 'Help', name: 'Help', params: { section: 'case-card' } }} />,
      )
      expect(screen.getByText('Cómo leer una solicitud')).toBeTruthy()
      expect(screen.getByText('Fuga de agua en baño 2do piso')).toBeTruthy()
      expect(screen.getByText('Por aceptar')).toBeTruthy()
      expect(screen.getByText('Cerrada')).toBeTruthy()
      expect(screen.getByText('9:40')).toBeTruthy()
      await screen.unmount()
    }
  })

  test('buscar oculta la guía directa y al salir limpia el parámetro', async () => {
    const setParams = jest.fn()
    let onBlur: () => void = () => undefined
    const navigation = {
      addListener: jest.fn((_event: string, callback: () => void) => {
        onBlur = callback
        return jest.fn()
      }),
      setParams,
    }
    const screen = await render(
      <HelpScreen
        route={{ key: 'Help', name: 'Help', params: { section: 'case-card' } }}
        navigation={navigation as never}
      />,
    )
    expect(screen.getByText('Cómo leer una solicitud')).toBeTruthy()
    await fireEvent.changeText(screen.getByLabelText('Buscar en la ayuda'), 'repuesto')
    expect(screen.queryByText('Cómo leer una solicitud')).toBeNull()
    onBlur()
    expect(setParams).toHaveBeenCalledWith({ section: undefined })
  })
})
