import { fireEvent, render, waitFor } from '@testing-library/react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { AppFeedback, useFeedback } from '@/components/feedback/AppFeedback'
import {
  useOrganizationCreationRequests,
  useReviewedOrganizationCreationRequests,
  useReviewOrganizationCreationRequest,
} from '@/features/auth/useOrganizationRequest'
import type { PlatformOrganizationRequest } from '@/features/auth/organizationRequestService'
import { OrganizationRequestsScreen } from '../OrganizationRequestsScreen'
import { OrganizationRequestDetailScreen } from '../OrganizationRequestDetailScreen'

jest.mock('@/features/auth/useOrganizationRequest', () => ({
  useOrganizationCreationRequests: jest.fn(),
  useReviewedOrganizationCreationRequests: jest.fn(),
  useReviewOrganizationCreationRequest: jest.fn(),
}))
jest.mock('@/components/feedback/AppFeedback', () => ({
  AppFeedback: { show: jest.fn(), toast: jest.fn() },
  useFeedback: jest.fn(),
}))
jest.mock('@/components/sheets/BottomSheet', () => ({
  BottomSheet: ({
    visible,
    title,
    children,
    footerAction,
    footerSecondaryAction,
  }: {
    visible: boolean
    title: string
    children: React.ReactNode
    footerAction: { label: string; disabled?: boolean; onPress: () => void }
    footerSecondaryAction: { label: string; onPress: () => void }
  }) => {
    if (!visible) return null
    const { View, Text, Pressable } =
      jest.requireActual<typeof import('react-native')>('react-native')
    return (
      <View>
        <Text>{title}</Text>
        {children}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={footerSecondaryAction.label}
          onPress={footerSecondaryAction.onPress}
        >
          <Text>{footerSecondaryAction.label}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={footerAction.label}
          accessibilityState={{ disabled: footerAction.disabled }}
          onPress={footerAction.onPress}
        >
          <Text>{footerAction.label}</Text>
        </Pressable>
      </View>
    )
  },
}))

const row: PlatformOrganizationRequest = {
  id: 'request-1',
  organizationName: 'Empresa Nueva',
  status: 'pendiente',
  rejectionReason: null,
  createdAt: '2026-10-26T10:00:00Z',
  reviewedAt: null,
  requesterName: 'Ana',
  email: 'ana@example.test',
  contactPhone: '12345678',
  teamSize: '6-25',
  message: 'Necesitamos la app',
  organizationId: null,
  reviewedByName: null,
}
const mutateAsync = jest.fn().mockResolvedValue(null)
const confirm = jest.fn().mockResolvedValue(true)
const goBack = jest.fn()
const navigate = jest.fn()
const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
}
const listProps = {
  navigation: { navigate },
  route: { key: 'OrganizationRequests', name: 'OrganizationRequests' },
} as unknown as Parameters<typeof OrganizationRequestsScreen>[0]
function detailProps(request = row) {
  return {
    navigation: { goBack },
    route: {
      key: 'OrganizationRequestDetail',
      name: 'OrganizationRequestDetail',
      params: { request },
    },
  } as unknown as Parameters<typeof OrganizationRequestDetailScreen>[0]
}
function mount(element: React.ReactElement) {
  return render(<SafeAreaProvider initialMetrics={metrics}>{element}</SafeAreaProvider>)
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.mocked(useOrganizationCreationRequests).mockReturnValue({
    data: [row],
    isLoading: false,
    isError: false,
    isRefetching: false,
    refetch: jest.fn(),
  } as never)
  jest.mocked(useReviewedOrganizationCreationRequests).mockReturnValue({
    data: [
      { ...row, status: 'aprobada', reviewedAt: '2026-10-26T11:00:00Z' },
      { ...row, id: 'r2', status: 'rechazada' },
      { ...row, id: 'r3', status: 'cancelada' },
    ],
    isLoading: false,
    isError: false,
    isRefetching: false,
    refetch: jest.fn(),
  } as never)
  jest
    .mocked(useReviewOrganizationCreationRequest)
    .mockReturnValue({ mutateAsync, isPending: false } as never)
  jest.mocked(useFeedback).mockReturnValue({ confirm } as never)
  mutateAsync.mockResolvedValue(null)
  confirm.mockResolvedValue(true)
})

test('pestañas muestran tamaño y estados correctos', async () => {
  const screen = await mount(<OrganizationRequestsScreen {...listProps} />)
  expect(screen.getByText('6–25 personas')).toBeTruthy()
  await fireEvent.press(screen.getByRole('tab', { name: 'Revisadas' }))
  expect(screen.getByText('Aprobada')).toBeTruthy()
  expect(screen.getByText('Rechazada')).toBeTruthy()
  expect(screen.getByText('Cancelada')).toBeTruthy()
})

test('aprobar confirma y envía motivo nulo', async () => {
  const screen = await mount(<OrganizationRequestDetailScreen {...detailProps()} />)
  await fireEvent.press(screen.getByRole('button', { name: 'Aprobar' }))
  await waitFor(() =>
    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({ title: '¿Crear Empresa Nueva?' }),
    ),
  )
  expect(mutateAsync).toHaveBeenCalledWith({ requestId: 'request-1', approve: true, reason: null })
  expect(goBack).toHaveBeenCalled()
})

test('rechazar exige al menos tres caracteres y envía el motivo recortado', async () => {
  const screen = await mount(<OrganizationRequestDetailScreen {...detailProps()} />)
  await fireEvent.press(screen.getByRole('button', { name: 'Rechazar' }))
  const sheetButton = screen.getAllByRole('button', { name: 'Rechazar' }).at(-1)!
  expect(sheetButton.props.accessibilityState.disabled).toBe(true)
  await fireEvent.changeText(
    screen.getAllByLabelText('Motivo del rechazo, obligatorio').at(-1)!,
    '  Falta información  ',
  )
  expect(sheetButton.props.accessibilityState.disabled).toBe(false)
  await fireEvent.press(sheetButton)
  await waitFor(() =>
    expect(mutateAsync).toHaveBeenCalledWith({
      requestId: 'request-1',
      approve: false,
      reason: 'Falta información',
    }),
  )
})

test('solicitud revisada no ofrece acciones; error de vínculo se muestra literal', async () => {
  const reviewed = await mount(
    <OrganizationRequestDetailScreen {...detailProps({ ...row, status: 'aprobada' })} />,
  )
  expect(reviewed.queryByRole('button', { name: 'Aprobar' })).toBeNull()
  await reviewed.unmount()
  mutateAsync.mockRejectedValueOnce(new Error('Esta persona ya pertenece a una empresa'))
  const pending = await mount(<OrganizationRequestDetailScreen {...detailProps()} />)
  await fireEvent.press(pending.getByRole('button', { name: 'Aprobar' }))
  await waitFor(() =>
    expect(AppFeedback.show).toHaveBeenCalledWith(
      'No fue posible aprobar',
      'Esta persona ya pertenece a una empresa',
      { tone: 'error' },
    ),
  )
})
