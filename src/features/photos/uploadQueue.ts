import { Directory, File, Paths } from 'expo-file-system'
import Storage from 'expo-sqlite/kv-store'

import {
  confirmCasePhoto,
  isAlreadyUploaded,
  reserveCasePhoto,
  uploadPhotoFile,
} from './photoService'
import type { CasePhoto, PendingPhoto, PhotoReservation, PreparedPhoto } from './types'

const PREFIX = 'pending-photo:'
const RETRY_DELAYS = [2000, 8000, 30000]
const pendingDirectory = new Directory(Paths.document, 'pending-photos')

export interface UploadDependencies {
  reserve: (caseId: string, kind: PendingPhoto['kind']) => Promise<PhotoReservation>
  upload: (path: string, uri: string) => Promise<void>
  confirm: (id: string) => Promise<CasePhoto>
  save: (entry: PendingPhoto) => Promise<void>
  finish: (entry: PendingPhoto) => Promise<void>
  wait: (milliseconds: number) => Promise<void>
}

function key(localId: string) {
  return `${PREFIX}${localId}`
}

export async function savePendingPhoto(entry: PendingPhoto) {
  await Storage.setItemAsync(key(entry.localId), JSON.stringify(entry))
}

export async function listPendingPhotos(userId: string, caseId?: string): Promise<PendingPhoto[]> {
  const keys = (await Storage.getAllKeysAsync()).filter((item) => item.startsWith(PREFIX))
  const values = await Promise.all(keys.map((item) => Storage.getItemAsync(item)))
  return values
    .filter((value): value is string => Boolean(value))
    .map((value) => JSON.parse(value) as PendingPhoto)
    .filter((entry) => entry.userId === userId && (!caseId || entry.caseId === caseId))
}

export async function discardPendingPhoto(userId: string, localId: string): Promise<void> {
  if (!/^[a-zA-Z0-9-]+$/.test(localId)) throw new Error('Foto pendiente no válida')
  if (processing.has(localId)) throw new Error('Espera a que termine la subida antes de descartar')
  const raw = await Storage.getItemAsync(key(localId))
  if (!raw) return
  const entry = JSON.parse(raw) as PendingPhoto
  if (entry.userId !== userId) throw new Error('No puedes descartar esta foto')
  if (entry.status !== 'error') throw new Error('Espera a que termine la subida antes de descartar')
  for (const name of [`${localId}-full.jpg`, `${localId}-thumb.jpg`]) {
    const file = new File(pendingDirectory, name)
    if (file.exists) file.delete()
  }
  await Storage.removeItemAsync(key(localId))
}

export async function enqueuePhoto(
  userId: string,
  caseId: string,
  kind: PendingPhoto['kind'],
  prepared: PreparedPhoto,
): Promise<PendingPhoto> {
  pendingDirectory.create({ idempotent: true })
  const localId = `${Date.now()}-${Math.random().toString(36).slice(2)}`
  const full = new File(pendingDirectory, `${localId}-full.jpg`)
  const thumb = new File(pendingDirectory, `${localId}-thumb.jpg`)
  await new File(prepared.fullUri).copy(full)
  await new File(prepared.thumbUri).copy(thumb)
  const entry: PendingPhoto = {
    localId,
    userId,
    caseId,
    kind,
    fullUri: full.uri,
    thumbUri: thumb.uri,
    reservation: null,
    fullUploaded: false,
    thumbUploaded: false,
    attempts: 0,
    status: 'queued',
    error: null,
    retryOnReconnect: false,
  }
  await savePendingPhoto(entry)
  return entry
}

async function finishPendingPhoto(entry: PendingPhoto) {
  await Storage.removeItemAsync(key(entry.localId))
  for (const uri of [entry.fullUri, entry.thumbUri]) {
    const file = new File(uri)
    if (file.exists) file.delete()
  }
}

const defaultDependencies: UploadDependencies = {
  reserve: reserveCasePhoto,
  upload: uploadPhotoFile,
  confirm: confirmCasePhoto,
  save: savePendingPhoto,
  finish: finishPendingPhoto,
  wait: (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
}

function isExpiredReservation(error: unknown) {
  return /La reserva de la foto venció; vuelve a subirla/i.test(
    error instanceof Error ? error.message : String(error),
  )
}

function isTransient(error: unknown) {
  const candidate = error as { statusCode?: string | number; message?: string }
  const status = Number(candidate?.statusCode)
  return (
    status >= 500 ||
    status === 429 ||
    /network|fetch|timeout|connection|sin conexión|internet/i.test(candidate?.message ?? '')
  )
}

export async function processPendingPhoto(
  original: PendingPhoto,
  dependencies: UploadDependencies = defaultDependencies,
): Promise<CasePhoto> {
  const entry: PendingPhoto = {
    ...original,
    status: 'uploading',
    error: null,
    retryOnReconnect: false,
  }
  await dependencies.save(entry)
  let reservationResets = 0
  let retryIndex = 0

  while (true) {
    try {
      if (!entry.reservation) {
        entry.reservation = await dependencies.reserve(entry.caseId, entry.kind)
        await dependencies.save(entry)
      }
      for (const [path, uri, flag] of [
        [entry.reservation.imagePath, entry.fullUri, 'fullUploaded'],
        [entry.reservation.thumbPath, entry.thumbUri, 'thumbUploaded'],
      ] as const) {
        if (entry[flag]) continue
        try {
          await dependencies.upload(path, uri)
        } catch (error) {
          if (!isAlreadyUploaded(error)) throw error
        }
        entry[flag] = true
        await dependencies.save(entry)
      }
      const photo = await dependencies.confirm(entry.reservation.id)
      await dependencies.finish(entry)
      return photo
    } catch (error) {
      if (isExpiredReservation(error) && reservationResets < 2) {
        reservationResets++
        entry.reservation = null
        entry.fullUploaded = false
        entry.thumbUploaded = false
        await dependencies.save(entry)
        continue
      }
      if (isTransient(error) && retryIndex < RETRY_DELAYS.length) {
        entry.attempts++
        await dependencies.save(entry)
        await dependencies.wait(RETRY_DELAYS[retryIndex++]!)
        continue
      }
      entry.status = 'error'
      entry.error = error instanceof Error ? error.message : 'No fue posible subir la foto.'
      entry.retryOnReconnect = isTransient(error)
      await dependencies.save(entry)
      throw error
    }
  }
}

const processing = new Set<string>()

export async function resumePendingPhotos(
  userId: string,
  onComplete?: (caseId: string) => void,
  mode: 'startup' | 'reconnect' | 'manual' = 'startup',
  onlyLocalId?: string,
) {
  const entries = await listPendingPhotos(userId)
  for (const entry of entries) {
    if (onlyLocalId && entry.localId !== onlyLocalId) continue
    if (
      entry.status === 'error' &&
      mode !== 'manual' &&
      !(mode === 'reconnect' && entry.retryOnReconnect)
    )
      continue
    if (processing.has(entry.localId)) continue
    processing.add(entry.localId)
    try {
      await processPendingPhoto(entry)
      onComplete?.(entry.caseId)
    } catch {
      // El error queda guardado para mostrar «Reintentar» en la pantalla.
    } finally {
      processing.delete(entry.localId)
    }
  }
}
