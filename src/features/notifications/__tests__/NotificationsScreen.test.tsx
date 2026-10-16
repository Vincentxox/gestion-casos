import { fireEvent, render } from '@testing-library/react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import type { AppNotification } from '../notificationService'
import { NotificationsScreen } from '../NotificationsScreen'

const mockNavigate = jest.fn()
const mockSetOptions = jest.fn()
const mockMark = jest.fn()
const mockRefetch = jest.fn()
let mockItems: AppNotification[] = []

jest.mock('../useNotifications', () => ({
  useNotifications: () => ({
    data: mockItems,
    isLoading: false,
    isError: false,
    refetch: mockRefetch,
  }),
  useMarkNotificationsRead: () => ({ mutate: mockMark, isPending: false }),
}))

const item: AppNotification = {
  id: 2,
  caseId: 'case-2',
  title: 'Reporte enviado',
  body: 'Texto anterior',
  action: 'enviar_reporte',
  caseNumber: 'CAS-2026-00002',
  caseTitle: 'Fuga de agua',
  actorName: 'Ana (dado de baja)',
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

test('Leer todo solo existe en cabecera si quedan no leídos', async () => {
  mockItems = [item]
  const firstScreen = await renderScreen()
  const unreadHeader = mockSetOptions.mock.lastCall?.[0].headerRight
  const action = await render(unreadHeader())
  await fireEvent.press(action.getByRole('button', { name: 'Leer todo' }))
  expect(mockMark).toHaveBeenCalledWith(null)
  await action.unmount()
  await firstScreen.unmount()

  mockItems = [{ ...item, readAt: '2026-10-16T12:10:00Z' }]
  await renderScreen()
  const readHeader = mockSetOptions.mock.lastCall?.[0].headerRight
  expect(readHeader()).toBeNull()
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
