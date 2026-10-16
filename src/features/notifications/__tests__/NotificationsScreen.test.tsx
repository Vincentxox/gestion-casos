import { fireEvent, render } from '@testing-library/react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { NotificationsScreen } from '../NotificationsScreen'

const mockNavigate = jest.fn()
const mockMark = jest.fn()
jest.mock('../useNotifications', () => ({
  useNotifications: () => ({
    data: [
      {
        id: 2,
        caseId: 'case-2',
        title: 'Reporte enviado',
        body: 'Revisa el reporte',
        createdAt: '2026-10-14T12:00:00Z',
        readAt: null,
      },
    ],
    isLoading: false,
    isError: false,
  }),
  useMarkNotificationsRead: () => ({ mutate: mockMark, isPending: false }),
}))

test('abre el caso y marca el aviso leído', async () => {
  const props = {
    navigation: { navigate: mockNavigate },
    route: { key: 'Notifications', name: 'Notifications' },
  } as unknown as Parameters<typeof NotificationsScreen>[0]
  const screen = await render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 400, height: 800 },
        insets: { top: 0, right: 0, bottom: 0, left: 0 },
      }}
    >
      <NotificationsScreen {...props} />
    </SafeAreaProvider>,
  )
  await fireEvent.press(
    screen.getByRole('button', { name: 'Sin leer. Reporte enviado. Revisa el reporte' }),
  )
  expect(mockMark).toHaveBeenCalledWith([2])
  expect(mockNavigate).toHaveBeenCalledWith('CaseDetail', { caseId: 'case-2' })
  await fireEvent.press(screen.getByRole('button', { name: 'Marcar todos como leídos' }))
  expect(mockMark).toHaveBeenCalledWith(null)
})
