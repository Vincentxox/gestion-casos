import * as Crypto from 'expo-crypto'
import { File } from 'expo-file-system'

import { supabase } from '@/services/supabase/client'

const BUCKET = 'profile-photos'
export const PROFILE_PHOTO_URL_SECONDS = 300

export interface OwnPhotoProfile {
  id: string
  organizationId: string | null
  avatarUrl: string | null
}

async function removePhoto(path: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([path])
  if (error) throw error
}

export async function uploadOwnProfilePhoto(
  profile: OwnPhotoProfile,
  uri: string,
): Promise<string> {
  if (!profile.organizationId) throw new Error('Tu perfil no pertenece a una empresa activa.')
  const path = `${profile.organizationId}/${profile.id}/${Crypto.randomUUID()}.jpg`
  const contents = await new File(uri).arrayBuffer()
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, contents, {
    contentType: 'image/jpeg',
    upsert: false,
  })
  if (uploadError) throw uploadError

  const { error: selectionError } = await supabase.rpc('set_profile_photo', { photo_path: path })
  if (selectionError) {
    await removePhoto(path).catch(() => undefined)
    throw selectionError
  }

  if (profile.avatarUrl && profile.avatarUrl !== path) {
    await removePhoto(profile.avatarUrl).catch(() => undefined)
  }
  return path
}

export async function clearOwnProfilePhoto(previousPath: string | null): Promise<void> {
  const { error } = await supabase.rpc('clear_profile_photo')
  if (error) throw error
  if (previousPath) await removePhoto(previousPath).catch(() => undefined)
}

export async function getSignedProfilePhotoUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, PROFILE_PHOTO_URL_SECONDS)
  if (error) throw error
  return data.signedUrl
}
