import { fireEvent, render } from '@testing-library/react-native'

import type { Profile } from '@/features/auth/types'
import type { AppNotification } from '@/features/notifications/notificationService'
import type { NextStepCase, HomeSummary } from '../homeService'
import { HomeScreen } from '../HomeScreen'

const mockNavigate = jest.fn()
const mockRootNavigate = jest.fn()
const mockNextRefetch = jest.fn()
const mockComplete = jest.fn()
const mockHide = jest.fn()
let mockNextItems: NextStepCase[] = []
let mockNextError = false
let mockNextLoading = false
let mockSummaryError = false
let mockNotices: AppNotification[] = []
const mockProfile: Profile = {
  id: 'chief',
  fullName: 'Ana López',
  avatarUrl: null,
  role: 'jefe_area',
  areaId: 'technical-area',
  areaName: 'Mantenimiento',
  organizationId: 'org',
  organizationName: 'Empresa',
  organizationActive: true,
}
const mockSummary: HomeSummary = {
  role: 'jefe_area',
  has_area: true,
  area_kind: 'tecnica',
  notificaciones_sin_leer: 0,
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
const nextCase: NextStepCase = {
  id: 'case-1',
  caseNumber: 'CAS-2026-00001',
  title: 'Fuga de agua',
  category: 'Plomería',
  priority: 'alta',
  status: 'solicitado',
  action: 'aceptar',
  dueAt: '2026-10-18T10:00:00Z',
  overdueStage: 'aceptacion',
  updatedAt: '2026-10-18T08:00:00Z',
}

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useFocusEffect: jest.fn(),
}))
jest.mock('@react-native-community/netinfo', () => ({
  useNetInfo: () => ({ isConnected: true, isInternetReachable: true }),
}))
jest.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (state: { profile: Profile }) => Profile) =>
    selector({ profile: mockProfile }),
}))
jest.mock('../useHomeSummary', () => ({
  useHomeSummary: () => ({
    data: mockSummary,
    isLoading: false,
    isError: mockSummaryError,
    isRefetching: false,
    refetch: jest.fn(),
  }),
}))
jest.mock('../useNextSteps', () => ({
  useNextSteps: () => ({
    data: { items: mockNextItems, total: mockNextItems.length },
    isLoading: mockNextLoading,
    isError: mockNextError,
    refetch: mockNextRefetch,
  }),
}))
jest.mock('@/features/cases/useCases', () => ({
  useCaseCounts: () => ({
    data: [
      { status: 'solicitado', total: 2 },
      { status: 'en_ejecucion', total: 1 },
      { status: 'aprobado', total: 3 },
    ],
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
}))
jest.mock('@/features/notifications/useNotifications', () => ({
  useNotifications: () => ({
    data: mockNotices,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
}))
jest.mock('../useFirstSteps', () => ({
  useFirstSteps: () => ({
    loaded: true,
    hidden: false,
    completed: [],
    complete: mockComplete,
    hide: mockHide,
  }),
}))

beforeEach(() => {
  mockNavigate.mockClear()
  mockRootNavigate.mockClear()
  mockNextRefetch.mockClear()
  mockComplete.mockClear()
  mockHide.mockClear()
  mockNextItems = []
  mockNotices = []
  mockNextError = false
  mockNextLoading = false
  mockSummaryError = false
})

function renderHome() {
  const props = {
    navigation: { navigate: mockNavigate, getParent: () => ({ navigate: mockRootNavigate }) },
    route: { key: 'Home', name: 'Home' },
  } as unknown as Parameters<typeof HomeScreen>[0]
  return render(<HomeScreen {...props} />)
}

test('la tarjeta principal muestra la decisión, vencimiento y detalle; Luego solo cambia la tarjeta', async () => {
  mockNextItems = [
    nextCase,
    { ...nextCase, id: 'case-2', caseNumber: 'CAS-2026-00002', action: 'asignar' },
  ]
  const screen = await renderHome()
  expect(screen.getByText('Aceptar solicitud')).toBeTruthy()
  expect(screen.getByText('Vencida')).toBeTruthy()
  expect(screen.getByText('1 de 2')).toBeTruthy()
  await fireEvent.press(screen.getByRole('button', { name: 'Luego' }))
  expect(screen.getByText('Asignar técnico')).toBeTruthy()
  expect(screen.getByText('2 de 2')).toBeTruthy()
  expect(mockNavigate).not.toHaveBeenCalled()
  await fireEvent.press(
    screen.getByRole('button', { name: 'Asignar CAS-2026-00002, abre el detalle' }),
  )
  expect(mockNavigate).toHaveBeenCalledWith('CasesTab', {
    screen: 'CaseDetail',
    params: { caseId: 'case-2' },
    initial: false,
  })
})

test('la cola vacía dice Estás al día', async () => {
  const screen = await renderHome()
  expect(screen.getByText('Estás al día')).toBeTruthy()
})

test('un error de la cola ofrece reintento', async () => {
  mockNextError = true
  const screen = await renderHome()
  expect(screen.getByText('No pudimos cargar tu siguiente paso')).toBeTruthy()
  await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }))
  expect(mockNextRefetch).toHaveBeenCalled()
})

test('un fallo del resumen no tapa Inicio y deja abrir Avisos', async () => {
  mockSummaryError = true
  const screen = await renderHome()
  expect(screen.queryByText('No pudimos cargar el Inicio')).toBeNull()
  await fireEvent.press(screen.getByRole('button', { name: 'Avisos, conteo no disponible' }))
  expect(mockRootNavigate).toHaveBeenCalledWith('NotificationsFlow')
})

test('Tus solicitudes abre la lista filtrada por fase', async () => {
  const screen = await renderHome()
  expect(screen.getByText('6 abiertas y cerradas')).toBeTruthy()
  await fireEvent.press(screen.getByRole('button', { name: 'Por aceptar, 2 solicitudes' }))
  expect(mockNavigate).toHaveBeenCalledWith('CasesTab', {
    screen: 'Cases',
    params: { scope: 'mias', status: 'pendientes', exactStatus: 'solicitado' },
  })
  await fireEvent.press(screen.getByRole('button', { name: 'En curso, 1 solicitud' }))
  expect(mockNavigate).toHaveBeenCalledWith('CasesTab', {
    screen: 'Cases',
    params: { scope: 'mias', status: 'en_curso' },
  })
  await fireEvent.press(screen.getByRole('button', { name: 'En revisión, 0 solicitudes' }))
  expect(mockNavigate).toHaveBeenCalledWith('CasesTab', {
    screen: 'Cases',
    params: { scope: 'mias', status: 'en_curso' },
  })
})

test('Hoy muestra el comentario del mensaje y Ver todo abre Avisos', async () => {
  mockNotices = [
    {
      id: 1,
      caseId: 'case-1',
      title: 'Nuevo mensaje',
      body: '',
      action: 'mensaje',
      caseNumber: 'CAS-2026-00001',
      caseTitle: 'Fuga',
      actorId: 'member-luis',
      actorName: 'Luis',
      comment: 'Ya llegó el material',
      createdAt: new Date().toISOString(),
      readAt: null,
    },
  ]
  const screen = await renderHome()
  expect(screen.getByText('«Ya llegó el material»')).toBeTruthy()
  expect(screen.getByText('Luis escribió en CAS-2026-00001')).toBeTruthy()
  expect(screen.getAllByText(/CAS-2026-00001/)).toHaveLength(1)
  await fireEvent.press(screen.getByRole('button', { name: 'Ver todos los avisos' }))
  expect(mockRootNavigate).toHaveBeenCalledWith('NotificationsFlow')
})

test('dos avisos de la misma persona mantienen el color del avatar', async () => {
  const notice: AppNotification = {
    id: 1,
    caseId: 'case-1',
    title: 'Nuevo mensaje',
    body: '',
    action: 'mensaje',
    caseNumber: 'CAS-2026-00001',
    caseTitle: 'Fuga',
    actorId: 'member-luis',
    actorName: 'Luis',
    comment: 'Primero',
    createdAt: new Date().toISOString(),
    readAt: null,
  }
  mockNotices = [notice, { ...notice, id: 2, comment: 'Después' }]
  const screen = await renderHome()
  const avatars = screen.getAllByLabelText('Luis')
  expect(avatars).toHaveLength(2)
  expect(avatars[0]!.props.style.at(-1).backgroundColor).toBe(
    avatars[1]!.props.style.at(-1).backgroundColor,
  )
})

test('Primeros pasos se puede ocultar y lleva a la siguiente tarea', async () => {
  const screen = await renderHome()
  expect(screen.getByText('0/5')).toBeTruthy()
  await fireEvent.press(screen.getByRole('button', { name: 'Revisa tu perfil' }))
  expect(mockComplete).toHaveBeenCalledWith('profile')
  expect(mockNavigate).toHaveBeenCalledWith('Profile')
  await fireEvent.press(screen.getByRole('button', { name: 'Ocultar Primeros pasos' }))
  expect(mockHide).toHaveBeenCalled()
})
