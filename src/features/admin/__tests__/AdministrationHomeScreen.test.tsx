import { fireEvent, render } from '@testing-library/react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AdministrationHomeScreen } from '../screens/AdministrationHomeScreen'

const mockNavigate = jest.fn()
const mockParentNavigate = jest.fn()
jest.mock('@/features/home/useHomeSummary', () => ({
  useHomeSummary: () => ({
    data: {
      admin: {
        usuarios_sin_area: 1,
        usuarios_sin_nombre: 0,
        solicitudes_acceso_pendientes: 2,
        invitaciones_pendientes: 0,
        tipos_servicio_activos: 1,
        recursos_activos: 1,
        areas_tecnicas_sin_jefe: [],
        areas_tecnicas_sin_tecnico: [],
        conformidades_sin_firmante: 0,
      },
    },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
}))
jest.mock('@/features/home/useIndicators', () => ({
  useCaseIndicators: () => ({
    data: { total: 8, vencidas_hoy: { aceptacion: 1, resolucion: 2 } },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
}))

test('Admin muestra Por completar, indicadores y conserva Gestión', async () => {
  const props = {
    navigation: {
      navigate: mockNavigate,
      getParent: () => ({ navigate: mockParentNavigate }),
    },
    route: { key: 'AdministrationHome', name: 'AdministrationHome' },
  } as unknown as Parameters<typeof AdministrationHomeScreen>[0]
  const screen = await render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 400, height: 800 },
        insets: { top: 0, right: 0, bottom: 0, left: 0 },
      }}
    >
      <AdministrationHomeScreen {...props} />
    </SafeAreaProvider>,
  )
  expect(screen.getByText('Por completar')).toBeTruthy()
  expect(screen.getByText('8 solicitudes · 3 vencidas')).toBeTruthy()
  expect(screen.getByText('Gestión')).toBeTruthy()
  await fireEvent.press(screen.getByRole('button', { name: '2 personas pidieron acceso' }))
  expect(mockNavigate).toHaveBeenCalledWith('AccessRequests')
  await fireEvent.press(screen.getByRole('button', { name: 'Ver indicadores' }))
  expect(mockParentNavigate).toHaveBeenCalledWith('CasesTab', { screen: 'Indicators' })
})
