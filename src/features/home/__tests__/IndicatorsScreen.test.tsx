import { fireEvent, render } from '@testing-library/react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import type { CaseIndicators } from '../indicatorsService'
import { IndicatorsScreen } from '../IndicatorsScreen'

const mockNavigate = jest.fn()
const mockUseCaseIndicators = jest.fn()
let mockData: CaseIndicators

jest.mock('../useIndicators', () => ({
  useCaseIndicators: (...args: unknown[]) => mockUseCaseIndicators(...args),
}))

beforeEach(() => {
  mockNavigate.mockClear()
  mockData = {
    total: 48,
    tiempos_promedio_horas: { aceptacion: 3.4, resolucion: 41, envio_a_aprobacion: 18.6 },
    vencidas_hoy: { aceptacion: 1, resolucion: 2, alta: 1, media: 1, baja: 1 },
    fuera_de_plazo: { aceptacion: 4, resolucion: 6 },
    por_prioridad: { alta: 10, media: 20, baja: 18 },
    por_estado: { en_ejecucion: 5 },
    por_area_destino: [],
    por_area_solicitante: [],
    costo_recursos_por_area: [],
  }
  mockUseCaseIndicators.mockImplementation(() => ({
    data: mockData,
    isLoading: false,
    isError: false,
  }))
})

function renderScreen() {
  const props = {
    navigation: { navigate: mockNavigate },
    route: { key: 'Indicators', name: 'Indicators' },
  } as unknown as Parameters<typeof IndicatorsScreen>[0]
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 400, height: 800 },
        insets: { top: 0, right: 0, bottom: 0, left: 0 },
      }}
    >
      <IndicatorsScreen {...props} />
    </SafeAreaProvider>,
  )
}

test('presenta las cifras y los promedios en duración legible', async () => {
  const screen = await renderScreen()
  expect(screen.getByText('48')).toBeTruthy()
  expect(screen.getByText('solicitudes creadas en los últimos 30 días')).toBeTruthy()
  expect(screen.getByText('3 h 24 min')).toBeTruthy()
  expect(screen.getByText('1 d 17 h')).toBeTruthy()
  expect(screen.getByText('18 h 36 min')).toBeTruthy()
  expect(screen.getByText('Aprobar, en promedio')).toBeTruthy()
  expect(screen.queryByText('Enviar a aprobación')).toBeNull()
  expect(screen.getByText('Aceptadas tarde')).toBeTruthy()
  expect(screen.getByText('Resueltas tarde')).toBeTruthy()
  await fireEvent.press(screen.getByRole('button', { name: 'Todo' }))
  expect(mockUseCaseIndicators).toHaveBeenLastCalledWith(true, null)
  expect(screen.getByText('solicitudes creadas en todo el periodo')).toBeTruthy()
})

test('Más detalle empieza cerrado y despliega los cinco bloques sin tarjetas', async () => {
  const screen = await renderScreen()
  const toggle = screen.getByRole('button', { name: 'Más detalle' })
  expect(toggle.props.accessibilityState).toEqual({ expanded: false })
  expect(screen.queryByText('Por prioridad')).toBeNull()
  await fireEvent.press(toggle)
  expect(screen.getByRole('button', { name: 'Más detalle' }).props.accessibilityState).toEqual({
    expanded: true,
  })
  for (const heading of [
    'Por prioridad',
    'Por estado',
    'Área destino',
    'Área solicitante',
    'Recursos por área solicitante',
  ]) {
    expect(screen.getByText(heading)).toBeTruthy()
  }
  expect(screen.getByText('Alta')).toBeTruthy()
  expect(screen.getByText('En ejecución')).toBeTruthy()
  expect(screen.getAllByText('Sin datos en este periodo')).toHaveLength(3)
  await fireEvent.press(screen.getByRole('button', { name: 'Todo' }))
  expect(mockUseCaseIndicators).toHaveBeenLastCalledWith(true, null)
  expect(screen.getByText('Por prioridad')).toBeTruthy()
  await fireEvent.press(screen.getByRole('button', { name: 'Más detalle' }))
  expect(screen.queryByText('Por prioridad')).toBeNull()
})

test('Más detalle muestra áreas y recursos existentes con costo de dos decimales', async () => {
  mockData.por_area_destino = [{ area_id: 'a1', nombre: 'Mantenimiento', total: 3 }]
  mockData.por_area_solicitante = [{ area_id: 'a2', nombre: 'Administración', total: 4 }]
  mockData.costo_recursos_por_area = [
    { area_id: 'a2', nombre: 'Administración', costo: 12.5, horas_mano_de_obra: 2 },
  ]
  const screen = await renderScreen()
  await fireEvent.press(screen.getByRole('button', { name: 'Más detalle' }))
  expect(screen.getByText('Mantenimiento')).toBeTruthy()
  expect(screen.getAllByText('Administración')).toHaveLength(2)
  expect(screen.getByText('12.50')).toBeTruthy()
  expect(screen.getByText('2 h de mano de obra')).toBeTruthy()
})

test.each(['Vencidas sin aceptar', 'Vencidas sin resolver'])(
  '%s abre Solicitudes con el filtro Vencidas',
  async (label) => {
    const screen = await renderScreen()
    await fireEvent.press(screen.getByRole('button', { name: new RegExp(label) }))
    expect(mockNavigate).toHaveBeenCalledWith('Cases', {
      status: 'abiertas',
      overdueOnly: true,
    })
  },
)

test('ahora mismo permanece independiente del periodo seleccionado', async () => {
  const screen = await renderScreen()
  await fireEvent.press(screen.getByRole('button', { name: 'Todo' }))
  expect(screen.getByRole('button', { name: /Vencidas sin aceptar, 1/ })).toBeTruthy()
  expect(screen.getByRole('button', { name: /Vencidas sin resolver, 2/ })).toBeTruthy()
})
