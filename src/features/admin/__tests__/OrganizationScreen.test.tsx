import { fireEvent, render, waitFor } from '@testing-library/react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { AppFeedbackProvider } from '@/components/feedback/AppFeedback'

import { OrganizationScreen } from '../screens/OrganizationScreen'

const mockRename = jest.fn().mockResolvedValue({ name: 'Empresa nueva' })
const mockRegenerate = jest.fn().mockResolvedValue('ABCD-1234')

jest.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (state: unknown) => unknown) =>
    selector({ profile: { organizationId: 'org' }, applyOrganizationName: jest.fn() }),
}))
jest.mock('../useOrganization', () => ({
  useOrganization: () => ({ data: { name: 'Empresa actual' }, isLoading: false, error: null }),
  useOrganizationJoinCode: () => ({ data: 'WXYZ-5678', isLoading: false, isError: false }),
  useRenameOrganization: () => ({ mutateAsync: mockRename, isPending: false }),
  useRegenerateOrganizationJoinCode: () => ({ mutateAsync: mockRegenerate, isPending: false }),
}))

beforeEach(() => {
  mockRename.mockClear()
  mockRegenerate.mockClear()
})

function renderScreen() {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 400, height: 800 },
        insets: { top: 0, right: 0, bottom: 0, left: 0 },
      }}
    >
      <AppFeedbackProvider>
        <OrganizationScreen />
      </AppFeedbackProvider>
    </SafeAreaProvider>,
  )
}

test('solo habilita guardar cuando cambia el nombre', async () => {
  const screen = await renderScreen()
  expect(screen.getByLabelText('Guardar nombre').props.accessibilityState.disabled).toBe(true)

  await fireEvent.changeText(screen.getByLabelText('Nombre de la empresa'), 'Empresa nueva')
  expect(screen.getByLabelText('Guardar nombre').props.accessibilityState.disabled).toBe(false)
  await fireEvent.press(screen.getByLabelText('Guardar nombre'))
  await waitFor(() => expect(mockRename).toHaveBeenCalledWith('Empresa nueva'))
})

test('pide confirmación dentro de la app antes de regenerar el código', async () => {
  const screen = await renderScreen()
  await fireEvent.press(screen.getByLabelText('Regenerar código'))
  expect(mockRegenerate).not.toHaveBeenCalled()
  expect(screen.getByText(/Las personas con el código anterior ya no podrán usarlo/)).toBeTruthy()

  await fireEvent.press(screen.getAllByLabelText('Regenerar código')[1]!)
  await waitFor(() => expect(mockRegenerate).toHaveBeenCalledTimes(1))
})
