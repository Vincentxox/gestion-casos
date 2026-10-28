import NetInfo from '@react-native-community/netinfo'
import { renderHook } from '@testing-library/react-native'
import { AppState, type AppStateStatus } from 'react-native'

import { resumePendingPhotos } from '@/features/photos/uploadQueue'

import { useOrganizationLifecycle } from '../useOrganizationLifecycle'

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: { addEventListener: jest.fn() },
}))
jest.mock('@/features/photos/uploadQueue', () => ({ resumePendingPhotos: jest.fn() }))
jest.mock('@/features/photos/usePhotos', () => ({ photosQueryKey: ['case-photos'] }))
jest.mock('@/features/cases/useCases', () => ({ casesQueryKey: ['cases'] }))

const addNetworkListener = jest.mocked(NetInfo.addEventListener)
const mockResumePendingPhotos = jest.mocked(resumePendingPhotos)
const unsubscribeNetwork = jest.fn()
const removeAppListener = jest.fn()
const refreshProfile = jest.fn().mockResolvedValue(null)
let appListener: ((state: AppStateStatus) => void) | undefined

beforeEach(() => {
  jest.clearAllMocks()
  mockResumePendingPhotos.mockResolvedValue(undefined)
  addNetworkListener.mockReturnValue(unsubscribeNetwork)
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
    appListener = listener
    return { remove: removeAppListener } as ReturnType<typeof AppState.addEventListener>
  })
})

afterEach(() => {
  jest.restoreAllMocks()
})

test('detiene el reanudador de fotos al desactivar y lo reanuda al activar', async () => {
  const hook = await renderHook(
    ({ active }: { active: boolean }) =>
      useOrganizationLifecycle({
        userId: 'user',
        organizationId: 'org',
        organizationActive: active,
        authenticated: true,
        refreshProfile,
      }),
    { initialProps: { active: true } },
  )

  expect(mockResumePendingPhotos).toHaveBeenCalledWith('user', expect.any(Function), 'startup')
  expect(addNetworkListener).toHaveBeenCalledTimes(1)

  await hook.rerender({ active: false })
  expect(unsubscribeNetwork).toHaveBeenCalledTimes(1)
  expect(addNetworkListener).toHaveBeenCalledTimes(1)
  expect(mockResumePendingPhotos).toHaveBeenCalledTimes(1)

  await hook.rerender({ active: true })
  expect(mockResumePendingPhotos).toHaveBeenCalledTimes(2)
  expect(addNetworkListener).toHaveBeenCalledTimes(2)
})

test('al volver a primer plano refresca el perfil incluso si la empresa está inactiva', async () => {
  const hook = await renderHook(() =>
    useOrganizationLifecycle({
      userId: 'user',
      organizationId: 'org',
      organizationActive: false,
      authenticated: true,
      refreshProfile,
    }),
  )

  appListener?.('background')
  appListener?.('active')

  expect(refreshProfile).toHaveBeenCalledTimes(1)
  expect(mockResumePendingPhotos).not.toHaveBeenCalled()
  await hook.unmount()
  expect(removeAppListener).toHaveBeenCalledTimes(1)
})
