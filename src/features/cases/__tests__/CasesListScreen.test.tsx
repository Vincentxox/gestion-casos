import { act, fireEvent, render, waitFor } from '@testing-library/react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Platform, StyleSheet } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import type { Profile } from '@/features/auth/types'
import { statusMeta } from '@/theme/statusMeta'
import { colors } from '@/theme/tokens'
import { calendarDateBoundary } from '../caseSearch'
import { CASE_STATUSES, type CaseRecord } from '../types'
import { CasesListScreen } from '../screens/CasesListScreen'
import { useCaseCounts, useCases } from '../useCases'

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn().mockResolvedValue('seen'),
    setItem: jest.fn().mockResolvedValue(undefined),
  },
}))

const mockProfile: Profile = {
  id: 'admin',
  fullName: 'Administrador',
  avatarUrl: null,
  role: 'administrador',
  areaId: null,
  areaName: null,
  organizationId: 'org',
  organizationName: 'Empresa',
  organizationActive: true,
}
let mockAreaKind: 'solicitante' | 'tecnica' = 'tecnica'

jest.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (state: { profile: Profile }) => Profile) =>
    selector({ profile: mockProfile }),
}))
jest.mock('@/features/home/useHomeSummary', () => ({
  useHomeSummary: () => ({ data: { area_kind: mockAreaKind } }),
}))
jest.mock('@react-native-community/netinfo', () => ({
  useNetInfo: () => ({ isConnected: true, isInternetReachable: true }),
}))
jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker')
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useFocusEffect: (callback: () => void) =>
    jest.requireActual<typeof import('react')>('react').useEffect(callback, [callback]),
}))
jest.mock('../useCases', () => ({
  useCases: jest.fn(),
  useCaseCounts: jest.fn(),
}))

async function setup(params?: Parameters<typeof CasesListScreen>[0]['route']['params']) {
  const parent = { navigate: jest.fn() }
  const navigation = { navigate: jest.fn(), getParent: jest.fn(() => parent) }
  const screen = await render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 0, right: 0, bottom: 0, left: 0 },
      }}
    >
      <CasesListScreen
        navigation={navigation as never}
        route={{ key: 'Cases', name: 'Cases', params } as never}
      />
    </SafeAreaProvider>,
  )
  return { screen, navigation, parent }
}

beforeEach(() => {
  ;(AsyncStorage.getItem as jest.Mock).mockResolvedValue('seen')
  ;(AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined)
  mockProfile.role = 'administrador'
  mockAreaKind = 'tecnica'
  ;(useCases as jest.Mock).mockReturnValue({
    data: { pages: [[]] },
    error: null,
    isLoading: false,
    isRefetching: false,
    refetch: jest.fn(),
    hasNextPage: false,
    fetchNextPage: jest.fn(),
    isFetchingNextPage: false,
    isFetchNextPageError: false,
  })
  ;(useCaseCounts as jest.Mock).mockReturnValue({
    data: [
      { status: 'solicitado', total: 2, overdue: 1, unassigned: 2 },
      { status: 'aceptado', total: 1, overdue: 0, unassigned: 1 },
      { status: 'en_ejecucion', total: 4, overdue: 2, unassigned: 0 },
      { status: 'aprobado', total: 3, overdue: 0, unassigned: 0 },
    ],
    isError: false,
    refetch: jest.fn(),
  })
  ;(useCases as jest.Mock).mockClear()
})

test('el buscador y el botón de filtros contrastan con el fondo de Solicitudes', async () => {
  const { screen } = await setup()
  expect(
    StyleSheet.flatten(screen.getByLabelText('Buscar solicitudes').parent!.props.style),
  ).toMatchObject({
    backgroundColor: colors.surface,
    borderColor: colors.cardBorder,
    borderWidth: 1,
  })
  expect(
    StyleSheet.flatten(screen.getByRole('button', { name: /Más filtros/ }).props.style),
  ).toMatchObject({
    backgroundColor: colors.surface,
    borderColor: colors.cardBorder,
    borderWidth: 1,
  })
})

test('Cerradas oculta los chips rápidos y quita el filtro activo', async () => {
  const { screen } = await setup()
  await fireEvent.press(screen.getByRole('button', { name: 'Vencidas, 3 solicitudes' }))
  await fireEvent.press(screen.getByRole('tab', { name: /Cerradas, \d+ solicitudes/ }))
  expect(screen.queryByRole('button', { name: 'Vencidas, 3 solicitudes' })).toBeNull()
  expect(screen.queryByLabelText('Filtros rápidos')).toBeNull()
  expect(useCases).toHaveBeenLastCalledWith(
    expect.objectContaining({ overdueOnly: false, statuses: expect.arrayContaining(['aprobado']) }),
    true,
  )
})

test('el aviso aparece con una fila, Entendido lo guarda y Ver guía abre Ayuda', async () => {
  ;(AsyncStorage.getItem as jest.Mock).mockResolvedValue(null)
  ;(useCases as jest.Mock).mockReturnValue({
    data: { pages: [[sortedCase('first', '2026-10-16T12:00:00Z')]] },
    error: null,
    isLoading: false,
    refetch: jest.fn(),
    hasNextPage: false,
    fetchNextPage: jest.fn(),
    isFetchingNextPage: false,
    isFetchNextPageError: false,
  })
  const { screen, parent } = await setup()
  await fireEvent(screen.getByTestId('first-case-row'), 'layout', {
    nativeEvent: { layout: { y: 20 } },
  })
  await waitFor(() => expect(screen.getByText('Así se lee cada solicitud')).toBeTruthy())
  await fireEvent.press(screen.getByRole('button', { name: 'Ver guía' }))
  expect(parent.navigate).toHaveBeenCalledWith('Help', { section: 'case-card' })
  expect(AsyncStorage.setItem).toHaveBeenCalledWith('case-list-guide:admin', 'seen')
  expect(screen.queryByText('Así se lee cada solicitud')).toBeNull()
})

test('sin filas no aparece el aviso inicial', async () => {
  ;(AsyncStorage.getItem as jest.Mock).mockResolvedValue(null)
  const { screen } = await setup()
  expect(screen.queryByText('Así se lee cada solicitud')).toBeNull()
})

test('el administrador entra en Abiertas y ve los filtros rápidos con conteos', async () => {
  const { screen } = await setup()
  expect(
    screen.getByRole('tab', { name: 'Abiertas, 7 solicitudes' }).props.accessibilityState,
  ).toEqual({
    selected: true,
  })
  expect(screen.queryByRole('tab', { name: 'Bandeja' })).toBeNull()
  expect(screen.queryByLabelText('Alcance')).toBeNull()
  expect(screen.getByRole('tab', { name: 'Abiertas, 7 solicitudes' })).toBeTruthy()
  expect(screen.getByRole('tab', { name: 'Cerradas, 3 solicitudes' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Vencidas, 3 solicitudes' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Por aceptar, 2 solicitudes' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Sin asignar, 1 solicitud' })).toBeTruthy()
  expect(
    StyleSheet.flatten(screen.getByRole('tab', { name: 'Abiertas, 7 solicitudes' }).props.style),
  ).toMatchObject({ minHeight: 44 })
  expect(
    StyleSheet.flatten(screen.getByRole('button', { name: 'Más filtros, 0 activos' }).props.style),
  ).toMatchObject({ width: 44, height: 44 })

  await fireEvent.press(screen.getByRole('tab', { name: 'Abiertas, 7 solicitudes' }))
  expect(useCases).toHaveBeenLastCalledWith(
    expect.objectContaining({
      scope: 'todas',
      statuses: expect.arrayContaining(['en_ejecucion']),
    }),
    true,
  )
})

const sortedCase = (id: string, createdAt: string): CaseRecord =>
  ({
    id,
    caseNumber: `CAS-${id}`,
    title: `Solicitud ${id}`,
    createdAt,
    status: 'solicitado',
    priority: 'media',
    location: 'Oficina',
    assigneeName: null,
  }) as CaseRecord

test('Más antiguas muestra primero el grupo del día más viejo', async () => {
  const oldest = sortedCase('old', '2026-10-01T12:00:00Z')
  const newest = sortedCase('new', '2026-10-16T12:00:00Z')
  ;(useCases as jest.Mock).mockReturnValue({
    data: { pages: [[oldest], [newest]] },
    error: null,
    isLoading: false,
    isRefetching: false,
    refetch: jest.fn(),
    hasNextPage: false,
    fetchNextPage: jest.fn(),
    isFetchingNextPage: false,
    isFetchNextPageError: false,
  })
  const { screen } = await setup()
  await fireEvent.press(screen.getByRole('button', { name: 'Más filtros, 0 activos' }))
  await fireEvent.press(screen.getByRole('button', { name: 'Más antiguas' }))
  expect(
    screen
      .getAllByRole('button')
      .filter(({ props }) => props.accessibilityLabel?.startsWith('CAS-'))
      .map(({ props }) => props.accessibilityLabel?.split(',')[0]),
  ).toEqual(['CAS-old', 'CAS-new'])
  expect(screen.getByText('Antes')).toBeTruthy()
})

test.each(['Prioridad', 'Vencen antes'])(
  '%s conserva el orden del servidor sin títulos de día',
  async (label) => {
    const first = sortedCase('first', '2026-10-01T12:00:00Z')
    const second = sortedCase('second', '2026-10-16T12:00:00Z')
    ;(useCases as jest.Mock).mockReturnValue({
      data: { pages: [[first], [second]] },
      error: null,
      isLoading: false,
      isRefetching: false,
      refetch: jest.fn(),
      hasNextPage: false,
      fetchNextPage: jest.fn(),
      isFetchingNextPage: false,
      isFetchNextPageError: false,
    })
    const { screen } = await setup()
    await fireEvent.press(screen.getByRole('button', { name: 'Más filtros, 0 activos' }))
    await fireEvent.press(screen.getByRole('button', { name: label }))
    expect(
      screen
        .getAllByRole('button')
        .filter(({ props }) => props.accessibilityLabel?.startsWith('CAS-'))
        .map(({ props }) => props.accessibilityLabel?.split(',')[0]),
    ).toEqual(['CAS-first', 'CAS-second'])
    expect(screen.queryByText(/de octubre de 2026/)).toBeNull()
  },
)

test.each(['administrador', 'jefe_area'] as const)(
  '%s no ve Bandeja en Más alcances',
  async (role) => {
    mockProfile.role = role
    const { screen } = await setup()
    await fireEvent.press(screen.getByRole('button', { name: 'Más filtros, 0 activos' }))
    expect(screen.queryByRole('button', { name: 'Bandeja' })).toBeNull()
  },
)

test.each([
  ['administrador', 'todas'],
  ['jefe_area', 'area_atiende'],
] as const)('%s abre un enlace de Inicio con Bandeja en %s', async (role, expectedScope) => {
  mockProfile.role = role
  const { screen } = await setup({ scope: 'bandeja' })
  expect(useCases).toHaveBeenLastCalledWith(expect.objectContaining({ scope: expectedScope }), true)
  expect(
    screen.getByRole('tab', {
      name: role === 'administrador' ? 'Abiertas, 7 solicitudes' : 'Mi área',
    }),
  ).toBeTruthy()
})

test.each(['administrador', 'jefe_area', 'auditor'] as const)(
  '%s abre Indicadores desde el encabezado',
  async (role) => {
    mockProfile.role = role
    const { screen, navigation } = await setup()
    const button = screen.getByRole('button', { name: 'Abrir Indicadores' })
    expect(StyleSheet.flatten(button.props.style)).toMatchObject({ minHeight: 44, minWidth: 44 })
    await fireEvent.press(button)
    expect(navigation.navigate).toHaveBeenCalledWith('Indicators')
  },
)

test.each(['solicitante', 'tecnico'] as const)('%s no ve Indicadores', async (role) => {
  mockProfile.role = role
  const { screen } = await setup()
  expect(screen.queryByRole('button', { name: 'Abrir Indicadores' })).toBeNull()
})

test('el auditor entra en Abiertas y no ve selector de alcance', async () => {
  mockProfile.role = 'auditor'
  const { screen } = await setup()
  expect(
    screen.getByRole('tab', { name: 'Abiertas, 7 solicitudes' }).props.accessibilityState,
  ).toEqual({
    selected: true,
  })
  expect(screen.queryByLabelText('Alcance')).toBeNull()
  expect(useCases).toHaveBeenLastCalledWith(expect.objectContaining({ scope: 'todas' }), true)
})

test('el técnico recibe los dos alcances de trabajo y área', async () => {
  mockProfile.role = 'tecnico'
  const { screen } = await setup()
  expect(screen.getByRole('tab', { name: 'Mis trabajos' }).props.accessibilityState).toEqual({
    selected: true,
  })
  await fireEvent.press(screen.getByRole('tab', { name: 'Mi área' }))
  expect(useCases).toHaveBeenLastCalledWith(expect.objectContaining({ scope: 'mi_area' }), true)
})

test('el técnico solo ve sus dos alcances principales y ninguna sección de alcances extra', async () => {
  mockProfile.role = 'tecnico'
  const { screen } = await setup()
  await fireEvent.press(screen.getByRole('button', { name: 'Más filtros, 0 activos' }))
  expect(screen.queryByText('Más alcances')).toBeNull()
  expect(screen.queryByRole('button', { name: 'Todas' })).toBeNull()
  expect(screen.getByRole('tab', { name: 'Mis trabajos' })).toBeTruthy()
  expect(screen.getByRole('tab', { name: 'Mi área' })).toBeTruthy()
})

test('el jefe de un área solicitante conserva Mi área y Mías sin alcances extra', async () => {
  mockProfile.role = 'jefe_area'
  mockAreaKind = 'solicitante'
  const { screen } = await setup()
  await fireEvent.press(screen.getByRole('button', { name: 'Más filtros, 0 activos' }))
  expect(screen.queryByText('Más alcances')).toBeNull()
  expect(screen.getByRole('tab', { name: 'Mi área' })).toBeTruthy()
  expect(screen.getByRole('tab', { name: 'Mías' })).toBeTruthy()
})

test('la hoja permite elegir y quitar uno de los diez estados exactos', async () => {
  const { screen } = await setup()
  await fireEvent.press(screen.getByRole('button', { name: 'Más filtros, 0 activos' }))
  expect(screen.queryByRole('button', { name: 'Validada' })).toBeNull()
  await fireEvent.press(screen.getByRole('button', { name: 'Estado exacto, Todos' }))
  for (const value of CASE_STATUSES)
    expect(screen.getByRole('button', { name: statusMeta[value].label })).toBeTruthy()
  await fireEvent.press(screen.getByRole('button', { name: 'Validada' }))
  expect(useCases).toHaveBeenLastCalledWith(
    expect.objectContaining({ statuses: ['validado'] }),
    true,
  )
  expect(screen.getByRole('button', { name: 'Quitar filtro Validada' })).toBeTruthy()
  await fireEvent.press(screen.getByRole('button', { name: 'Quitar filtro Validada' }))
  expect(useCases).toHaveBeenLastCalledWith(
    expect.objectContaining({ statuses: expect.arrayContaining(['solicitado', 'validado']) }),
    true,
  )
})

test('Vencidas va primero, en rojo y conserva el estado seleccionado', async () => {
  const { screen } = await setup()
  const buttons = screen.getAllByRole('button')
  const overdueIndex = buttons.findIndex((item) =>
    item.props.accessibilityLabel?.startsWith('Vencidas,'),
  )
  const acceptingIndex = buttons.findIndex((item) =>
    item.props.accessibilityLabel?.startsWith('Por aceptar,'),
  )
  expect(overdueIndex).toBeGreaterThanOrEqual(0)
  expect(overdueIndex).toBeLessThan(acceptingIndex)
  const overdue = screen.getByRole('button', { name: 'Vencidas, 3 solicitudes' })
  expect(StyleSheet.flatten(overdue.props.style)).toMatchObject({
    backgroundColor: colors.surface,
    borderColor: colors.error,
  })
  await fireEvent.press(overdue)
  expect(
    screen.getByRole('button', { name: 'Vencidas, 3 solicitudes' }).props.accessibilityState,
  ).toEqual({ selected: true })
  expect(
    StyleSheet.flatten(screen.getByRole('button', { name: 'Vencidas, 3 solicitudes' }).props.style)
      .backgroundColor,
  ).toBe(colors.error)
  expect(useCases).toHaveBeenLastCalledWith(expect.objectContaining({ overdueOnly: true }), true)
})

test('el jefe técnico tiene Mi área/Enviadas y Sin asignar conserva Mi área', async () => {
  mockProfile.role = 'jefe_area'
  const { screen } = await setup()
  expect(screen.getByRole('tab', { name: 'Mi área' }).props.accessibilityState).toEqual({
    selected: true,
  })
  expect(screen.queryByRole('tab', { name: 'Bandeja' })).toBeNull()
  expect(screen.getByRole('tab', { name: 'Enviadas' })).toBeTruthy()
  expect(screen.queryByRole('tab', { name: 'Todas' })).toBeNull()
  await fireEvent.press(screen.getByRole('button', { name: 'Sin asignar, 1 solicitud' }))
  expect(useCases).toHaveBeenLastCalledWith(
    expect.objectContaining({
      scope: 'area_atiende',
      statuses: ['aceptado'],
      unassignedOnly: true,
    }),
    true,
  )
  expect(useCaseCounts).toHaveBeenLastCalledWith(
    expect.objectContaining({ scope: 'area_atiende', statuses: null, unassignedOnly: false }),
    true,
  )
  expect(screen.getByRole('tab', { name: 'Abiertas, 1 solicitudes' })).toBeTruthy()
  await fireEvent.press(screen.getByRole('tab', { name: 'Enviadas' }))
  expect(useCases).toHaveBeenLastCalledWith(expect.objectContaining({ scope: 'area_envia' }), true)
})

test('un alcance heredado de Inicio se ve y se puede quitar para volver al principal', async () => {
  mockProfile.role = 'jefe_area'
  const { screen } = await setup({ scope: 'mias' })
  expect(useCases).toHaveBeenLastCalledWith(expect.objectContaining({ scope: 'mias' }), true)
  expect(screen.getByRole('button', { name: 'Quitar filtro Alcance: Mías' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Más filtros, 1 activo' })).toBeTruthy()
  await fireEvent.press(screen.getByRole('button', { name: 'Quitar filtro Alcance: Mías' }))
  expect(useCases).toHaveBeenLastCalledWith(
    expect.objectContaining({ scope: 'area_atiende' }),
    true,
  )
  expect(screen.queryByRole('button', { name: 'Quitar filtro Alcance: Mías' })).toBeNull()
})

test('Limpiar todo quita un alcance heredado, pero conserva uno principal', async () => {
  mockProfile.role = 'jefe_area'
  const { screen } = await setup({ scope: 'mi_area' })
  expect(
    screen.getByRole('button', { name: 'Quitar filtro Alcance: Mi área y enviadas' }),
  ).toBeTruthy()
  await fireEvent.press(screen.getByRole('button', { name: 'Limpiar todo' }))
  expect(useCases).toHaveBeenLastCalledWith(
    expect.objectContaining({ scope: 'area_atiende' }),
    true,
  )
  await fireEvent.press(screen.getByRole('tab', { name: 'Enviadas' }))
  await fireEvent.press(screen.getByRole('button', { name: 'Vencidas, 3 solicitudes' }))
  await fireEvent.press(screen.getByRole('button', { name: 'Limpiar todo' }))
  expect(useCases).toHaveBeenLastCalledWith(expect.objectContaining({ scope: 'area_envia' }), true)
})

test('el filtro rápido de Inicio se marca solo en su lugar y Limpiar todo lo quita', async () => {
  const { screen } = await setup({ scope: 'sin_asignar', exactStatus: 'aceptado' })
  expect(screen.getByRole('button', { name: 'Más filtros, 1 activo' })).toBeTruthy()
  expect(useCases).toHaveBeenLastCalledWith(
    expect.objectContaining({ scope: 'todas', statuses: ['aceptado'], unassignedOnly: true }),
    true,
  )
  expect(screen.queryByRole('button', { name: 'Quitar filtro Sin asignar' })).toBeNull()
  expect(
    screen.getByRole('button', { name: 'Sin asignar, 1 solicitud' }).props.accessibilityState,
  ).toEqual({ selected: true })
  await fireEvent.press(screen.getByRole('button', { name: 'Vencidas, 3 solicitudes' }))
  expect(screen.getByRole('button', { name: 'Más filtros, 1 activo' })).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Quitar filtro Vencidas' })).toBeNull()
  await fireEvent.press(screen.getByRole('button', { name: 'Limpiar todo' }))
  expect(screen.getByRole('button', { name: 'Más filtros, 0 activos' })).toBeTruthy()
  expect(useCases).toHaveBeenLastCalledWith(
    expect.objectContaining({ scope: 'todas', overdueOnly: false }),
    true,
  )
})

test('Inicio puede abrir Tus solicitudes filtradas por fase', async () => {
  mockProfile.role = 'solicitante'
  const { screen } = await setup({ scope: 'mias', status: 'en_curso' })
  expect(
    screen.getByRole('tab', { name: 'Abiertas, 7 solicitudes' }).props.accessibilityState,
  ).toEqual({
    selected: true,
  })
  expect(useCases).toHaveBeenLastCalledWith(
    expect.objectContaining({ scope: 'mias', statuses: expect.arrayContaining(['en_ejecucion']) }),
    true,
  )
})

test('el botón de filtros permite combinar prioridades y fecha de creación', async () => {
  const { screen } = await setup()
  await fireEvent.press(screen.getByRole('button', { name: 'Más filtros, 0 activos' }))
  await fireEvent.press(screen.getByRole('button', { name: 'Alta' }))
  expect(screen.getByRole('button', { name: 'Más filtros, 1 activo' })).toBeTruthy()
  await fireEvent.press(screen.getByRole('button', { name: 'Media' }))
  expect(useCases).toHaveBeenLastCalledWith(
    expect.objectContaining({ priorities: ['alta', 'media'] }),
    true,
  )
  await fireEvent.press(screen.getByRole('button', { name: '7 días' }))
  expect(useCases).toHaveBeenLastCalledWith(
    expect.objectContaining({ createdFrom: expect.any(String) }),
    true,
  )
})

test('la hoja ordena sus secciones y pliega Estado exacto', async () => {
  const { screen } = await setup()
  await fireEvent.press(screen.getByRole('button', { name: 'Más filtros, 0 activos' }))
  const labels = screen
    .getAllByText(/^(Ordenar por|Fecha de creación|Prioridad)$/)
    .map((item) => item.props.children)
  expect(labels).toEqual(['Ordenar por', 'Prioridad', 'Fecha de creación', 'Prioridad'])
  const exact = screen.getByRole('button', { name: 'Estado exacto, Todos' })
  expect(exact.props.accessibilityState).toEqual({ expanded: false })
  expect(screen.queryByRole('button', { name: 'Validada' })).toBeNull()
  await fireEvent.press(exact)
  expect(screen.getByRole('button', { name: 'Validada' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Ver 7 solicitudes' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Limpiar' })).toBeTruthy()
})

test('Personalizado usa el calendario y rechaza un rango invertido', async () => {
  const { screen } = await setup()
  await fireEvent.press(screen.getByRole('button', { name: 'Más filtros, 0 activos' }))
  await fireEvent.press(screen.getByRole('button', { name: 'Personalizado' }))
  await fireEvent.press(screen.getByRole('button', { name: 'Desde, elegir fecha' }))
  await fireEvent(
    screen.getByTestId('calendar-picker'),
    'change',
    { type: 'set' },
    new Date(2026, 9, 1),
  )
  await fireEvent.press(screen.getByRole('button', { name: 'Hasta, elegir fecha' }))
  await fireEvent(
    screen.getByTestId('calendar-picker'),
    'change',
    { type: 'set' },
    new Date(2026, 9, 8),
  )
  await fireEvent.press(screen.getByRole('button', { name: 'Ver 7 solicitudes' }))
  expect(useCases).toHaveBeenLastCalledWith(
    expect.objectContaining({
      createdFrom: calendarDateBoundary('2026-10-01'),
      createdTo: calendarDateBoundary('2026-10-08', true),
    }),
    true,
  )
  await fireEvent.press(screen.getByRole('button', { name: 'Más filtros, 1 activo' }))
  expect(screen.getByRole('button', { name: 'Quitar filtro Creadas: 1 oct – 8 oct' })).toBeTruthy()
  await fireEvent.press(screen.getByRole('button', { name: 'Hasta, 8 oct 2026' }))
  await fireEvent(
    screen.getByTestId('calendar-picker'),
    'change',
    { type: 'set' },
    new Date(2026, 8, 30),
  )
  expect(screen.getByRole('alert').props.children).toBe(
    'La fecha final debe ser posterior a la inicial',
  )
  expect(
    screen.getByRole('button', { name: 'Ver 7 solicitudes' }).props.accessibilityState,
  ).toMatchObject({ disabled: true })
})

test('en iOS el calendario permite girar dos veces y solo Listo lo cierra', async () => {
  const originalPlatform = Platform.OS
  Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' })
  try {
    const { screen } = await setup()
    await fireEvent.press(screen.getByRole('button', { name: 'Más filtros, 0 activos' }))
    await fireEvent.press(screen.getByRole('button', { name: 'Personalizado' }))
    await fireEvent.press(screen.getByRole('button', { name: 'Desde, elegir fecha' }))
    await fireEvent(
      screen.getByTestId('calendar-picker'),
      'change',
      { type: 'set' },
      new Date(2026, 9, 1),
    )
    expect(screen.getByTestId('calendar-picker')).toBeTruthy()
    await fireEvent(
      screen.getByTestId('calendar-picker'),
      'change',
      { type: 'set' },
      new Date(2026, 9, 2),
    )
    expect(screen.getByTestId('calendar-picker')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Desde, 2 oct 2026' })).toBeTruthy()
    await fireEvent.press(screen.getByRole('button', { name: 'Listo' }))
    expect(screen.queryByTestId('calendar-picker')).toBeNull()
  } finally {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalPlatform })
  }
})

test('Inicio puede abrir filtros rápidos, vencidas y estados exactos nuevos', async () => {
  const { screen } = await setup({ scope: 'area_atiende', quick: 'en_revision' })
  expect(useCases).toHaveBeenLastCalledWith(
    expect.objectContaining({ scope: 'area_atiende', statuses: ['reporte_enviado', 'validado'] }),
    true,
  )
  expect(
    screen.getByRole('button', { name: 'En revisión, 0 solicitudes' }).props.accessibilityState,
  ).toEqual({ selected: true })

  await screen.rerender(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 0, right: 0, bottom: 0, left: 0 },
      }}
    >
      <CasesListScreen
        navigation={{ navigate: jest.fn() } as never}
        route={
          {
            key: 'Cases',
            name: 'Cases',
            params: { scope: 'area_atiende', overdueOnly: true },
          } as never
        }
      />
    </SafeAreaProvider>,
  )
  expect(useCases).toHaveBeenLastCalledWith(
    expect.objectContaining({ scope: 'area_atiende', overdueOnly: true }),
    true,
  )
  await screen.rerender(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 0, right: 0, bottom: 0, left: 0 },
      }}
    >
      <CasesListScreen
        navigation={{ navigate: jest.fn() } as never}
        route={
          {
            key: 'Cases',
            name: 'Cases',
            params: {
              scope: 'area_atiende',
              statuses: ['aceptado', 'asignado', 'en_ejecucion', 'en_espera'],
            },
          } as never
        }
      />
    </SafeAreaProvider>,
  )
  expect(useCases).toHaveBeenLastCalledWith(
    expect.objectContaining({
      scope: 'area_atiende',
      statuses: ['aceptado', 'asignado', 'en_ejecucion', 'en_espera'],
    }),
    true,
  )
})

test('un error de recarga conserva los casos y muestra un aviso para reintentar', async () => {
  const refetch = jest.fn()
  ;(useCases as jest.Mock).mockReturnValue({
    data: { pages: [[sortedCase('old', '2026-10-16T12:00:00Z')]] },
    error: new Error('Sin conexión'),
    isLoading: false,
    isPlaceholderData: false,
    refetch,
    hasNextPage: false,
    fetchNextPage: jest.fn(),
    isFetchingNextPage: false,
    isFetchNextPageError: false,
  })
  const { screen } = await setup()
  expect(screen.getByRole('button', { name: /CAS-old/ })).toBeTruthy()
  expect(screen.getByText('No se pudo actualizar.')).toBeTruthy()
  expect(screen.queryByText('No fue posible cargar las solicitudes')).toBeNull()
  await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }))
  expect(refetch).toHaveBeenCalledTimes(1)
})

test('al cambiar de pestaña conserva la lista anterior con indicador, sin esqueleto', async () => {
  const previousData = { pages: [[sortedCase('old', '2026-10-16T12:00:00Z')]] }
  const baseResult = {
    data: previousData,
    error: null,
    isLoading: false,
    refetch: jest.fn(),
    hasNextPage: false,
    fetchNextPage: jest.fn(),
    isFetchingNextPage: false,
    isFetchNextPageError: false,
  }
  ;(useCases as jest.Mock).mockReturnValue({ ...baseResult, isPlaceholderData: false })
  const { screen } = await setup()
  ;(useCases as jest.Mock).mockReturnValue({ ...baseResult, isPlaceholderData: true })
  await fireEvent.press(screen.getByRole('tab', { name: 'Cerradas, 3 solicitudes' }))
  expect(screen.getByRole('button', { name: /CAS-old/ })).toBeTruthy()
  expect(screen.getByText('Actualizando solicitudes…')).toBeTruthy()
  expect(screen.queryByLabelText('Cargando lista')).toBeNull()
})

test('Últimos 7 días no cambia la consulta al pasar un minuto', async () => {
  const { screen } = await setup({ sinceDays: 7 })
  const callCount = (useCases as jest.Mock).mock.calls.length
  jest.useFakeTimers()
  try {
    await act(async () => jest.advanceTimersByTime(60_000))
    expect((useCases as jest.Mock).mock.calls.length).toBe(callCount)
    expect(
      screen.getByRole('button', { name: 'Quitar filtro Creadas: últimos 7 días' }),
    ).toBeTruthy()
  } finally {
    jest.useRealTimers()
  }
})
