import { act, fireEvent, render, waitFor } from '@testing-library/react-native'

import { AppFeedback } from '@/components/feedback/AppFeedback'
import { useAreas } from '@/features/areas/useAreas'

import { UsersScreen } from '../screens/UsersScreen'
import { useDeactivateMember, useManagedProfiles, useSetMemberAccess } from '../useManagedProfiles'

jest.mock('@/features/areas/useAreas', () => ({ useAreas: jest.fn() }))
jest.mock('../useManagedProfiles', () => ({
  useManagedProfiles: jest.fn(),
  useSetMemberAccess: jest.fn(),
  useDeactivateMember: jest.fn(),
}))
jest.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (state: unknown) => unknown) =>
    selector({ profile: { id: 'admin' }, applyOwnAccess: jest.fn() }),
}))
jest.mock('@/components/feedback/AppFeedback', () => ({
  AppFeedback: { show: jest.fn(), toast: jest.fn() },
}))
jest.mock('@/components/ui/ScreenContainer', () => ({
  ScreenContainer: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))
jest.mock('@/components/sheets/BottomSheet', () => ({
  BottomSheet: ({ children, visible }: { children: React.ReactNode; visible: boolean }) =>
    visible ? <>{children}</> : null,
}))

beforeEach(() => {
  jest.clearAllMocks()
  ;(useManagedProfiles as jest.Mock).mockReturnValue({
    data: [
      { id: 'admin', fullName: 'Brandon', role: 'administrador', areaId: null, areaName: null },
      { id: 'ana', fullName: 'Ana', role: 'tecnico', areaId: 'area', areaName: 'Tecnología' },
    ],
    isLoading: false,
    isRefetching: false,
    error: null,
  })
  ;(useAreas as jest.Mock).mockReturnValue({
    data: [{ id: 'area', name: 'Tecnología', kind: 'tecnica', isActive: true }],
    isLoading: false,
    isRefetching: false,
    error: null,
  })
  ;(useSetMemberAccess as jest.Mock).mockReturnValue({ mutateAsync: jest.fn(), isPending: false })
  ;(useDeactivateMember as jest.Mock).mockReturnValue({
    mutateAsync: jest.fn().mockResolvedValue(undefined),
    isPending: false,
  })
})

test('pide confirmación antes de dar de baja y no ofrece la acción sobre sí mismo', async () => {
  const screen = await render(<UsersScreen />)

  await fireEvent.press(screen.getByLabelText('Editar acceso de Brandon'))
  expect(screen.queryByLabelText('Dar de baja a Brandon')).toBeNull()

  await fireEvent.press(screen.getByLabelText('Editar acceso de Ana'))
  await fireEvent.press(screen.getByLabelText('Dar de baja a Ana'))
  const [title, , actions] = (AppFeedback.show as jest.Mock).mock.calls[0]
  expect(title).toBe('¿Dar de baja a Ana?')
  expect(actions).toEqual(
    expect.arrayContaining([expect.objectContaining({ style: 'destructive' })]),
  )
  const destructive = actions.find((action: { style: string }) => action.style === 'destructive')
  await act(async () => destructive.onPress())
  await waitFor(() =>
    expect(
      (useDeactivateMember as jest.Mock).mock.results[0]!.value.mutateAsync,
    ).toHaveBeenCalledWith('ana'),
  )
  expect(AppFeedback.toast).toHaveBeenCalledWith('Se dio de baja a Ana')
})

test('muestra los números de casos que deben reasignarse antes de la baja', async () => {
  const message = 'Reasigna primero sus trabajos abiertos: CAS-2026-00009'
  ;(useDeactivateMember as jest.Mock).mockReturnValue({
    mutateAsync: jest.fn().mockRejectedValue(new Error(message)),
    isPending: false,
  })
  const screen = await render(<UsersScreen />)
  await fireEvent.press(screen.getByLabelText('Editar acceso de Ana'))
  await fireEvent.press(screen.getByLabelText('Dar de baja a Ana'))
  const actions = (AppFeedback.show as jest.Mock).mock.calls[0]![2]
  const destructive = actions.find((action: { style: string }) => action.style === 'destructive')
  await act(async () => destructive.onPress())
  await waitFor(() =>
    expect(AppFeedback.show).toHaveBeenCalledWith('No fue posible dar de baja', message),
  )
})
