import { renderHook, waitFor } from '@testing-library/react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

import { AppFeedback } from '@/components/feedback/AppFeedback'
import { getMyOrganizationCreationRequest } from '@/features/auth/organizationRequestService'
import type { Profile } from '@/features/auth/types'

import { useApprovedOrganizationNotice } from '../useApprovedOrganizationNotice'

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(), setItem: jest.fn() },
}))
jest.mock('@/features/auth/organizationRequestService', () => ({
  getMyOrganizationCreationRequest: jest.fn(),
}))

const admin = {
  id: 'user-1',
  role: 'administrador',
  organizationId: 'org-1',
  organizationName: 'Prueba2',
} as Profile
const approved = {
  id: 'request-1',
  organizationName: 'Prueba2',
  status: 'aprobada',
  rejectionReason: null,
  createdAt: '2026-10-27T03:02:00Z',
  reviewedAt: '2026-10-27T03:07:00Z',
}

let show: jest.SpyInstance

beforeEach(() => {
  jest.clearAllMocks()
  show = jest.spyOn(AppFeedback, 'show').mockImplementation(() => {})
  ;(AsyncStorage.getItem as jest.Mock).mockResolvedValue(null)
  ;(AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined)
  ;(getMyOrganizationCreationRequest as jest.Mock).mockResolvedValue(approved)
})

afterEach(() => show.mockRestore())

test('muestra una vez el aviso verde a quien entra a la empresa que pidió', async () => {
  await renderHook(() => useApprovedOrganizationNotice(admin))
  await waitFor(() =>
    expect(show).toHaveBeenCalledWith('Prueba2 ya está creada', expect.any(String), {
      tone: 'success',
      icon: 'checkmark-circle-outline',
    }),
  )
  expect(AsyncStorage.setItem).toHaveBeenCalledWith(
    'approved-organization-notice:user-1:org-1',
    '1',
  )
})

test('no vuelve a mostrarlo ni consulta si ya se vio', async () => {
  ;(AsyncStorage.getItem as jest.Mock).mockResolvedValue('1')
  await renderHook(() => useApprovedOrganizationNotice(admin))
  await waitFor(() => expect(AsyncStorage.getItem).toHaveBeenCalled())
  expect(getMyOrganizationCreationRequest).not.toHaveBeenCalled()
  expect(show).not.toHaveBeenCalled()
})

test('otros administradores solo consultan una vez y no ven el aviso', async () => {
  ;(getMyOrganizationCreationRequest as jest.Mock).mockResolvedValue(null)
  await renderHook(() => useApprovedOrganizationNotice(admin))
  await waitFor(() => expect(AsyncStorage.setItem).toHaveBeenCalled())
  expect(show).not.toHaveBeenCalled()

  ;(getMyOrganizationCreationRequest as jest.Mock).mockResolvedValue({
    ...approved,
    organizationName: 'Otra empresa',
  })
  await renderHook(() => useApprovedOrganizationNotice({ ...admin, organizationId: 'org-2' }))
  await waitFor(() => expect(AsyncStorage.setItem).toHaveBeenCalledTimes(2))
  expect(show).not.toHaveBeenCalled()
})

test('no consulta para quien no es administrador y reintenta si falla la red', async () => {
  await renderHook(() => useApprovedOrganizationNotice({ ...admin, role: 'solicitante' }))
  expect(AsyncStorage.getItem).not.toHaveBeenCalled()

  ;(getMyOrganizationCreationRequest as jest.Mock).mockRejectedValueOnce(new Error('red'))
  await renderHook(() => useApprovedOrganizationNotice(admin))
  await waitFor(() => expect(getMyOrganizationCreationRequest).toHaveBeenCalled())
  expect(AsyncStorage.setItem).not.toHaveBeenCalled()
  expect(show).not.toHaveBeenCalled()
})
