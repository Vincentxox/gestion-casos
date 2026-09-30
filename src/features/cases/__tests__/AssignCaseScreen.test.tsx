import { fireEvent, render, waitFor } from '@testing-library/react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { AppFeedback } from '@/components/feedback/AppFeedback'

import { AssignCaseScreen } from '../screens/AssignCaseScreen'
import type { CaseRecord } from '../types'
import { useAssignableProfiles, useAssignCase, useCaseDetail } from '../useCases'

jest.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (state: unknown) => unknown) =>
    selector({
      profile: {
        id: 'chief',
        role: 'jefe_area',
        areaId: 'technical',
        organizationId: 'organization',
      },
    }),
}))
jest.mock('@/components/feedback/AppFeedback', () => ({
  AppFeedback: { show: jest.fn(), toast: jest.fn() },
}))
jest.mock('../useCases', () => ({
  useAssignableProfiles: jest.fn(),
  useAssignCase: jest.fn(),
  useCaseDetail: jest.fn(),
}))

const baseCase: CaseRecord = {
  id: 'case-1',
  caseNumber: 'CAS-2026-00007',
  title: 'Reparación',
  description: 'Trabajo técnico',
  category: 'Mantenimiento',
  minAfterPhotos: 0,
  categoryId: 'category',
  requestingAreaId: 'requesting',
  requestingAreaName: 'Administración',
  targetAreaId: 'technical',
  targetAreaName: 'Tecnología',
  location: 'Oficina',
  priority: 'media',
  status: 'asignado',
  createdBy: 'requester',
  assignedTo: 'ana',
  creatorName: 'Solicitante',
  assigneeName: 'Ana',
  createdAt: '2026-09-30T12:00:00Z',
  updatedAt: '2026-09-30T12:00:00Z',
}

async function setup(item: CaseRecord) {
  const mutateAsync = jest.fn().mockResolvedValue(undefined)
  const navigation = { setOptions: jest.fn(), goBack: jest.fn(), getParent: jest.fn() }
  ;(useCaseDetail as jest.Mock).mockReturnValue({ data: item, isLoading: false, error: null })
  ;(useAssignableProfiles as jest.Mock).mockReturnValue({
    data: [
      { id: 'ana', fullName: 'Ana', role: 'tecnico', areaId: 'technical', areaName: 'Tecnología' },
      {
        id: 'luis',
        fullName: 'Luis',
        role: 'jefe_area',
        areaId: 'technical',
        areaName: 'Tecnología',
      },
    ],
    isLoading: false,
    error: null,
  })
  ;(useAssignCase as jest.Mock).mockReturnValue({ mutateAsync, isPending: false })
  const screen = await render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 400, height: 800 },
        insets: { top: 0, right: 0, bottom: 0, left: 0 },
      }}
    >
      <AssignCaseScreen
        navigation={navigation as never}
        route={{ params: { caseId: item.id } } as never}
      />
    </SafeAreaProvider>,
  )
  return { screen, mutateAsync, navigation }
}

beforeEach(() => jest.clearAllMocks())

test('separa al responsable actual y exige elegir a otra persona antes de reasignar', async () => {
  const { screen, mutateAsync, navigation } = await setup(baseCase)

  await waitFor(() =>
    expect(navigation.setOptions).toHaveBeenCalledWith({ title: 'Reasignar personal' }),
  )
  expect(screen.getByText('RESPONSABLE ACTUAL')).toBeTruthy()
  expect(screen.getByText('Asignado ahora')).toBeTruthy()
  expect(screen.queryByLabelText('Elegir a Ana')).toBeNull()
  expect(screen.getByLabelText('Reasignar personal').props.accessibilityState.disabled).toBe(true)
  expect(AppFeedback.show).not.toHaveBeenCalled()

  await fireEvent.press(screen.getByLabelText('Elegir a Luis'))
  expect(screen.getByLabelText('Reasignar a Luis').props.accessibilityState.disabled).toBe(false)
  await fireEvent.press(screen.getByLabelText('Reasignar a Luis'))

  await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith('luis'))
  expect(AppFeedback.toast).toHaveBeenCalledWith('Solicitud reasignada a Luis')
  expect(navigation.goBack).toHaveBeenCalledTimes(1)
})

test('mantiene la asignación inicial sin selección ni responsable actual', async () => {
  const { screen, mutateAsync, navigation } = await setup({
    ...baseCase,
    status: 'aceptado',
    assignedTo: null,
    assigneeName: null,
  })

  await waitFor(() =>
    expect(navigation.setOptions).toHaveBeenCalledWith({ title: 'Asignar personal' }),
  )
  expect(screen.queryByText('RESPONSABLE ACTUAL')).toBeNull()
  expect(screen.getByLabelText('Asignar personal').props.accessibilityState.disabled).toBe(true)

  await fireEvent.press(screen.getByLabelText('Elegir a Luis'))
  await fireEvent.press(screen.getByLabelText('Asignar a Luis'))

  await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith('luis'))
  expect(AppFeedback.toast).toHaveBeenCalledWith('Solicitud asignada a Luis')
})
