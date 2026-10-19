import { fireEvent, render } from '@testing-library/react-native'
import { Platform, StyleSheet } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import type { Profile } from '@/features/auth/types'
import { statusMeta } from '@/theme/statusMeta'
import { colors } from '@/theme/tokens'
import { calendarDateBoundary } from '../caseSearch'
import { CASE_STATUSES } from '../types'
import { CasesListScreen } from '../screens/CasesListScreen'
import { useCaseCounts, useCases } from '../useCases'

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
jest.mock('../useCases', () => ({
  useCases: jest.fn(),
  useCaseCounts: jest.fn(),
}))

async function setup(params?: Parameters<typeof CasesListScreen>[0]['route']['params']) {
  const navigation = { navigate: jest.fn() }
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
  return { screen, navigation }
}

beforeEach(() => {
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
  expect(StyleSheet.flatten(overdue.props.style).backgroundColor).toBe(colors.dangerSoft)
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
