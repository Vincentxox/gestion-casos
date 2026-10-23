import { fireEvent, render } from '@testing-library/react-native'
import { StyleSheet } from 'react-native'

import type { Profile } from '@/features/auth/types'
import type { AppNotification } from '@/features/notifications/notificationService'
import { colors } from '@/theme/tokens'
import type { NextStepCase, HomeSummary } from '../homeService'
import { HomeScreen } from '../HomeScreen'
import { useCaseCounts } from '@/features/cases/useCases'

const mockNavigate = jest.fn()
const mockRootNavigate = jest.fn()
const mockNextRefetch = jest.fn()
const mockComplete = jest.fn()
const mockHide = jest.fn()
let mockNextItems: NextStepCase[] = []
let mockNextError = false
let mockNextLoading = false
let mockSummaryError = false
let mockSummaryLoading = false
let mockCountsLoading = false
let mockCountsError = false
let mockNotices: AppNotification[] = []
let mockCounts = [
  { status: 'solicitado', total: 2, overdue: 1, unassigned: 0 },
  { status: 'aceptado', total: 1, overdue: 0, unassigned: 0 },
  { status: 'asignado', total: 1, overdue: 0, unassigned: 0 },
  { status: 'en_ejecucion', total: 3, overdue: 2, unassigned: 0 },
  { status: 'en_espera', total: 1, overdue: 0, unassigned: 0 },
  { status: 'reporte_enviado', total: 2, overdue: 0, unassigned: 0 },
  { status: 'validado', total: 1, overdue: 0, unassigned: 0 },
]
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
    isLoading: mockSummaryLoading,
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
  useCaseCounts: jest.fn(() => ({
    data: mockCounts,
    isLoading: mockCountsLoading,
    isError: mockCountsError,
    refetch: jest.fn(),
  })),
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
  mockSummaryLoading = false
  mockCountsLoading = false
  mockCountsError = false
  mockSummary.area_kind = 'tecnica'
  mockProfile.role = 'jefe_area'
  mockProfile.areaName = 'Mantenimiento'
  mockCounts = [
    { status: 'solicitado', total: 2, overdue: 1, unassigned: 0 },
    { status: 'aceptado', total: 1, overdue: 0, unassigned: 0 },
    { status: 'asignado', total: 1, overdue: 0, unassigned: 0 },
    { status: 'en_ejecucion', total: 3, overdue: 2, unassigned: 0 },
    { status: 'en_espera', total: 1, overdue: 0, unassigned: 0 },
    { status: 'reporte_enviado', total: 2, overdue: 0, unassigned: 0 },
    { status: 'validado', total: 1, overdue: 0, unassigned: 0 },
  ]
  ;(useCaseCounts as jest.Mock).mockClear()
})

function renderHome() {
  const props = {
    navigation: { navigate: mockNavigate, getParent: () => ({ navigate: mockRootNavigate }) },
    route: { key: 'Home', name: 'Home' },
  } as unknown as Parameters<typeof HomeScreen>[0]
  return render(<HomeScreen {...props} />)
}

test('las vencidas prevalecen aun cuando hay un siguiente paso', async () => {
  mockNextItems = [
    nextCase,
    { ...nextCase, id: 'case-2', caseNumber: 'CAS-2026-00002', action: 'asignar' },
  ]
  const screen = await renderHome()
  expect(screen.getByText('3 solicitudes vencidas')).toBeTruthy()
  expect(screen.queryByText('Aceptar solicitud')).toBeNull()
})

test('sin vencidas muestra el siguiente paso y el acceso a los demás', async () => {
  mockCounts = mockCounts.map((row) => ({ ...row, overdue: 0 }))
  mockNextItems = [nextCase, { ...nextCase, id: 'case-2' }]
  const screen = await renderHome()
  expect(screen.getByText('Aceptar solicitud')).toBeTruthy()
  expect(screen.getByText('Fuga de agua')).toBeTruthy()
  await fireEvent.press(
    screen.getByRole('button', {
      name: 'Aceptar solicitud. Fuga de agua. Revisar, abre el detalle',
    }),
  )
  expect(mockNavigate).toHaveBeenCalledWith('CasesTab', {
    screen: 'CaseDetail',
    params: { caseId: 'case-1' },
    initial: false,
  })
  await fireEvent.press(screen.getByRole('button', { name: 'Ver 1 paso más en Solicitudes' }))
  expect(mockNavigate).toHaveBeenCalledWith('CasesTab', {
    screen: 'Cases',
    params: { scope: 'area_atiende', status: 'abiertas' },
  })
})

test('con vencidas y sin siguiente paso muestra la tarjeta roja y abre el filtro', async () => {
  const screen = await renderHome()
  const urgent = screen.getByRole('button', {
    name: '3 solicitudes vencidas. Pasaron su plazo; atiéndelas primero. Ver',
  })
  expect(StyleSheet.flatten(urgent.props.style)).toMatchObject({
    backgroundColor: colors.dangerSoft,
  })
  await fireEvent.press(urgent)
  expect(mockNavigate).toHaveBeenCalledWith('CasesTab', {
    screen: 'Cases',
    params: { scope: 'area_atiende', status: 'abiertas', overdueOnly: true },
  })
  expect(screen.queryByText('✓ Estás al día')).toBeNull()
  expect(screen.queryByText('Tu siguiente paso')).toBeNull()
})

test('sin vencidas ni pasos muestra Todo a tiempo y el resumen de trabajos', async () => {
  mockCounts = mockCounts.map((row) => ({ ...row, overdue: 0 }))
  const screen = await renderHome()
  expect(screen.getByText('Todo a tiempo')).toBeTruthy()
  expect(screen.getByText('6 trabajos en curso, ninguno vencido')).toBeTruthy()
  expect(screen.queryByText(/Buenos días|Buenas tardes|Estás al día|Jueves/i)).toBeNull()
  await fireEvent.press(screen.getByRole('button', { name: /Todo a tiempo.*Ver/ }))
  expect(mockNavigate).toHaveBeenCalledWith('CasesTab', {
    screen: 'Cases',
    params: { scope: 'area_atiende', status: 'abiertas' },
  })
})

test('el resumen de Todo a tiempo dice Nada en curso si el conteo es cero', async () => {
  mockCounts = mockCounts.map((row) => ({ ...row, overdue: 0, total: 0 }))
  const screen = await renderHome()
  expect(screen.getByText('Nada en curso')).toBeTruthy()
})

test('durante la carga o ante error no afirma que todo está a tiempo', async () => {
  mockCounts = mockCounts.map((row) => ({ ...row, overdue: 0 }))
  mockCountsLoading = true
  let screen = await renderHome()
  expect(screen.queryByText('Todo a tiempo')).toBeNull()
  expect(screen.getByLabelText('Cargando atención de Inicio')).toBeTruthy()
  await screen.unmount()
  mockCountsLoading = false
  mockNextError = true
  screen = await renderHome()
  expect(screen.queryByText('Todo a tiempo')).toBeNull()
  expect(screen.queryByLabelText('Cargando atención de Inicio')).toBeNull()
  await screen.unmount()
  mockNextError = false
  mockCountsError = true
  screen = await renderHome()
  expect(screen.queryByText('Todo a tiempo')).toBeNull()
})

test('un fallo del resumen no tapa Inicio y deja abrir Avisos', async () => {
  mockSummaryError = true
  const screen = await renderHome()
  expect(screen.queryByText('No pudimos cargar el Inicio')).toBeNull()
  await fireEvent.press(screen.getByRole('button', { name: 'Avisos, conteo no disponible' }))
  expect(mockRootNavigate).toHaveBeenCalledWith('NotificationsFlow')
})

test('Tu área muestra tres conteos y abre Solicitudes con el mismo alcance y filtro', async () => {
  const screen = await renderHome()
  expect(screen.getByText('Tu área')).toBeTruthy()
  expect(useCaseCounts).toHaveBeenCalledWith(
    expect.objectContaining({
      scope: 'area_atiende',
      statuses: expect.arrayContaining(['solicitado', 'validado']),
      priorities: null,
      createdFrom: null,
      createdTo: null,
      overdueOnly: false,
      unassignedOnly: false,
    }),
    true,
  )
  expect(screen.queryByRole('button', { name: /Vencidas, 3 solicitudes/ })).toBeNull()
  expect(screen.getAllByRole('button', { name: /Por aceptar|En curso|En revisión/ })).toHaveLength(
    3,
  )
  await fireEvent.press(screen.getByRole('button', { name: 'Por aceptar, 2 solicitudes' }))
  expect(mockNavigate).toHaveBeenCalledWith('CasesTab', {
    screen: 'Cases',
    params: { scope: 'area_atiende', status: 'abiertas', quick: 'por_aceptar' },
  })
  await fireEvent.press(screen.getByRole('button', { name: 'En curso, 6 solicitudes' }))
  expect(mockNavigate).toHaveBeenCalledWith('CasesTab', {
    screen: 'Cases',
    params: {
      scope: 'area_atiende',
      status: 'abiertas',
      statuses: ['aceptado', 'asignado', 'en_ejecucion', 'en_espera'],
    },
  })
  await fireEvent.press(screen.getByRole('button', { name: 'En revisión, 3 solicitudes' }))
  expect(mockNavigate).toHaveBeenCalledWith('CasesTab', {
    screen: 'Cases',
    params: { scope: 'area_atiende', status: 'abiertas', quick: 'en_revision' },
  })
  await fireEvent.press(screen.getByRole('button', { name: 'Ver todas las solicitudes abiertas' }))
  expect(mockNavigate).toHaveBeenCalledWith('CasesTab', {
    screen: 'Cases',
    params: { scope: 'area_atiende', status: 'abiertas' },
  })
})

test.each([
  ['tecnico', 'tecnica', 'Tu área', 'mi_area'],
  ['jefe_area', 'solicitante', 'Tus solicitudes', 'mias'],
  ['solicitante', 'solicitante', 'Tus solicitudes', 'mias'],
  ['administrador', 'tecnica', 'Solicitudes', 'todas'],
  ['auditor', 'tecnica', 'Solicitudes', 'todas'],
] as const)('%s en área %s ve %s con alcance %s', async (role, areaKind, title, scope) => {
  mockProfile.role = role
  if (role === 'administrador') mockProfile.areaName = null
  mockSummary.area_kind = areaKind
  const screen = await renderHome()
  expect(screen.getByRole('header', { name: title })).toBeTruthy()
  expect(useCaseCounts).toHaveBeenCalledWith(expect.objectContaining({ scope }), true)
  if (role === 'administrador') expect(screen.getByText('Administración')).toBeTruthy()
  expect(
    screen.getByText(
      role === 'jefe_area'
        ? 'Jefe de área'
        : role === 'tecnico'
          ? 'Técnico'
          : role === 'solicitante'
            ? 'Solicitante'
            : role === 'administrador'
              ? 'Administrador'
              : 'Auditor',
    ),
  ).toBeTruthy()
  await fireEvent.press(screen.getByRole('button', { name: 'Ver todas las solicitudes abiertas' }))
  expect(mockNavigate).toHaveBeenCalledWith('CasesTab', {
    screen: 'Cases',
    params: { scope, status: 'abiertas' },
  })
})

test('el avatar abre Perfil', async () => {
  const screen = await renderHome()
  await fireEvent.press(screen.getByRole('button', { name: 'Abrir perfil' }))
  expect(mockNavigate).toHaveBeenCalledWith('Profile')
})

test('el recuadro del técnico navega con Mi área visible en Solicitudes', async () => {
  mockProfile.role = 'tecnico'
  const screen = await renderHome()
  await fireEvent.press(screen.getByRole('button', { name: 'En curso, 6 solicitudes' }))
  expect(mockNavigate).toHaveBeenCalledWith('CasesTab', {
    screen: 'Cases',
    params: {
      scope: 'mi_area',
      status: 'abiertas',
      statuses: ['aceptado', 'asignado', 'en_ejecucion', 'en_espera'],
    },
  })
})

test('el jefe no consulta con un alcance provisional mientras carga el tipo de área', async () => {
  mockSummary.area_kind = null
  const screen = await renderHome()
  expect(useCaseCounts).toHaveBeenCalledWith(expect.objectContaining({ scope: 'todas' }), false)
  expect(screen.getByText('Cargando tus solicitudes…')).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Ver todas las solicitudes abiertas' })).toBeNull()
})

test('sin tipo de área y con resumen cargado no deja el bloque de atención en carga', async () => {
  mockSummary.area_kind = null
  mockNextLoading = true
  mockCounts = mockCounts.map((row) => ({ ...row, overdue: 0 }))
  const screen = await renderHome()
  expect(screen.queryByLabelText('Cargando atención de Inicio')).toBeNull()
  expect(screen.queryByText('Todo a tiempo')).toBeNull()
  expect(screen.queryByRole('button', { name: /solicitudes vencidas/ })).toBeNull()
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
