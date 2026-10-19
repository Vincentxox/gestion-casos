import { fireEvent, render } from '@testing-library/react-native'
import { StyleSheet } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import type { Profile } from '@/features/auth/types'
import { calendarDateBoundary } from '../caseSearch'
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

jest.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (state: { profile: Profile }) => Profile) =>
    selector({ profile: mockProfile }),
}))
jest.mock('@/features/home/useHomeSummary', () => ({
  useHomeSummary: () => ({ data: { area_kind: 'tecnica' } }),
}))
jest.mock('@react-native-community/netinfo', () => ({
  useNetInfo: () => ({ isConnected: true, isInternetReachable: true }),
}))
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
      { status: 'solicitado', total: 2 },
      { status: 'aceptado', total: 1 },
      { status: 'en_ejecucion', total: 4 },
      { status: 'aprobado', total: 3 },
    ],
    isError: false,
    refetch: jest.fn(),
  })
  ;(useCases as jest.Mock).mockClear()
})

test('el administrador ve Todas y tres pestañas con conteos', async () => {
  const { screen } = await setup()
  expect(screen.getByRole('tab', { name: 'Todas' }).props.accessibilityState).toEqual({
    selected: true,
  })
  expect(screen.queryByRole('tab', { name: 'Bandeja' })).toBeNull()
  expect(screen.getByRole('tab', { name: 'Abiertas, 7 solicitudes' })).toBeTruthy()
  expect(screen.getByRole('tab', { name: 'Cerradas, 3 solicitudes' })).toBeTruthy()
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

test('el auditor solo ve Todas porque no crea solicitudes', async () => {
  mockProfile.role = 'auditor'
  const { screen } = await setup()
  expect(screen.getByRole('tab', { name: 'Todas' }).props.accessibilityState).toEqual({
    selected: true,
  })
  expect(screen.queryByRole('tab', { name: 'Mías' })).toBeNull()
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

test('el jefe técnico tiene Mi área/Todas y Sin asignar conserva Mi área', async () => {
  mockProfile.role = 'jefe_area'
  const { screen } = await setup()
  expect(screen.getByRole('tab', { name: 'Mi área' }).props.accessibilityState).toEqual({
    selected: true,
  })
  expect(screen.queryByRole('tab', { name: 'Bandeja' })).toBeNull()
  await fireEvent.press(screen.getByRole('button', { name: 'Más filtros, 0 activos' }))
  await fireEvent.press(screen.getByRole('button', { name: 'Sin asignar' }))
  expect(useCases).toHaveBeenLastCalledWith(
    expect.objectContaining({ scope: 'mi_area', statuses: ['aceptado'], unassignedOnly: true }),
    true,
  )
  expect(useCaseCounts).toHaveBeenLastCalledWith(
    expect.objectContaining({ scope: 'mi_area', statuses: ['aceptado'], unassignedOnly: true }),
    true,
  )
})

test('los filtros de Inicio son chips quitables, insignia y Limpiar', async () => {
  const { screen } = await setup({ scope: 'sin_asignar', exactStatus: 'aceptado' })
  expect(screen.getByRole('button', { name: 'Más filtros, 1 activo' })).toBeTruthy()
  expect(useCases).toHaveBeenLastCalledWith(
    expect.objectContaining({ scope: 'todas', statuses: ['aceptado'], unassignedOnly: true }),
    true,
  )
  expect(
    screen.getByRole('button', { name: 'Quitar filtro Sin asignar' }).props.accessibilityState,
  ).toEqual({
    selected: true,
  })
  await fireEvent.press(screen.getByRole('button', { name: 'Quitar filtro Sin asignar' }))
  expect(screen.getByRole('button', { name: 'Más filtros, 0 activos' })).toBeTruthy()
  await fireEvent.press(screen.getByRole('button', { name: 'Más filtros, 0 activos' }))
  await fireEvent.press(screen.getByRole('button', { name: 'Vencidas' }))
  expect(screen.getByRole('button', { name: 'Más filtros, 1 activo' })).toBeTruthy()
  await fireEvent.press(screen.getByRole('button', { name: 'Limpiar filtros activos' }))
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
  await fireEvent.press(screen.getByRole('button', { name: 'Últimos 7 días' }))
  expect(useCases).toHaveBeenLastCalledWith(
    expect.objectContaining({ createdFrom: expect.any(String) }),
    true,
  )
})

test('el rango de creación termina al día siguiente y rechaza fechas invertidas', async () => {
  const { screen } = await setup()
  await fireEvent.press(screen.getByRole('button', { name: 'Más filtros, 0 activos' }))
  await fireEvent.changeText(screen.getByLabelText('Fecha inicial de creación'), '2026-10-01')
  await fireEvent.changeText(screen.getByLabelText('Fecha final de creación'), '2026-10-08')
  await fireEvent.press(screen.getByRole('button', { name: 'Ver solicitudes' }))
  expect(useCases).toHaveBeenLastCalledWith(
    expect.objectContaining({
      createdFrom: calendarDateBoundary('2026-10-01'),
      createdTo: calendarDateBoundary('2026-10-08', true),
    }),
    true,
  )
  await fireEvent.press(screen.getByRole('button', { name: 'Más filtros, 1 activo' }))
  await fireEvent.changeText(screen.getByLabelText('Fecha final de creación'), '2026-09-30')
  expect(screen.getByRole('alert').props.children).toBe(
    'La fecha final debe ser posterior a la inicial',
  )
})
