import * as Crypto from 'expo-crypto'
import { File } from 'expo-file-system'

import { supabase } from '@/services/supabase/client'
import {
  clearOwnProfilePhoto,
  getSignedProfilePhotoUrl,
  uploadOwnProfilePhoto,
} from '../profilePhotoService'

jest.mock('expo-crypto', () => ({ randomUUID: jest.fn(() => 'new-id') }))
jest.mock('expo-file-system', () => ({ File: jest.fn() }))
jest.mock('@/services/supabase/client', () => ({
  supabase: { storage: { from: jest.fn() }, rpc: jest.fn() },
}))

const upload = jest.fn()
const remove = jest.fn()
const createSignedUrl = jest.fn()
const rpc = supabase.rpc as jest.Mock

beforeEach(() => {
  jest.clearAllMocks()
  ;(supabase.storage.from as jest.Mock).mockReturnValue({ upload, remove, createSignedUrl })
  ;(File as unknown as jest.Mock).mockImplementation(() => ({
    arrayBuffer: async () => new ArrayBuffer(4),
  }))
  upload.mockResolvedValue({ error: null })
  remove.mockResolvedValue({ error: null })
  rpc.mockResolvedValue({ error: null })
})

const profile = { id: 'user', organizationId: 'org', avatarUrl: 'org/user/old.jpg' }

test('sube a una ruta nueva, elige mediante RPC y borra la anterior', async () => {
  await expect(uploadOwnProfilePhoto(profile, 'file://photo')).resolves.toBe('org/user/new-id.jpg')
  expect(Crypto.randomUUID).toHaveBeenCalled()
  expect(upload).toHaveBeenCalledWith('org/user/new-id.jpg', expect.any(ArrayBuffer), {
    contentType: 'image/jpeg',
    upsert: false,
  })
  expect(rpc).toHaveBeenCalledWith('set_profile_photo', { photo_path: 'org/user/new-id.jpg' })
  expect(remove).toHaveBeenCalledWith(['org/user/old.jpg'])
})

test('si la elección falla, limpia la subida y conserva el error del servidor', async () => {
  rpc.mockResolvedValue({ error: { code: 'P0001', message: 'Acceso denegado' } })
  await expect(uploadOwnProfilePhoto(profile, 'file://photo')).rejects.toMatchObject({
    message: 'Acceso denegado',
  })
  expect(remove).toHaveBeenCalledWith(['org/user/new-id.jpg'])
  expect(remove).not.toHaveBeenCalledWith(['org/user/old.jpg'])
})

test('el fallo al borrar la foto anterior no invalida una elección guardada', async () => {
  remove.mockResolvedValue({ error: new Error('sin conexión') })
  await expect(uploadOwnProfilePhoto(profile, 'file://photo')).resolves.toBe('org/user/new-id.jpg')
})

test('rechaza un perfil sin empresa y propaga el error de subida', async () => {
  await expect(
    uploadOwnProfilePhoto({ ...profile, organizationId: null }, 'file://photo'),
  ).rejects.toThrow('empresa activa')
  upload.mockResolvedValue({ error: new Error('falló la subida') })
  await expect(uploadOwnProfilePhoto(profile, 'file://photo')).rejects.toThrow('falló la subida')
  expect(rpc).not.toHaveBeenCalled()
})

test('quita la foto por RPC y después intenta borrar el archivo', async () => {
  await clearOwnProfilePhoto(profile.avatarUrl)
  expect(rpc).toHaveBeenCalledWith('clear_profile_photo')
  expect(remove).toHaveBeenCalledWith(['org/user/old.jpg'])
  remove.mockResolvedValue({ error: new Error('sin conexión') })
  await expect(clearOwnProfilePhoto(profile.avatarUrl)).resolves.toBeUndefined()
  rpc.mockResolvedValue({ error: { code: 'P0001', message: 'Acceso denegado' } })
  await expect(clearOwnProfilePhoto(profile.avatarUrl)).rejects.toMatchObject({
    message: 'Acceso denegado',
  })
})

test('crea un enlace firmado temporal para el bucket privado', async () => {
  createSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://signed' }, error: null })
  await expect(getSignedProfilePhotoUrl(profile.avatarUrl)).resolves.toBe('https://signed')
  expect(createSignedUrl).toHaveBeenCalledWith(profile.avatarUrl, 300)
})
