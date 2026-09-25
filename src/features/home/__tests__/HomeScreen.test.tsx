import { fireEvent, render } from '@testing-library/react-native'

import type { Profile } from '@/features/auth/types'
import type { HomeSummary } from '../homeService'
import { HomeScreen } from '../HomeScreen'

const mockNavigate = jest.fn()
const mockProfile: Profile = {
  id: 'chief',
  fullName: 'Ana López',
  avatarUrl: null,
  role: 'jefe_area',
  areaId: 'technical-area',
  areaName: 'Mantenimiento',
  organizationId: 'org',
  organizationName: 'Empresa',
}
const mockSummary: HomeSummary = {
  role: 'jefe_area',
  has_area: true,
  area_kind: 'tecnica',
  cases: {
    activas: 2,
    solicitado: 1,
    aceptado: 0,
    asignado: 0,
    en_ejecucion: 0,
    en_espera: 0,
    en_revision: 1,
    cerradas_30_dias: 0,
    alta_prioridad_activas: 0,
  },
  mine: {
    solicitudes_activas: 0,
    trabajos_por_iniciar: 0,
    trabajos_en_ejecucion: 0,
    trabajos_en_espera: 0,
  },
  inbox: {
    reportes_por_validar: 1,
    reportes_por_aprobar: 0,
    por_aceptar: 1,
    sin_asignar: 0,
  },
  admin: null,
}

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useFocusEffect: jest.fn(),
}))
jest.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (state: { profile: Profile }) => Profile) =>
    selector({ profile: mockProfile }),
}))
jest.mock('../useHomeSummary', () => ({
  useHomeSummary: () => ({
    data: mockSummary,
    isLoading: false,
    isError: false,
    isRefetching: false,
    refetch: jest.fn(),
  }),
}))
jest.mock('@/features/cases/useCases', () => ({
  useCases: () => ({
    data: [],
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
}))

beforeEach(() => {
  mockNavigate.mockClear()
  mockProfile.role = 'jefe_area'
  mockSummary.inbox.reportes_por_validar = 1
  mockSummary.inbox.reportes_por_aprobar = 0
  mockSummary.inbox.por_aceptar = 1
})

test('el aviso por validar abre solicitudes en reporte enviado', async () => {
  const props = {
    navigation: { navigate: mockNavigate },
    route: { key: 'Home', name: 'Home' },
  } as unknown as Parameters<typeof HomeScreen>[0]
  const screen = await render(<HomeScreen {...props} />)

  await fireEvent.press(screen.getByRole('button', { name: '1 reporte por validar' }))

  expect(mockNavigate).toHaveBeenCalledWith('CasesTab', {
    screen: 'Cases',
    params: { scope: 'mi_area', exactStatus: 'reporte_enviado' },
  })
})

test('el aviso por aprobar abre solicitudes validadas', async () => {
  mockProfile.role = 'administrador'
  mockSummary.inbox.reportes_por_validar = 0
  mockSummary.inbox.reportes_por_aprobar = 1
  mockSummary.inbox.por_aceptar = 0
  const props = {
    navigation: { navigate: mockNavigate },
    route: { key: 'Home', name: 'Home' },
  } as unknown as Parameters<typeof HomeScreen>[0]
  const screen = await render(<HomeScreen {...props} />)

  await fireEvent.press(screen.getByRole('button', { name: '1 reporte por aprobar' }))

  expect(mockNavigate).toHaveBeenCalledWith('CasesTab', {
    screen: 'Cases',
    params: { scope: 'todas', exactStatus: 'validado' },
  })
})
