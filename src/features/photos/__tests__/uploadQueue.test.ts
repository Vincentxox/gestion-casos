import Storage from 'expo-sqlite/kv-store'

import { processPendingPhoto, resumePendingPhotos, type UploadDependencies } from '../uploadQueue'
import type { CasePhoto, PendingPhoto } from '../types'

jest.mock('../photoService', () => ({
  reserveCasePhoto: jest.fn(),
  uploadPhotoFile: jest.fn(),
  confirmCasePhoto: jest.fn(),
  isAlreadyUploaded: (error: { statusCode?: string; message?: string }) =>
    error.statusCode === '409' || /already exists/i.test(error.message ?? ''),
}))
jest.mock('expo-sqlite/kv-store', () => ({
  __esModule: true,
  default: {
    getAllKeysAsync: jest.fn(),
    getItemAsync: jest.fn(),
    setItemAsync: jest.fn(),
    removeItemAsync: jest.fn(),
  },
}))

const entry: PendingPhoto = {
  localId: 'local',
  userId: 'tech',
  caseId: 'case',
  kind: 'despues',
  fullUri: 'file:///full.jpg',
  thumbUri: 'file:///thumb.jpg',
  reservation: null,
  fullUploaded: false,
  thumbUploaded: false,
  attempts: 0,
  status: 'queued',
  error: null,
}

const photo: CasePhoto = {
  id: 'photo',
  caseId: 'case',
  kind: 'despues',
  imagePath: 'full.jpg',
  thumbPath: 'thumb.jpg',
  uploadedBy: 'tech',
  createdAt: '',
  confirmedAt: '',
}

function dependencies(): UploadDependencies {
  return {
    reserve: jest.fn().mockResolvedValue({
      id: 'photo',
      bucket: 'case-media',
      imagePath: 'full.jpg',
      thumbPath: 'thumb.jpg',
    }),
    upload: jest.fn().mockResolvedValue(undefined),
    confirm: jest.fn().mockResolvedValue(photo),
    save: jest.fn().mockResolvedValue(undefined),
    finish: jest.fn().mockResolvedValue(undefined),
    wait: jest.fn().mockResolvedValue(undefined),
  }
}

test('reserva, sube dos archivos y confirma antes de limpiar la cola', async () => {
  const deps = dependencies()
  await expect(processPendingPhoto(entry, deps)).resolves.toEqual(photo)
  expect(deps.reserve).toHaveBeenCalledWith('case', 'despues')
  expect(deps.upload).toHaveBeenCalledTimes(2)
  expect(deps.confirm).toHaveBeenCalledWith('photo')
  expect(deps.finish).toHaveBeenCalledTimes(1)
})

test('reintenta errores de red con espera creciente', async () => {
  const deps = dependencies()
  const upload = deps.upload as jest.Mock
  upload.mockRejectedValueOnce(new Error('Network request failed'))
  await processPendingPhoto(entry, deps)
  expect(deps.wait).toHaveBeenCalledWith(2000)
  expect(upload).toHaveBeenCalledTimes(3)
})

test('renueva una reserva vencida y reutiliza los archivos locales', async () => {
  const deps = dependencies()
  const confirm = deps.confirm as jest.Mock
  confirm.mockRejectedValueOnce(new Error('La reserva de la foto venció; vuelve a subirla'))
  await processPendingPhoto(entry, deps)
  expect(deps.reserve).toHaveBeenCalledTimes(2)
  expect(deps.upload).toHaveBeenCalledTimes(4)
})

test('un archivo ya subido continúa a la confirmación', async () => {
  const deps = dependencies()
  ;(deps.upload as jest.Mock).mockRejectedValueOnce({
    statusCode: '409',
    message: 'Asset Already Exists',
  })
  await processPendingPhoto(entry, deps)
  expect(deps.confirm).toHaveBeenCalledTimes(1)
})

test('un error de negocio no se reintenta y queda guardado', async () => {
  const deps = dependencies()
  ;(deps.reserve as jest.Mock).mockRejectedValueOnce(
    new Error('Solo se permiten 3 fotos de después'),
  )
  await expect(processPendingPhoto(entry, deps)).rejects.toThrow('Solo se permiten 3 fotos')
  expect(deps.wait).not.toHaveBeenCalled()
  expect(deps.finish).not.toHaveBeenCalled()
  expect(deps.save).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'error' }))
})

test('el reinicio y la reconexión no reintentan errores de negocio automáticamente', async () => {
  ;(Storage.getAllKeysAsync as jest.Mock).mockResolvedValue(['pending-photo:local'])
  ;(Storage.getItemAsync as jest.Mock).mockResolvedValue(
    JSON.stringify({
      ...entry,
      status: 'error',
      error: 'Solo se permiten 3 fotos de después',
      retryOnReconnect: false,
    }),
  )
  await resumePendingPhotos('tech')
  await resumePendingPhotos('tech', undefined, 'reconnect')
  expect(Storage.setItemAsync).not.toHaveBeenCalled()
})
