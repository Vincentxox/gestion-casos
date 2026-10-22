import { fireEvent, render } from '@testing-library/react-native'

import { HelpScreen } from '../HelpScreen'

let mockRole: string | undefined = 'jefe_area'

jest.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (state: unknown) => unknown) =>
    selector({ profile: mockRole ? { role: mockRole } : null }),
}))
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: jest.requireActual<typeof import('react-native')>('react-native').View,
}))

describe('HelpScreen', () => {
  beforeEach(() => {
    mockRole = 'jefe_area'
  })

  test('muestra el recorrido del rol y despliega cada paso', async () => {
    const screen = await render(<HelpScreen />)
    expect(screen.getByText('Tu recorrido · jefe de área')).toBeTruthy()
    expect(screen.queryByText(/acepta o rechaza cada solicitud/)).toBeNull()

    await fireEvent.press(screen.getByLabelText('Paso 2: Acepta y asigna casos'))
    expect(screen.getByText(/acepta o rechaza cada solicitud/)).toBeTruthy()
    expect(
      screen.getByLabelText('Paso 2: Acepta y asigna casos').props.accessibilityState,
    ).toMatchObject({ expanded: true })
  })

  test('abre una pregunta a la vez', async () => {
    const screen = await render(<HelpScreen />)
    await fireEvent.press(screen.getByText('¿Qué es «En espera»?'))
    expect(screen.getByText(/mientras llega un repuesto/)).toBeTruthy()

    await fireEvent.press(screen.getByText('¿Funciona sin internet?'))
    expect(screen.queryByText(/mientras llega un repuesto/)).toBeNull()
    expect(screen.getByText(/se suben solas/)).toBeTruthy()
  })

  test('filtra con la búsqueda y avisa cuando no hay resultados', async () => {
    const screen = await render(<HelpScreen />)
    await fireEvent.changeText(screen.getByLabelText('Buscar en la ayuda'), 'repuesto')
    expect(screen.getByText('¿Qué es «En espera»?')).toBeTruthy()
    expect(screen.queryByText('¿Funciona sin internet?')).toBeNull()

    await fireEvent.changeText(screen.getByLabelText('Buscar en la ayuda'), 'xyz')
    expect(screen.getByText(/No encontramos nada sobre «xyz»/)).toBeTruthy()
  })

  test('no muestra nada sin perfil', async () => {
    mockRole = undefined
    const screen = await render(<HelpScreen />)
    expect(screen.toJSON()).toBeNull()
  })

  test('todos los roles ven la guía y el enlace puede abrirla directamente', async () => {
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
      expect(
        screen.getByTestId('case-guide-marker-1', { includeHiddenElements: true }),
      ).toBeTruthy()
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
