import { File } from 'expo-file-system'
import { supabase } from '@/services/supabase/client'

import {
  confirmCasePhoto,
  deleteCasePhoto,
  getSignedPhotoUrl,
  isAlreadyUploaded,
  listCasePhotos,
  reserveCasePhoto,
  uploadPhotoFile,
} from '../photoService'

jest.mock('expo-file-system', () => ({ File: jest.fn() }))
jest.mock('@/services/supabase/client', () => ({
  supabase: { from: jest.fn(), rpc: jest.fn(), storage: { from: jest.fn() } },
}))

const from = supabase.from as jest.Mock
const rpc = supabase.rpc as jest.Mock
const storageFrom = supabase.storage.from as jest.Mock
const file = File as unknown as jest.Mock
const query = { select: jest.fn(), eq: jest.fn(), order: jest.fn() }
const bucket = { upload: jest.fn(), remove: jest.fn(), createSignedUrl: jest.fn() }
const row = {
  id: 'photo-1',
  case_id: 'case-1',
  kind: 'despues',
  image_path: 'full.jpg',
  thumb_path: 'thumb.jpg',
  uploaded_by: 'user-1',
  confirmed_at: '2026-09-24',
  created_at: '2026-09-24',
}

beforeEach(() => {
  jest.clearAllMocks()
  from.mockReturnValue(query)
  storageFrom.mockReturnValue(bucket)
  query.select.mockReturnValue(query)
  query.eq.mockReturnValue(query)
  query.order.mockResolvedValue({
    data: [row, { ...row, id: 'pending', confirmed_at: null }],
    error: null,
  })
})

test('lista solo fotos confirmadas y mapea las rutas', async () => {
  await expect(listCasePhotos('case-1')).resolves.toMatchObject([
    { id: 'photo-1', thumbPath: 'thumb.jpg' },
  ])
  expect(query.eq).toHaveBeenCalledWith('case_id', 'case-1')
})

test('reserva y confirma por RPC con argumentos del contrato', async () => {
  rpc.mockResolvedValueOnce({
    data: { id: 'photo-1', bucket: 'case-media', image_path: 'full.jpg', thumb_path: 'thumb.jpg' },
    error: null,
  })
  await expect(reserveCasePhoto('case-1', 'despues')).resolves.toMatchObject({
    imagePath: 'full.jpg',
  })
  expect(rpc).toHaveBeenCalledWith('reserve_case_photo', {
    target_case_id: 'case-1',
    photo_kind: 'despues',
  })
  rpc.mockResolvedValueOnce({ data: row, error: null })
  await expect(confirmCasePhoto('photo-1')).resolves.toMatchObject({
    id: 'photo-1',
    confirmedAt: '2026-09-24',
  })
  expect(rpc).toHaveBeenCalledWith('confirm_case_photo', { target_photo_id: 'photo-1' })
})

test('sube JPEG sin sobrescribir y borra Storage antes de la fila', async () => {
  const contents = new ArrayBuffer(1)
  file.mockImplementation(() => ({ arrayBuffer: async () => contents }))
  bucket.upload.mockResolvedValue({ error: null })
  await uploadPhotoFile('full.jpg', 'file://full.jpg')
  expect(bucket.upload).toHaveBeenCalledWith('full.jpg', contents, {
    contentType: 'image/jpeg',
    upsert: false,
  })
  bucket.remove.mockResolvedValue({ error: null })
  rpc.mockResolvedValue({ error: null })
  await deleteCasePhoto({
    id: 'photo-1',
    caseId: 'case-1',
    kind: 'despues',
    imagePath: 'full.jpg',
    thumbPath: 'thumb.jpg',
    uploadedBy: 'user-1',
    confirmedAt: '2026-09-24',
    createdAt: '2026-09-24',
  })
  expect(bucket.remove).toHaveBeenCalledWith(['full.jpg', 'thumb.jpg'])
  expect(rpc).toHaveBeenCalledWith('delete_case_photo', { target_photo_id: 'photo-1' })
  expect(bucket.remove.mock.invocationCallOrder[0]).toBeLessThan(rpc.mock.invocationCallOrder[0]!)
})

test('no borra la fila si Storage rechaza el borrado', async () => {
  bucket.remove.mockResolvedValue({ error: new Error('Storage') })
  await expect(
    deleteCasePhoto({
      id: 'photo-1',
      caseId: 'case-1',
      kind: 'despues',
      imagePath: 'full.jpg',
      thumbPath: 'thumb.jpg',
      uploadedBy: 'user-1',
      confirmedAt: '2026-09-24',
      createdAt: '2026-09-24',
    }),
  ).rejects.toThrow('Storage')
  expect(rpc).not.toHaveBeenCalled()
})

test('genera URL firmada por cinco minutos y reconoce respuestas perdidas', async () => {
  bucket.createSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://photo' }, error: null })
  await expect(getSignedPhotoUrl('thumb.jpg')).resolves.toBe('https://photo')
  expect(bucket.createSignedUrl).toHaveBeenCalledWith('thumb.jpg', 300)
  expect(isAlreadyUploaded({ statusCode: '409' })).toBe(true)
  expect(isAlreadyUploaded(new Error('The resource already exists'))).toBe(true)
  expect(isAlreadyUploaded(new Error('Forbidden'))).toBe(false)
})
