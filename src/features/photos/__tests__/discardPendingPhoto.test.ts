import { File } from 'expo-file-system'
import Storage from 'expo-sqlite/kv-store'

import { discardPendingPhoto } from '../uploadQueue'

const mockDelete = jest.fn()

jest.mock('expo-file-system', () => ({
  Directory: jest.fn().mockImplementation(() => ({ uri: 'file:///docs/pending-photos' })),
  File: jest.fn().mockImplementation(() => ({ exists: true, delete: mockDelete })),
  Paths: { document: 'file:///docs' },
}))
jest.mock('expo-sqlite/kv-store', () => ({
  __esModule: true,
  default: {
    getItemAsync: jest.fn(),
    removeItemAsync: jest.fn(),
  },
}))
jest.mock('../photoService', () => ({
  reserveCasePhoto: jest.fn(),
  uploadPhotoFile: jest.fn(),
  confirmCasePhoto: jest.fn(),
  isAlreadyUploaded: jest.fn(),
}))

const getItem = Storage.getItemAsync as jest.Mock
const removeItem = Storage.removeItemAsync as jest.Mock
const file = File as unknown as jest.Mock

beforeEach(() => {
  jest.clearAllMocks()
  getItem.mockResolvedValue(
    JSON.stringify({ localId: 'local-1', userId: 'tech-1', status: 'error' }),
  )
})

test('descarta una foto fallida: borra ambas copias locales y luego la entrada', async () => {
  await discardPendingPhoto('tech-1', 'local-1')
  expect(file).toHaveBeenCalledWith(expect.anything(), 'local-1-full.jpg')
  expect(file).toHaveBeenCalledWith(expect.anything(), 'local-1-thumb.jpg')
  expect(mockDelete).toHaveBeenCalledTimes(2)
  expect(removeItem).toHaveBeenCalledWith('pending-photo:local-1')
  expect(mockDelete.mock.invocationCallOrder[1]).toBeLessThan(
    removeItem.mock.invocationCallOrder[0]!,
  )
})

test('no borra fotos de otro usuario ni una subida en curso', async () => {
  await expect(discardPendingPhoto('other', 'local-1')).rejects.toThrow('No puedes descartar')
  getItem.mockResolvedValue(
    JSON.stringify({ localId: 'local-1', userId: 'tech-1', status: 'uploading' }),
  )
  await expect(discardPendingPhoto('tech-1', 'local-1')).rejects.toThrow('Espera a que termine')
  expect(file).not.toHaveBeenCalled()
  expect(removeItem).not.toHaveBeenCalled()
})

test('rechaza identificadores que puedan salir de pending-photos', async () => {
  await expect(discardPendingPhoto('tech-1', '../other')).rejects.toThrow('no válida')
  expect(getItem).not.toHaveBeenCalled()
})
