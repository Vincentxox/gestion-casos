import { act, fireEvent, render, waitFor } from '@testing-library/react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { PhotoGrid } from '../components/PhotoGrid'
import type { CasePhoto, PendingPhoto } from '../types'

const mockInvalidateQueries = jest.fn().mockResolvedValue(undefined)
const mockListPendingPhotos = jest.fn()
const mockResumePendingPhotos = jest.fn().mockResolvedValue(undefined)
let mockNotifyQueueChanged: (() => void) | undefined
let mockPhotosResponse: { data: CasePhoto[]; isError: boolean } = { data: [], isError: false }
let mockCaseActionsResponse: {
  data: Record<string, { allowed: boolean }>
  isFetching: boolean
  error: Error | null
  refetch: jest.Mock
} = { data: {}, isFetching: false, error: null, refetch: jest.fn() }

jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
}))
jest.mock('@react-native-community/netinfo', () => ({
  useNetInfo: () => ({ isConnected: false, isInternetReachable: false }),
}))
jest.mock('../usePhotos', () => ({
  photosQueryKey: ['case-photos'],
  useCasePhotos: () => mockPhotosResponse,
  useDeletePhoto: () => ({ isPending: false }),
  usePhotoUrl: () => ({ data: null }),
}))
jest.mock('@/features/cases/useCases', () => ({
  casesQueryKey: ['cases'],
  useCaseActions: () => mockCaseActionsResponse,
}))

beforeEach(() => {
  mockPhotosResponse = { data: [], isError: false }
  mockCaseActionsResponse = {
    data: { fotos_despues: { allowed: true }, fotos_antes: { allowed: true } },
    isFetching: false,
    error: null,
    refetch: jest.fn(),
  }
})
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

test('la primera carga y una denegación ocultan agregar; la recarga conserva el permiso confirmado', async () => {
  mockListPendingPhotos.mockResolvedValue([])
  mockCaseActionsResponse = { data: {}, isFetching: true, error: null, refetch: jest.fn() }
  const screen = await render(
    inSafeArea(<PhotoGrid caseId="case" kind="despues" userId="tech" editable />),
  )
  expect(screen.queryByRole('button', { name: 'Agregar foto de después' })).toBeNull()

  mockCaseActionsResponse = {
    data: { fotos_despues: { allowed: true } },
    isFetching: true,
    error: null,
    refetch: jest.fn(),
  }
  await screen.rerender(
    inSafeArea(<PhotoGrid caseId="case" kind="despues" userId="tech" editable />),
  )
  expect(screen.getAllByRole('button', { name: 'Agregar foto de después' })).toHaveLength(1)

  mockCaseActionsResponse = {
    data: { fotos_despues: { allowed: false } },
    isFetching: false,
    error: null,
    refetch: jest.fn(),
  }
  await screen.rerender(
    inSafeArea(<PhotoGrid caseId="case" kind="despues" userId="tech" editable />),
  )
  expect(screen.queryByRole('button', { name: 'Agregar foto de después' })).toBeNull()
})

test('si fallan las acciones, conserva las fotos subidas en lectura y permite reintentar', async () => {
  mockListPendingPhotos.mockResolvedValue([])
  mockPhotosResponse = {
    data: [{ id: 'foto-1', kind: 'despues', thumbPath: 'thumb', imagePath: 'full' } as CasePhoto],
    isError: false,
  }
  const refetch = jest.fn()
  mockCaseActionsResponse = {
    data: { fotos_despues: { allowed: true } },
    isFetching: false,
    error: new Error('sin red'),
    refetch,
  }
  const screen = await render(
    inSafeArea(<PhotoGrid caseId="case" kind="despues" userId="tech" editable />),
  )
  expect(screen.getByText('No fue posible cargar las acciones de fotos.')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Ver foto Después 1' })).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Opciones de foto Después 1' })).toBeNull()
  await fireEvent.press(screen.getByRole('button', { name: 'Reintentar permisos' }))
  expect(refetch).toHaveBeenCalled()
})

test('no ofrece un reintento de subida que no puede ejecutarse sin permiso', async () => {
  mockListPendingPhotos.mockResolvedValue([pending])
  mockCaseActionsResponse = {
    data: { fotos_despues: { allowed: false } },
    isFetching: false,
    error: null,
    refetch: jest.fn(),
  }
  const screen = await render(
    inSafeArea(<PhotoGrid caseId="case" kind="despues" userId="tech" editable />),
  )
  await waitFor(() => expect(screen.getByText('No puedes reintentar esta foto ahora')).toBeTruthy())
  expect(screen.queryByRole('button', { name: 'Reintentar foto Después 1' })).toBeNull()
})
