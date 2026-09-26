import { File } from 'expo-file-system'
import { ImageManipulator } from 'expo-image-manipulator'

import { preparePhoto } from '../imagePreparation'

jest.mock('expo-file-system', () => ({ File: jest.fn() }))
jest.mock('expo-image-manipulator', () => ({
  ImageManipulator: { manipulate: jest.fn() },
  SaveFormat: { JPEG: 'jpeg' },
}))

const manipulate = ImageManipulator.manipulate as jest.Mock
const file = File as unknown as jest.Mock
const resize = jest.fn()
const saveAsync = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
  manipulate.mockReturnValue({ resize, renderAsync: async () => ({ saveAsync }) })
  saveAsync.mockImplementation(async (options) => ({
    uri: `file://${options.compress}-${saveAsync.mock.calls.length}`,
  }))
  file.mockImplementation(() => ({ size: 500_000 }))
})

test('reescala el lado mayor y recodifica también la miniatura', async () => {
  await expect(preparePhoto('file://original', 3000, 1500)).resolves.toMatchObject({
    fullUri: 'file://0.8-1',
    thumbUri: 'file://0.7-2',
  })
  expect(resize).toHaveBeenNthCalledWith(1, { width: 1600, height: null })
  expect(resize).toHaveBeenNthCalledWith(2, { width: 400, height: null })
  expect(saveAsync).toHaveBeenNthCalledWith(1, { format: 'jpeg', compress: 0.8 })
})

test('recomprime a 0,6 si excede 2 MB y rechaza si sigue grande', async () => {
  file.mockImplementation(() => ({ size: 3 * 1024 * 1024 }))
  await expect(preparePhoto('file://original', 1500, 900)).rejects.toThrow('supera 2 MB')
  expect(saveAsync).toHaveBeenCalledWith({ format: 'jpeg', compress: 0.6 })
  expect(resize).not.toHaveBeenCalled()
})
