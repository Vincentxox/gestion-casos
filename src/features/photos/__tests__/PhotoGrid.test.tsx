import { act, render, waitFor } from '@testing-library/react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { PhotoGrid } from '../components/PhotoGrid'
import type { PendingPhoto } from '../types'

const mockInvalidateQueries = jest.fn().mockResolvedValue(undefined)
const mockListPendingPhotos = jest.fn()
const mockResumePendingPhotos = jest.fn().mockResolvedValue(undefined)
let mockNotifyQueueChanged: (() => void) | undefined

jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
}))
jest.mock('@react-native-community/netinfo', () => ({
  useNetInfo: () => ({ isConnected: false, isInternetReachable: false }),
}))
jest.mock('../usePhotos', () => ({
  photosQueryKey: ['case-photos'],
  useCasePhotos: () => ({ data: [], isError: false }),
  useDeletePhoto: () => ({ isPending: false }),
  usePhotoUrl: () => ({ data: null }),
}))
jest.mock('../uploadQueue', () => ({
  listPendingPhotos: (...args: unknown[]) => mockListPendingPhotos(...args),
  resumePendingPhotos: (...args: unknown[]) => mockResumePendingPhotos(...args),
  subscribePendingPhotos: (_userId: string, _caseId: string, listener: () => void) => {
    mockNotifyQueueChanged = listener
    return () => {
      mockNotifyQueueChanged = undefined
    }
  },
}))

const pending: PendingPhoto = {
  localId: 'local',
  userId: 'tech',
  caseId: 'case',
  kind: 'despues',
  fullUri: 'file:///full.jpg',
  thumbUri: 'file:///thumb.jpg',
  reservation: null,
  fullUploaded: false,
  thumbUploaded: false,
  attempts: 1,
  status: 'error',
  error: 'Network request failed',
  retryOnReconnect: true,
}

function inSafeArea(children: React.ReactNode) {
  return (
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 400, height: 800 },
        insets: { top: 0, right: 0, bottom: 0, left: 0 },
      }}
    >
      {children}
    </SafeAreaProvider>
  )
}

test('la foto pendiente se actualiza al terminar la subida en segundo plano', async () => {
  let entries = [pending]
  mockListPendingPhotos.mockImplementation(async () => entries)
  const screen = await render(
    inSafeArea(<PhotoGrid caseId="case" kind="despues" userId="tech" editable />),
  )

  await waitFor(() =>
    expect(screen.getAllByText('Sin conexión; se subirá al reconectar')).toHaveLength(2),
  )
  expect(mockListPendingPhotos).toHaveBeenCalledWith('tech', 'case')

  entries = []
  await act(async () => {
    mockNotifyQueueChanged?.()
  })
  await waitFor(() =>
    expect(screen.queryAllByText('Sin conexión; se subirá al reconectar')).toHaveLength(0),
  )
})

test('sin permiso de edición muestra un estado vacío sin casillas para agregar', async () => {
  mockListPendingPhotos.mockResolvedValue([])
  const screen = await render(
    inSafeArea(<PhotoGrid caseId="case" kind="despues" userId="tech" editable={false} />),
  )

  expect(screen.getByText('Sin fotos de después')).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Agregar foto de después' })).toBeNull()
})
