import { File } from 'expo-file-system'
import { ImageManipulator } from 'expo-image-manipulator'

import { prepareProfilePhoto } from '../profilePhotoPreparation'

jest.mock('expo-file-system', () => ({ File: jest.fn() }))
jest.mock('expo-image-manipulator', () => ({
  ImageManipulator: { manipulate: jest.fn() },
  SaveFormat: { JPEG: 'jpeg' },
}))

const crop = jest.fn()
const resize = jest.fn()
const saveAsync = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
  ;(ImageManipulator.manipulate as jest.Mock).mockReturnValue({
    crop,
    resize,
    renderAsync: async () => ({ saveAsync }),
  })
  saveAsync.mockImplementation(async ({ compress }) => ({ uri: `file://${compress}` }))
  ;(File as unknown as jest.Mock).mockImplementation(() => ({ size: 500_000 }))
})

test('recorta en cuadrado, reduce a 512 px y convierte a JPEG', async () => {
  await expect(prepareProfilePhoto('file://original', 1200, 800)).resolves.toBe('file://0.8')
  expect(crop).toHaveBeenCalledWith({ originX: 200, originY: 0, width: 800, height: 800 })
  expect(resize).toHaveBeenCalledWith({ width: 512, height: 512 })
  expect(saveAsync).toHaveBeenCalledWith({ format: 'jpeg', compress: 0.8 })
})

test('recomprime bajo 1 MB y rechaza una imagen que aún excede el límite', async () => {
  ;(File as unknown as jest.Mock).mockImplementation((uri: string) => ({
    size: uri === 'file://0.8' ? 1_200_000 : 800_000,
  }))
  await expect(prepareProfilePhoto('file://original', 300, 300)).resolves.toBe('file://0.6')
  expect(resize).not.toHaveBeenCalled()
  ;(File as unknown as jest.Mock).mockImplementation(() => ({ size: 2_000_000 }))
  await expect(prepareProfilePhoto('file://original', 300, 300)).rejects.toThrow('supera 1 MB')
  expect(saveAsync).toHaveBeenCalledWith({ format: 'jpeg', compress: 0.4 })
})

test('rechaza dimensiones inválidas', async () => {
  await expect(prepareProfilePhoto('file://original', 0, 300)).rejects.toThrow('leer la imagen')
})
