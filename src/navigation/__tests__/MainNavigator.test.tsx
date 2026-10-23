import { createNavigationContainerRef, NavigationContainer } from '@react-navigation/native'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { MainRootNavigator } from '../MainNavigator'
import type { RootStackParamList } from '../types'

jest.mock('@/services/supabase/client', () => ({ supabase: {} }))
jest.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (state: unknown) => unknown) =>
    selector({ profile: { id: 'admin', role: 'administrador', organizationId: 'org' } }),
}))
jest.mock('@/features/cases/useCases', () => ({
  useCaseDetail: () => ({
    data: {
      id: 'case-1',
      caseNumber: 'CAS-2026-00001',
      status: 'aceptado',
      targetAreaId: 'technical',
      assignedTo: null,
      title: 'Fuga en oficina',
      description: 'Revisar tubería',
      categoryId: 'category-1',
      location: 'Oficina 1',
      priority: 'media',
    },
    isLoading: false,
    error: null,
  }),
  useAssignableProfiles: () => ({ data: [], isLoading: false, error: null }),
  useCaseActions: () => ({
    data: { asignar: { allowed: true }, editar_datos: { allowed: true } },
    isLoading: false,
    isPending: false,
    error: null,
  }),
  useAssignCase: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useUpdateCase: () => ({ mutateAsync: jest.fn(), isPending: false }),
}))
jest.mock('@/features/categories/useCategories', () => ({
  useCategories: () => ({
    data: [{ id: 'category-1', name: 'Mantenimiento', isActive: true }],
    isLoading: false,
    isError: false,
  }),
}))
jest.mock('@/features/admin/screens/UsersScreen', () => {
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native')
  return { UsersScreen: () => <Text>Usuarios de prueba</Text> }
})
jest.mock('@/features/home/useHomeSummary', () => ({
  useHomeSummary: () => ({ data: null }),
}))
jest.mock('@/features/cases/screens/CasesListScreen', () => {
  const { Pressable, Text } = jest.requireActual<typeof import('react-native')>('react-native')
  return {
    CasesListScreen: ({
      navigation,
    }: {
      navigation: { navigate: (screen: string, params: object) => void }
    }) => (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Abrir solicitud"
        onPress={() => navigation.navigate('CaseDetail', { caseId: 'case-1' })}
      >
        <Text>Lista de prueba</Text>
      </Pressable>
    ),
  }
})
jest.mock('@/features/home/HomeScreen', () => {
  const { Pressable, Text } = jest.requireActual<typeof import('react-native')>('react-native')
  return {
    HomeScreen: ({
      navigation,
    }: {
      navigation: { getParent: () => { navigate: (screen: string) => void } }
    }) => (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Abrir Avisos"
        onPress={() => navigation.getParent().navigate('NotificationsFlow')}
      >
        <Text>Inicio de prueba</Text>
      </Pressable>
    ),
  }
})
jest.mock('@/features/notifications/NotificationsScreen', () => {
  const { Pressable, Text } = jest.requireActual<typeof import('react-native')>('react-native')
  return {
    NotificationsScreen: ({
      navigation,
    }: {
      navigation: { navigate: (screen: string, params: object) => void }
    }) => (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Abrir caso"
        onPress={() => navigation.navigate('CaseDetail', { caseId: 'case-1' })}
      >
        <Text>Bandeja de prueba</Text>
      </Pressable>
    ),
  }
})
jest.mock('@/features/cases/screens/CaseDetailScreen', () => {
  const { Pressable, Text } = jest.requireActual<typeof import('react-native')>('react-native')
  return {
    CaseDetailScreen: ({
      navigation,
    }: {
      navigation: { goBack: () => void; navigate: (screen: string, params: object) => void }
    }) => (
      <>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver a Avisos"
          onPress={() => navigation.goBack()}
        >
          <Text>Detalle de prueba</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Asignar desde Avisos"
          onPress={() => navigation.navigate('AssignCase', { caseId: 'case-1' })}
        >
          <Text>Asignar</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Editar solicitud"
          onPress={() => navigation.navigate('EditCase', { caseId: 'case-1' })}
        >
          <Text>Editar</Text>
        </Pressable>
      </>
    ),
  }
})

test('Editar se muestra dentro de NotificationsFlow sin contexto de pestañas', async () => {
  const ref = createNavigationContainerRef<RootStackParamList>()
  const screen = await render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 400, height: 800 },
        insets: { top: 0, right: 0, bottom: 0, left: 0 },
      }}
    >
      <NavigationContainer ref={ref}>
        <MainRootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>,
  )

  await fireEvent.press(screen.getByRole('button', { name: 'Abrir Avisos' }))
  await fireEvent.press(await screen.findByRole('button', { name: 'Abrir caso' }))
  await fireEvent.press(await screen.findByRole('button', { name: 'Editar solicitud' }))

  await waitFor(() => expect(ref.getCurrentRoute()?.name).toBe('EditCase'))
  expect(screen.getByText('¿Qué necesitas?')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeTruthy()
})

test('Editar también se muestra desde la pestaña Solicitudes', async () => {
  const ref = createNavigationContainerRef<RootStackParamList>()
  const screen = await render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 400, height: 800 },
        insets: { top: 0, right: 0, bottom: 0, left: 0 },
      }}
    >
      <NavigationContainer ref={ref}>
        <MainRootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>,
  )

  await fireEvent.press(screen.getByRole('tab', { name: 'Solicitudes' }))
  await fireEvent.press(await screen.findByRole('button', { name: 'Abrir solicitud' }))
  await fireEvent.press(await screen.findByRole('button', { name: 'Editar solicitud' }))

  await waitFor(() => expect(ref.getCurrentRoute()?.name).toBe('EditCase'))
  expect(screen.getByText('¿Qué necesitas?')).toBeTruthy()
})

test('Avisos se apila sobre las pestañas y el detalle regresa a Avisos', async () => {
  const ref = createNavigationContainerRef<RootStackParamList>()
  const screen = await render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 400, height: 800 },
        insets: { top: 0, right: 0, bottom: 0, left: 0 },
      }}
    >
      <NavigationContainer ref={ref}>
        <MainRootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>,
  )
  await fireEvent.press(screen.getByRole('button', { name: 'Abrir Avisos' }))
  await waitFor(() =>
    expect(ref.getRootState()?.routes.map((route) => route.name)).toEqual([
      'MainTabs',
      'NotificationsFlow',
    ]),
  )
  await fireEvent.press(screen.getByRole('button', { name: 'Abrir caso' }))
  await waitFor(() => expect(ref.getCurrentRoute()?.name).toBe('CaseDetail'))
  await fireEvent.press(screen.getByRole('button', { name: 'Volver a Avisos' }))
  await waitFor(() => expect(ref.getCurrentRoute()?.name).toBe('Notifications'))
  await fireEvent.press(screen.getByRole('button', { name: 'Volver a Inicio' }))
  await waitFor(() =>
    expect(ref.getRootState()?.routes.map((route) => route.name)).toEqual(['MainTabs']),
  )
})

test('desde Avisos, Ir a Usuarios abre Administración cuando no hay personal', async () => {
  const ref = createNavigationContainerRef<RootStackParamList>()
  const screen = await render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 400, height: 800 },
        insets: { top: 0, right: 0, bottom: 0, left: 0 },
      }}
    >
      <NavigationContainer ref={ref}>
        <MainRootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>,
  )

  await fireEvent.press(screen.getByRole('button', { name: 'Abrir Avisos' }))
  await fireEvent.press(await screen.findByRole('button', { name: 'Abrir caso' }))
  await fireEvent.press(await screen.findByRole('button', { name: 'Asignar desde Avisos' }))
  await waitFor(() => expect(screen.getByRole('button', { name: 'Ir a Usuarios' })).toBeTruthy())
  await fireEvent.press(screen.getByRole('button', { name: 'Ir a Usuarios' }))

  await waitFor(() => expect(ref.getCurrentRoute()?.name).toBe('Users'))
  expect(screen.getByText('Usuarios de prueba')).toBeTruthy()
})

test('la barra flotante lleva a Ayuda y oculta el botón + sin área', async () => {
  const ref = createNavigationContainerRef<RootStackParamList>()
  const screen = await render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 400, height: 800 },
        insets: { top: 0, right: 0, bottom: 0, left: 0 },
      }}
    >
      <NavigationContainer ref={ref}>
        <MainRootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>,
  )

  expect(screen.getAllByRole('tab').map((tab) => tab.props.accessibilityLabel)).toEqual([
    'Inicio',
    'Solicitudes',
    'Administrar',
    'Ayuda',
    'Perfil',
  ])
  expect(screen.getByText('Solicitudes')).toBeTruthy()
  expect(screen.queryByText('Casos')).toBeNull()
  expect(screen.queryByRole('button', { name: 'Nueva solicitud' })).toBeNull()
  await fireEvent.press(screen.getByRole('tab', { name: 'Ayuda' }))
  await waitFor(() => expect(ref.getCurrentRoute()?.name).toBe('Help'))
  expect(screen.getByText('Tu recorrido')).toBeTruthy()
})
