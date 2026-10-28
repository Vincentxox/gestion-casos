import type { SupportedStorage } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'

const CHUNK_SIZE = 450
const META_SUFFIX = '.meta'

const secureStoreOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
}

type ChunkLayout = {
  count: number
  /** `null` es el formato anterior, con fragmentos `${key}.${index}`. */
  slot: number | null
}

function chunkKey(key: string, layout: ChunkLayout, index: number) {
  return layout.slot === null ? `${key}.${index}` : `${key}.${layout.slot}.${index}`
}

/** Lee el metadato `N` (formato anterior) o `N:ranura`. */
async function getChunkLayout(key: string): Promise<ChunkLayout> {
  const value = await SecureStore.getItemAsync(`${key}${META_SUFFIX}`, secureStoreOptions)
  const [countText, slotText] = (value ?? '').split(':')
  const count = Number(countText)
  const slot = slotText === undefined ? null : Number(slotText)

  if (!Number.isInteger(count) || count <= 0 || (slot !== null && slot !== 0 && slot !== 1)) {
    return { count: 0, slot: null }
  }

  return { count, slot }
}

function deleteChunks(key: string, layout: ChunkLayout) {
  return Promise.all(
    Array.from({ length: layout.count }, (_, index) =>
      SecureStore.deleteItemAsync(chunkKey(key, layout, index), secureStoreOptions),
    ),
  )
}

/**
 * Adapta SecureStore al contrato de almacenamiento de Supabase Auth.
 * La segmentación evita exceder límites de tamaño del llavero del dispositivo.
 */
export const secureSessionStorage: SupportedStorage = {
  async getItem(key) {
    const layout = await getChunkLayout(key)

    if (layout.count === 0) {
      return null
    }

    const chunks = await Promise.all(
      Array.from({ length: layout.count }, (_, index) =>
        SecureStore.getItemAsync(chunkKey(key, layout, index), secureStoreOptions),
      ),
    )

    return chunks.every((chunk): chunk is string => chunk !== null) ? chunks.join('') : null
  },

  /**
   * Escribe la sesión nueva en la ranura libre y solo después cambia el metadato.
   * Si la app se cierra a mitad de la escritura, el metadato sigue apuntando a la
   * sesión anterior completa y el usuario no pierde la sesión.
   */
  async setItem(key, value) {
    const previous = await getChunkLayout(key)
    const chunks = Array.from({ length: Math.ceil(value.length / CHUNK_SIZE) }, (_, index) =>
      value.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE),
    )
    const next: ChunkLayout = { count: chunks.length, slot: previous.slot === 0 ? 1 : 0 }

    await Promise.all(
      chunks.map((chunk, index) =>
        SecureStore.setItemAsync(chunkKey(key, next, index), chunk, secureStoreOptions),
      ),
    )

    await SecureStore.setItemAsync(
      `${key}${META_SUFFIX}`,
      `${next.count}:${next.slot}`,
      secureStoreOptions,
    )

    await deleteChunks(key, previous)
  },

  async removeItem(key) {
    const layout = await getChunkLayout(key)

    await SecureStore.deleteItemAsync(`${key}${META_SUFFIX}`, secureStoreOptions)
    await deleteChunks(key, layout)
  },
}
