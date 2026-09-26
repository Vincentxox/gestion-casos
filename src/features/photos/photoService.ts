import { File } from 'expo-file-system'

import { supabase } from '@/services/supabase/client'

import type { CasePhoto, PhotoKind, PhotoReservation } from './types'

interface PhotoRow {
  id: string
  case_id: string
  kind: PhotoKind
  image_path: string
  thumb_path: string
  uploaded_by: string
  confirmed_at: string | null
  created_at: string
}

function mapPhoto(row: PhotoRow): CasePhoto {
  return {
    id: row.id,
    caseId: row.case_id,
    kind: row.kind,
    imagePath: row.image_path,
    thumbPath: row.thumb_path,
    uploadedBy: row.uploaded_by,
    confirmedAt: row.confirmed_at,
    createdAt: row.created_at,
  }
}

export async function listCasePhotos(caseId: string): Promise<CasePhoto[]> {
  const { data, error } = await supabase
    .from('case_photos')
    .select('id, case_id, kind, image_path, thumb_path, uploaded_by, confirmed_at, created_at')
    .eq('case_id', caseId)
    .order('created_at')
  if (error) throw error
  return (data as PhotoRow[]).filter((row) => row.confirmed_at !== null).map(mapPhoto)
}

export async function reserveCasePhoto(caseId: string, kind: PhotoKind) {
  const { data, error } = await supabase.rpc('reserve_case_photo', {
    target_case_id: caseId,
    photo_kind: kind,
  })
  if (error) throw error
  const reservation = data as {
    id: string
    bucket: string
    image_path: string
    thumb_path: string
  }
  return {
    id: reservation.id,
    bucket: reservation.bucket,
    imagePath: reservation.image_path,
    thumbPath: reservation.thumb_path,
  } satisfies PhotoReservation
}

export async function uploadPhotoFile(path: string, uri: string): Promise<void> {
  const contents = await new File(uri).arrayBuffer()
  const { error } = await supabase.storage.from('case-media').upload(path, contents, {
    contentType: 'image/jpeg',
    upsert: false,
  })
  if (error) throw error
}

export function isAlreadyUploaded(error: unknown) {
  const candidate = error as { statusCode?: string | number; message?: string }
  return (
    String(candidate?.statusCode) === '409' ||
    /already exists|resource already exists/i.test(candidate?.message ?? '')
  )
}

export async function confirmCasePhoto(photoId: string): Promise<CasePhoto> {
  const { data, error } = await supabase.rpc('confirm_case_photo', { target_photo_id: photoId })
  if (error) throw error
  return mapPhoto(data as PhotoRow)
}

export async function deleteCasePhoto(photo: CasePhoto): Promise<void> {
  const { error: storageError } = await supabase.storage
    .from('case-media')
    .remove([photo.imagePath, photo.thumbPath])
  if (storageError) throw storageError
  const { error } = await supabase.rpc('delete_case_photo', { target_photo_id: photo.id })
  if (error) throw error
}

export async function getSignedPhotoUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from('case-media').createSignedUrl(path, 300)
  if (error) throw error
  return data.signedUrl
}
