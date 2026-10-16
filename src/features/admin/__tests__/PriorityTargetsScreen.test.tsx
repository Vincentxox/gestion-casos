import { fireEvent, render, waitFor } from '@testing-library/react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { PriorityTargetsScreen } from '../screens/PriorityTargetsScreen'

const mockSave = jest.fn().mockResolvedValue({})
jest.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (state: unknown) => unknown) =>
    selector({ profile: { organizationId: 'org' } }),
}))
jest.mock('@/components/feedback/AppFeedback', () => ({
  AppFeedback: { toast: jest.fn(), show: jest.fn() },
}))
jest.mock('@/features/home/useIndicators', () => ({
  usePriorityTargets: () => ({
    data: [{ priority: 'alta', acceptHours: 4, resolveHours: 24 }],
    isLoading: false,
    isError: false,
  }),
  useSetPriorityTarget: () => ({ mutateAsync: mockSave, isPending: false }),
}))

test('no guarda valores inválidos y envía números después de corregirlos', async () => {
  const screen = await render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 360, height: 640 },
        insets: { top: 0, right: 0, bottom: 0, left: 0 },
      }}
    >
      <PriorityTargetsScreen />
    </SafeAreaProvider>,
  )
  const save = () => screen.getByLabelText('Guardar prioridad alta')
  expect(save().props.accessibilityState.disabled).toBe(true)
  await fireEvent.changeText(screen.getByLabelText('Horas para resolver'), '2')
  await waitFor(() =>
    expect(screen.getByText('La resolución no puede ser menor que la aceptación.')).toBeTruthy(),
  )
  expect(save().props.accessibilityState.disabled).toBe(true)
  expect(mockSave).not.toHaveBeenCalled()
  await fireEvent.changeText(screen.getByLabelText('Horas para resolver'), '48')
  await waitFor(() => expect(save().props.accessibilityState.disabled).toBe(false))
  await fireEvent.press(save())
  await waitFor(() =>
    expect(mockSave).toHaveBeenCalledWith({ priority: 'alta', acceptHours: 4, resolveHours: 48 }),
  )
})
