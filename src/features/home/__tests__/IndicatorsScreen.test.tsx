import { render } from '@testing-library/react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { IndicatorsScreen } from '../IndicatorsScreen'

jest.mock('../useIndicators', () => ({
  useCaseIndicators: () => ({
    data: {
      total: 1,
      por_estado: { en_ejecucion: 1 },
      por_prioridad: { media: 1 },
      tiempos_promedio_horas: {},
      vencidas_hoy: {},
      fuera_de_plazo: {},
      por_area_destino: [],
      por_area_solicitante: [],
      costo_recursos_por_area: [],
    },
    isLoading: false,
    isError: false,
  }),
}))

test('usa etiquetas oficiales y muestra los apartados vacíos', async () => {
  const screen = await render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 400, height: 800 },
        insets: { top: 0, right: 0, bottom: 0, left: 0 },
      }}
    >
      <IndicatorsScreen />
    </SafeAreaProvider>,
  )
  expect(screen.getByText('En ejecución')).toBeTruthy()
  expect(screen.getByText('Media')).toBeTruthy()
  expect(screen.getByText('Solicitada')).toBeTruthy()
  expect(screen.getAllByText('Sin datos en este periodo')).toHaveLength(3)
})
