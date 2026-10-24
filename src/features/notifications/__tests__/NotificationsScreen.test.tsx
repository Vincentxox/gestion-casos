import { act, fireEvent, render } from '@testing-library/react-native'
import { Animated } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import type { AppNotification } from '../notificationService'
import { NotificationsScreen } from '../NotificationsScreen'

const mockNavigate = jest.fn()
const mockSetOptions = jest.fn()
const mockMark = jest.fn()
const mockRefetch = jest.fn()
const mockDismiss = jest.fn().mockResolvedValue(1)
const mockRestore = jest.fn()
const mockConfirm = jest.fn().mockResolvedValue(false)
const mockReadRefetch = jest.fn()
let mockSheetSelect: ((id: string) => void) | null = null
let mockItems: AppNotification[] = []

jest.mock('../useNotifications', () => ({
  useNotifications: () => ({
    data: mockItems,
    isLoading: false,
    isError: false,
    refetch: mockRefetch,
  }),
  useMarkNotificationsRead: () => ({ mutate: mockMark, isPending: false }),
  useReadNotificationIds: () => ({
    data: mockItems.filter((item) => item.readAt).map((item) => item.id),
    refetch: mockReadRefetch,
  }),
  useDismissNotifications: () => ({ mutateAsync: mockDismiss, isPending: false }),
  useRestoreNotifications: () => ({ mutate: mockRestore }),
}))

jest.mock('@/components/feedback/AppFeedback', () => ({
  useFeedback: () => ({ confirm: mockConfirm }),
}))

jest.mock('@/components/actions/ActionSheet', () => {
  const React = jest.requireActual('react')
  const { Pressable, Text, View } = jest.requireActual('react-native')
  return {
    ActionSheet: ({
      actions,
      visible,
      onSelect,
    }: {
      actions: { id: string; label: string }[]
      visible: boolean
      onSelect: (id: string) => void
    }) => {
      mockSheetSelect = onSelect
      return visible
        ? React.createElement(
            View,
            null,
            actions.map((action) =>
              React.createElement(
                Pressable,
                {
                  key: action.id,
                  accessibilityRole: 'button',
                  accessibilityLabel: action.label,
                  onPress: () => onSelect(action.id),
                },
                React.createElement(Text, null, action.label),
              ),
            ),
          )
        : null
    },
  }
})

const item: AppNotification = {
  id: 2,
  caseId: 'case-2',
  title: 'Reporte enviado',
  body: 'Texto anterior',
  action: 'enviar_reporte',
  caseNumber: 'CAS-2026-00002',
  caseTitle: 'Fuga de agua',
  actorId: 'actor-ana',
  actorName: 'Ana (dado de baja)',
  comment: null,
  createdAt: '2026-10-16T12:00:00Z',
  readAt: null,
}

function renderScreen() {
  const props = {
    navigation: { navigate: mockNavigate, setOptions: mockSetOptions },
    route: { key: 'Notifications', name: 'Notifications' },
  } as unknown as Parameters<typeof NotificationsScreen>[0]
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 400, height: 800 },
        insets: { top: 0, right: 0, bottom: 0, left: 0 },
      }}
    >
      <NotificationsScreen {...props} />
    </SafeAreaProvider>,
  )
}

beforeEach(() => {
  mockItems = []
  mockNavigate.mockClear()
  mockSetOptions.mockClear()
  mockMark.mockClear()
  mockDismiss.mockClear()
  mockRestore.mockClear()
  mockConfirm.mockReset().mockResolvedValue(false)
  mockReadRefetch.mockImplementation(async () => ({
    data: mockItems.filter((item) => item.readAt).map((item) => item.id),
    isError: false,
  }))
})

test('abre detalle desde Avisos y marca solo el aviso seleccionado', async () => {
  mockItems = [item]
  const screen = await renderScreen()
  expect(screen.queryByText('Avisos')).toBeNull()
  expect(screen.getByText('CAS-2026-00002 · Fuga de agua')).toBeTruthy()
  expect(screen.getByText('por Ana (dado de baja)')).toBeTruthy()
  await fireEvent.press(
    screen.getByRole('button', {
      name: 'Sin leer. Reporte enviado. CAS-2026-00002 · Fuga de agua. por Ana (dado de baja)',
    }),
  )
  expect(mockMark).toHaveBeenCalledWith([2])
  expect(mockNavigate).toHaveBeenCalledWith('CaseDetail', { caseId: 'case-2' })
})

test('un aviso de mensaje abre el detalle por action, no por el título', async () => {
  mockItems = [{ ...item, title: 'Título libre', action: 'mensaje' }]
  const screen = await renderScreen()
  await fireEvent.press(
    screen.getByRole('button', {
      name: 'Sin leer. Título libre. CAS-2026-00002 · Fuga de agua. por Ana (dado de baja)',
    }),
  )
  expect(mockNavigate).toHaveBeenCalledWith('CaseDetail', { caseId: 'case-2' })
})

test('el menú muestra solo las opciones aplicables', async () => {
  mockItems = [item]
  const firstScreen = await renderScreen()
  const unreadHeader = mockSetOptions.mock.lastCall?.[0].headerRight
  const action = await render(unreadHeader())
  await fireEvent.press(action.getByRole('button', { name: 'Más opciones' }))
  expect(firstScreen.getByText('Marcar todo como leído')).toBeTruthy()
  expect(firstScreen.queryByText(/Borrar avisos leídos/)).toBeNull()
  await act(async () => {
    mockSheetSelect?.('read')
  })
  expect(mockMark).toHaveBeenCalledWith(null)
  await action.unmount()
  await firstScreen.unmount()

  mockItems = [{ ...item, readAt: '2026-10-16T12:10:00Z' }]
  await renderScreen()
  const readHeader = mockSetOptions.mock.lastCall?.[0].headerRight
  expect(readHeader()).not.toBeNull()
})

test('el filtro Sin leer muestra Estás al día cuando no hay pendientes', async () => {
  mockItems = [{ ...item, readAt: '2026-10-16T12:10:00Z' }]
  const screen = await renderScreen()
  expect(screen.getByText('Reporte enviado')).toBeTruthy()
  await fireEvent.press(screen.getByRole('tab', { name: 'Sin leer, 0' }))
  expect(screen.getByText('Estás al día')).toBeTruthy()
  expect(screen.queryByText('Reporte enviado')).toBeNull()
  await fireEvent.press(screen.getByRole('tab', { name: 'Todos' }))
  expect(screen.getByText('Reporte enviado')).toBeTruthy()
})

test('omite el actor si el evento no lo tiene', async () => {
  mockItems = [{ ...item, actorName: null }]
  const screen = await renderScreen()
  expect(screen.queryByText(/por Ana/)).toBeNull()
})

test('la acción accesible borra un leído y Deshacer lo restaura', async () => {
  mockItems = [{ ...item, readAt: '2026-10-16T12:10:00Z' }]
  const animation = jest.spyOn(Animated, 'timing').mockImplementation(
    () =>
      ({
        start: (callback?: (result: { finished: boolean }) => void) =>
          callback?.({ finished: true }),
      }) as Animated.CompositeAnimation,
  )
  const screen = await renderScreen()
  const row = screen.getByRole('button', { name: /Reporte enviado/ })
  expect(row.props.accessibilityActions).toEqual([{ name: 'delete', label: 'Borrar' }])
  await fireEvent(row, 'accessibilityAction', { nativeEvent: { actionName: 'delete' } })
  expect(mockDismiss).toHaveBeenCalledWith([2])
  expect(await screen.findByText('Aviso borrado')).toBeTruthy()
  await fireEvent.press(screen.getByRole('button', { name: 'Deshacer' }))
  expect(mockRestore).toHaveBeenCalledWith([2])
  animation.mockRestore()
})

test('un aviso sin leer ofrece Marcar como leído, nunca Borrar', async () => {
  mockItems = [item]
  const screen = await renderScreen()
  const row = screen.getByRole('button', { name: /Sin leer. Reporte enviado/ })
  expect(row.props.accessibilityActions).toEqual([{ name: 'markRead', label: 'Marcar como leído' }])
  await fireEvent(row, 'accessibilityAction', { nativeEvent: { actionName: 'markRead' } })
  expect(mockMark).toHaveBeenCalledWith([2])
  expect(mockDismiss).not.toHaveBeenCalled()
})

test('borrar todos requiere confirmación y no ejecuta la RPC al cancelar', async () => {
  mockItems = [{ ...item, readAt: '2026-10-16T12:10:00Z' }]
  const screen = await renderScreen()
  const header = mockSetOptions.mock.lastCall?.[0].headerRight
  const action = await render(header())
  await fireEvent.press(action.getByRole('button', { name: 'Más opciones' }))
  expect(screen.queryByText('Marcar todo como leído')).toBeNull()
  await act(async () => {
    mockSheetSelect?.('delete')
  })
  expect(mockConfirm).toHaveBeenCalledWith(
    expect.objectContaining({ tone: 'danger', confirmLabel: 'Borrar' }),
  )
  expect(mockDismiss).not.toHaveBeenCalled()
  await action.unmount()
})

test('borrar todos conserva los IDs exactos para Deshacer', async () => {
  mockItems = [{ ...item, readAt: '2026-10-16T12:10:00Z' }]
  mockConfirm.mockResolvedValue(true)
  const screen = await renderScreen()
  const header = mockSetOptions.mock.lastCall?.[0].headerRight
  const action = await render(header())
  await fireEvent.press(action.getByRole('button', { name: 'Más opciones' }))
  await act(async () => {
    mockSheetSelect?.('delete')
  })
  expect(mockDismiss).toHaveBeenCalledWith([2])
  expect(await screen.findByText('Aviso borrado')).toBeTruthy()
  await action.unmount()
})
