import { act, fireEvent, render } from '@testing-library/react-native'
import { Animated, BackHandler, StyleSheet } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useAnimatedReaction } from 'react-native-reanimated'

import type { AppNotification } from '../notificationService'
import { NotificationsScreen } from '../NotificationsScreen'
import { colors, spacing } from '@/theme/tokens'
import { feedback } from '@/services/feedback'

const mockNavigate = jest.fn()
const mockGoBack = jest.fn()
const mockSetOptions = jest.fn()
const mockMark = jest.fn()
const mockRefetch = jest.fn()
const mockDismiss = jest.fn().mockResolvedValue(1)
const mockRestore = jest.fn()
const mockConfirm = jest.fn().mockResolvedValue(false)
const mockToast = jest.fn()
const mockReadRefetch = jest.fn()
let mockItems: AppNotification[] = []
const mockMeasureNotificationView = jest.fn()

jest.mock('../notificationLayout', () => ({
  measureNotificationView: (...args: unknown[]) => mockMeasureNotificationView(...args),
}))

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
  useFeedback: () => ({ confirm: mockConfirm, toast: mockToast }),
}))

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

function screenElement() {
  const props = {
    navigation: { navigate: mockNavigate, goBack: mockGoBack, setOptions: mockSetOptions },
    route: { key: 'Notifications', name: 'Notifications' },
  } as unknown as Parameters<typeof NotificationsScreen>[0]
  return (
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 400, height: 800 },
        insets: { top: 0, right: 0, bottom: 0, left: 0 },
      }}
    >
      <NotificationsScreen {...props} />
    </SafeAreaProvider>
  )
}

function renderScreen() {
  return render(screenElement())
}

beforeEach(() => {
  mockItems = []
  mockMeasureNotificationView.mockReset()
  mockNavigate.mockClear()
  mockGoBack.mockClear()
  mockSetOptions.mockClear()
  mockMark.mockClear()
  mockDismiss.mockClear()
  mockRestore.mockReset()
  mockToast.mockClear()
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

test('un aviso sin leer conserva el icono sobre fondo visible', async () => {
  mockItems = [item]
  const screen = await renderScreen()
  expect(StyleSheet.flatten(screen.getByTestId('notification-icon-box').props.style)).toMatchObject(
    {
      backgroundColor: colors.surface,
    },
  )
})

test('la fila leída tiene fondo opaco para tapar la acción al deslizar', async () => {
  mockItems = [{ ...item, readAt: '2026-10-16T12:10:00Z' }]
  const screen = await renderScreen()
  expect(
    StyleSheet.flatten(screen.getByRole('button', { name: /Reporte enviado/ }).props.style),
  ).toMatchObject({ backgroundColor: colors.surface })
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
  await act(async () => unreadHeader().props.onPress())
  expect(firstScreen.getByText('Marcar todo como leído')).toBeTruthy()
  expect(firstScreen.queryByText(/Borrar avisos leídos/)).toBeNull()
  await act(async () => {
    fireEvent.press(firstScreen.getByRole('button', { name: 'Marcar todo como leído' }))
  })
  expect(mockMark).toHaveBeenCalledWith(null)
  await firstScreen.unmount()

  mockItems = [{ ...item, readAt: '2026-10-16T12:10:00Z' }]
  await renderScreen()
  const readHeader = mockSetOptions.mock.lastCall?.[0].headerRight
  expect(readHeader()).not.toBeNull()
})

test('el menú muestra ambas acciones con leídos y sin leer y se cierra al tocar fuera', async () => {
  mockItems = [item, { ...item, id: 3, readAt: '2026-10-16T12:10:00Z' }]
  const screen = await renderScreen()
  const header = mockSetOptions.mock.lastCall?.[0].headerRight
  await act(async () => header().props.onPress())
  const menu = screen.getByTestId('notification-options-menu')
  expect(menu.props.accessibilityRole).toBe('menu')
  expect(StyleSheet.flatten(menu.props.style)).toMatchObject({
    position: 'absolute',
    top: spacing.xs,
    right: spacing.md,
  })
  expect(menu.props.accessibilityViewIsModal).toBe(true)
  expect(screen.getByRole('button', { name: 'Marcar todo como leído' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Borrar avisos leídos (1)' })).toBeTruthy()
  await fireEvent.press(
    screen.getByTestId('notification-options-backdrop', { includeHiddenElements: true }),
  )
  expect(screen.queryByRole('button', { name: 'Marcar todo como leído' })).toBeNull()
})

test('el botón ⋯ alterna el menú sin medir el encabezado', async () => {
  mockItems = [item]
  const screen = await renderScreen()
  await act(async () => mockSetOptions.mock.lastCall?.[0].headerRight().props.onPress())
  expect(screen.getByTestId('notification-options-menu')).toBeTruthy()
  await act(async () => mockSetOptions.mock.lastCall?.[0].headerRight().props.onPress())
  expect(screen.queryByTestId('notification-options-menu')).toBeNull()
})

test('Atrás de Android cierra el menú sin salir de Avisos', async () => {
  mockItems = [item]
  let onBack: Parameters<typeof BackHandler.addEventListener>[1] | undefined
  const remove = jest.fn()
  const backSubscription = jest
    .spyOn(BackHandler, 'addEventListener')
    .mockImplementation((_event, handler) => {
      onBack = handler
      return { remove }
    })
  try {
    const screen = await renderScreen()
    await act(async () => mockSetOptions.mock.lastCall?.[0].headerRight().props.onPress())
    expect(onBack).toBeDefined()
    await act(async () => expect(onBack?.({ type: 'hardwareBackPress', timeStamp: 0 })).toBe(true))
    expect(screen.queryByTestId('notification-options-menu')).toBeNull()
    expect(mockGoBack).not.toHaveBeenCalled()
    expect(remove).toHaveBeenCalled()
  } finally {
    backSubscription.mockRestore()
  }
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
  expect(mockRestore).toHaveBeenCalledWith([2], expect.anything())
  animation.mockRestore()
})

test('Deshacer devuelve el aviso resaltado y confirma con un toast', async () => {
  const readItem = { ...item, readAt: '2026-10-16T12:10:00Z' }
  mockItems = [readItem]
  const animation = jest.spyOn(Animated, 'timing').mockImplementation(
    () =>
      ({
        start: (callback?: (result: { finished: boolean }) => void) =>
          callback?.({ finished: true }),
      }) as Animated.CompositeAnimation,
  )
  const screen = await renderScreen()
  expect(screen.queryByTestId('notification-restored-highlight')).toBeNull()
  const row = screen.getByRole('button', { name: /Reporte enviado/ })
  await fireEvent(row, 'accessibilityAction', { nativeEvent: { actionName: 'delete' } })
  // The deleted row leaves the list and comes back as a new row once restored.
  mockItems = []
  await screen.rerender(screenElement())
  await fireEvent.press(screen.getByRole('button', { name: 'Deshacer' }))
  expect(mockRestore).toHaveBeenCalledWith([2], expect.anything())
  mockItems = [readItem]
  await screen.rerender(screenElement())
  expect(screen.getByTestId('notification-restored-highlight')).toBeTruthy()
  await act(async () => mockRestore.mock.lastCall?.[1].onSuccess())
  expect(mockToast).toHaveBeenCalledWith('Aviso restaurado')
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

test('derecha solo en sin leer marca leído, con icono sin texto y umbral del 40 %', async () => {
  mockItems = [item]
  const screen = await renderScreen()
  const swipe = screen.getByTestId('mock-swipeable')
  const props = swipe.props.swipeableProps
  expect(props.renderLeftActions).toBeDefined()
  expect(props.renderRightActions).toBeUndefined()
  await act(async () =>
    fireEvent(screen.getByTestId('notification-row-container'), 'layout', {
      nativeEvent: { layout: { width: 300, height: 80 } },
    }),
  )
  expect(screen.getByTestId('mock-swipeable').props.swipeableProps.leftThreshold).toBe(120)
  const action = await render(props.renderLeftActions({ value: 0 }, { value: 0 }))
  const actionView = action.getByTestId('notification-swipe-read-action')
  expect(StyleSheet.flatten(actionView.props.style)).toMatchObject({
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingLeft: spacing.lg,
  })
  expect(action.queryByText('Leído')).toBeNull()
  await act(async () => props.onSwipeableOpen('right'))
  expect(mockMark).toHaveBeenCalledWith([2])
  expect(mockDismiss).not.toHaveBeenCalled()
})

test('izquierda solo en leídos borra y permite Deshacer', async () => {
  mockItems = [{ ...item, readAt: '2026-10-16T12:10:00Z' }]
  const animation = jest.spyOn(Animated, 'timing').mockImplementation(
    () =>
      ({
        start: (callback?: (result: { finished: boolean }) => void) =>
          callback?.({ finished: true }),
      }) as Animated.CompositeAnimation,
  )
  try {
    const screen = await renderScreen()
    const swipe = screen.getByTestId('mock-swipeable')
    const props = swipe.props.swipeableProps
    expect(props.renderLeftActions).toBeUndefined()
    expect(props.renderRightActions).toBeDefined()
    await act(async () =>
      fireEvent(screen.getByTestId('notification-row-container'), 'layout', {
        nativeEvent: { layout: { width: 300, height: 80 } },
      }),
    )
    expect(screen.getByTestId('mock-swipeable').props.swipeableProps.rightThreshold).toBe(120)
    const action = await render(props.renderRightActions({ value: 0 }, { value: 0 }))
    expect(
      StyleSheet.flatten(action.getByTestId('notification-swipe-delete-action').props.style),
    ).toMatchObject({
      alignItems: 'flex-end',
      justifyContent: 'center',
      paddingRight: spacing.lg,
      backgroundColor: colors.error,
    })
    expect(action.queryByText('Borrar')).toBeNull()
    await act(async () => props.onSwipeableOpen('left'))
    expect(mockDismiss).toHaveBeenCalledWith([2])
    expect(await screen.findByText('Aviso borrado')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Deshacer' })).toBeTruthy()
  } finally {
    animation.mockRestore()
  }
})

test('la vibración de deslizar ocurre una vez al cruzar el umbral de 40 %', async () => {
  mockItems = [item]
  const haptic = jest.spyOn(feedback, 'selection').mockImplementation(jest.fn())
  const reactionHook = jest.mocked(useAnimatedReaction)
  reactionHook.mockClear()
  try {
    const screen = await renderScreen()
    await act(async () =>
      fireEvent(screen.getByTestId('notification-row-container'), 'layout', {
        nativeEvent: { layout: { width: 300, height: 80 } },
      }),
    )
    const swipe = screen.getByTestId('mock-swipeable')
    const translation = { value: 0 }
    await render(swipe.props.swipeableProps.renderLeftActions({ value: 0 }, translation))
    const [prepare, react] = reactionHook.mock.calls[0]!
    translation.value = 119
    react(prepare(), false)
    expect(haptic).not.toHaveBeenCalled()
    translation.value = 120
    react(prepare(), false)
    react(prepare(), true)
    expect(haptic).toHaveBeenCalledTimes(1)
    translation.value = 0
    react(prepare(), true)
    translation.value = 121
    react(prepare(), false)
    expect(haptic).toHaveBeenCalledTimes(2)
  } finally {
    haptic.mockRestore()
  }
})

test('pulsación larga: menú de sin leer bloquea Borrar y se cierra al tocar fuera', async () => {
  mockItems = [item]
  const screen = await renderScreen()
  const row = screen.getByRole('button', { name: /Sin leer. Reporte enviado/ })
  mockMeasureNotificationView
    .mockImplementationOnce((_view, callback) => callback(24, 100, 320, 80))
    .mockImplementationOnce((_view, callback) => callback(0, 40, 400, 700))
  try {
    await act(async () => fireEvent(row, 'longPress'))
    expect(mockMeasureNotificationView).toHaveBeenCalledTimes(2)
    expect(
      StyleSheet.flatten(
        screen.getByTestId('notification-row-preview', { includeHiddenElements: true }).props.style,
      ),
    ).toMatchObject({
      top: 60,
      left: 24,
      width: 320,
    })
    expect(screen.getByRole('button', { name: 'Marcar como leído' })).toBeTruthy()
    const deleteButton = screen.getByRole('button', { name: 'Borrar. Primero márcalo como leído' })
    expect(deleteButton.props.accessibilityState).toEqual({ disabled: true })
    expect(screen.getByText('Primero márcalo como leído')).toBeTruthy()
    await fireEvent.press(
      screen.getByTestId('notification-row-backdrop', { includeHiddenElements: true }),
    )
    expect(screen.queryByTestId('notification-row-menu')).toBeNull()
  } finally {
    screen.unmount()
  }
})

test('pulsación larga en leído ofrece solo Borrar y Atrás cierra el menú', async () => {
  mockItems = [{ ...item, readAt: '2026-10-16T12:10:00Z' }]
  mockMeasureNotificationView
    .mockImplementationOnce((_view, callback) => callback(24, 700, 320, 80))
    .mockImplementationOnce((_view, callback) => callback(0, 40, 400, 700))
  let onBack: Parameters<typeof BackHandler.addEventListener>[1] | undefined
  const backSubscription = jest
    .spyOn(BackHandler, 'addEventListener')
    .mockImplementation((_event, handler) => {
      onBack = handler
      return { remove: jest.fn() }
    })
  try {
    const screen = await renderScreen()
    await act(async () =>
      fireEvent(screen.getByRole('button', { name: /Reporte enviado/ }), 'longPress'),
    )
    expect(screen.queryByRole('button', { name: 'Marcar como leído' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Borrar' })).toBeTruthy()
    expect(
      StyleSheet.flatten(screen.getByTestId('notification-row-menu').props.style).top,
    ).toBeLessThan(660)
    await act(async () => expect(onBack?.({ type: 'hardwareBackPress', timeStamp: 0 })).toBe(true))
    expect(screen.queryByTestId('notification-row-menu')).toBeNull()
  } finally {
    backSubscription.mockRestore()
  }
})

test('Borrar del menú contextual elimina solo el aviso leído', async () => {
  mockItems = [{ ...item, readAt: '2026-10-16T12:10:00Z' }]
  mockMeasureNotificationView
    .mockImplementationOnce((_view, callback) => callback(24, 100, 320, 80))
    .mockImplementationOnce((_view, callback) => callback(0, 40, 400, 700))
  const screen = await renderScreen()
  await act(async () =>
    fireEvent(screen.getByRole('button', { name: /Reporte enviado/ }), 'longPress'),
  )
  await act(async () => fireEvent.press(screen.getByRole('button', { name: 'Borrar' })))
  expect(mockDismiss).toHaveBeenCalledWith([2])
  expect(screen.queryByTestId('notification-row-menu')).toBeNull()
})

test('borrar todos requiere confirmación y no ejecuta la RPC al cancelar', async () => {
  mockItems = [{ ...item, readAt: '2026-10-16T12:10:00Z' }]
  const screen = await renderScreen()
  const header = mockSetOptions.mock.lastCall?.[0].headerRight
  await act(async () => header().props.onPress())
  expect(screen.queryByText('Marcar todo como leído')).toBeNull()
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: 'Borrar avisos leídos (1)' }))
  })
  expect(mockConfirm).toHaveBeenCalledWith(
    expect.objectContaining({ tone: 'danger', confirmLabel: 'Borrar' }),
  )
  expect(mockDismiss).not.toHaveBeenCalled()
})

test('borrar todos conserva los IDs exactos para Deshacer', async () => {
  mockItems = [{ ...item, readAt: '2026-10-16T12:10:00Z' }]
  mockConfirm.mockResolvedValue(true)
  const screen = await renderScreen()
  const header = mockSetOptions.mock.lastCall?.[0].headerRight
  await act(async () => header().props.onPress())
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: 'Borrar avisos leídos (1)' }))
  })
  expect(mockDismiss).toHaveBeenCalledWith([2])
  expect(await screen.findByText('Aviso borrado')).toBeTruthy()
})
