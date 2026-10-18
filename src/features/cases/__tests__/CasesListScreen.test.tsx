import { fireEvent, render } from '@testing-library/react-native'
import { StyleSheet } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import type { Profile } from '@/features/auth/types'
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

test('el administrador cambia Todas/Bandeja y ve cuatro pestañas con conteos', async () => {
  const { screen } = await setup()
  expect(screen.getByRole('tab', { name: 'Todas' }).props.accessibilityState).toEqual({
    selected: true,
  })
  expect(screen.getByRole('tab', { name: 'Pendientes, 3 solicitudes' })).toBeTruthy()
  expect(screen.getByRole('tab', { name: 'En curso, 4 solicitudes' })).toBeTruthy()
  expect(screen.getByRole('tab', { name: 'Cerradas, 3 solicitudes' })).toBeTruthy()
  expect(
    StyleSheet.flatten(screen.getByRole('tab', { name: 'Pendientes, 3 solicitudes' }).props.style),
  ).toMatchObject({ minHeight: 44 })
  expect(
    StyleSheet.flatten(screen.getByRole('button', { name: 'Más filtros, 0 activos' }).props.style),
  ).toMatchObject({ width: 44, height: 44 })

  await fireEvent.press(screen.getByRole('tab', { name: 'Bandeja' }))
  expect(useCases).toHaveBeenLastCalledWith(expect.objectContaining({ scope: 'bandeja' }), true)
  expect(screen.getByRole('tab', { name: 'Bandeja' }).props.accessibilityState).toEqual({
    selected: true,
  })
  await fireEvent.press(screen.getByRole('tab', { name: 'En curso, 4 solicitudes' }))
  expect(useCases).toHaveBeenLastCalledWith(
    expect.objectContaining({
      scope: 'bandeja',
      statuses: expect.arrayContaining(['en_ejecucion']),
    }),
    true,
  )
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

test('los filtros de Inicio son chips quitables, insignia y Limpiar', async () => {
  const { screen } = await setup({ scope: 'sin_asignar', exactStatus: 'aceptado' })
  expect(screen.getByRole('button', { name: 'Más filtros, 2 activos' })).toBeTruthy()
  expect(
    screen.getByRole('button', { name: 'Quitar filtro Aceptada' }).props.accessibilityState,
  ).toEqual({
    selected: true,
  })
  await fireEvent.press(screen.getByRole('button', { name: 'Quitar filtro Aceptada' }))
  expect(screen.getByRole('button', { name: 'Más filtros, 1 activo' })).toBeTruthy()
  await fireEvent.press(screen.getByRole('button', { name: 'Limpiar filtros activos' }))
  expect(screen.getByRole('button', { name: 'Más filtros, 0 activos' })).toBeTruthy()
  expect(useCases).toHaveBeenLastCalledWith(expect.objectContaining({ scope: 'bandeja' }), true)
})

test('Inicio puede abrir Tus solicitudes filtradas por fase', async () => {
  mockProfile.role = 'solicitante'
  const { screen } = await setup({ scope: 'mias', status: 'en_curso' })
  expect(
    screen.getByRole('tab', { name: 'En curso, 4 solicitudes' }).props.accessibilityState,
  ).toEqual({
    selected: true,
  })
  expect(useCases).toHaveBeenLastCalledWith(
    expect.objectContaining({ scope: 'mias', statuses: expect.arrayContaining(['en_ejecucion']) }),
    true,
  )
})

test('el botón de filtros permite agregar y quitar filtros sin consultas nuevas', async () => {
  const { screen } = await setup()
  await fireEvent.press(screen.getByRole('button', { name: 'Más filtros, 0 activos' }))
  await fireEvent.press(screen.getByRole('button', { name: 'Alta' }))
  expect(screen.getByRole('button', { name: 'Más filtros, 1 activo' })).toBeTruthy()
  expect(useCases).toHaveBeenLastCalledWith(expect.objectContaining({ priority: 'alta' }), true)
})
