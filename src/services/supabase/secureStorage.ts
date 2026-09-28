import type { SupportedStorage } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'

const CHUNK_SIZE = 450
const META_SUFFIX = '.meta'

const secureStoreOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
}

function chunkKey(key: string, index: number) {
  return `${key}.${index}`
}

async function getChunkCount(key: string) {
  const value = await SecureStore.getItemAsync(`${key}${META_SUFFIX}`, secureStoreOptions)
  const count = Number(value)

  return Number.isInteger(count) && count > 0 ? count : 0
}

/**
 * Adapta SecureStore al contrato de almacenamiento de Supabase Auth.
 * La segmentación evita exceder límites de tamaño del llavero del dispositivo.
 */
export const secureSessionStorage: SupportedStorage = {
  async getItem(key) {
    const count = await getChunkCount(key)

    if (count === 0) {
      return null
    }

    const chunks = await Promise.all(
      Array.from({ length: count }, (_, index) =>
        SecureStore.getItemAsync(chunkKey(key, index), secureStoreOptions),
      ),
    )

    return chunks.every((chunk): chunk is string => chunk !== null) ? chunks.join('') : null
  },

  async setItem(key, value) {
    const previousCount = await getChunkCount(key)
    const chunks = Array.from({ length: Math.ceil(value.length / CHUNK_SIZE) }, (_, index) =>
      value.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE),
    )

    await Promise.all(
      chunks.map((chunk, index) =>
        SecureStore.setItemAsync(chunkKey(key, index), chunk, secureStoreOptions),
      ),
    )

    await Promise.all(
      Array.from({ length: Math.max(previousCount - chunks.length, 0) }, (_, index) =>
        SecureStore.deleteItemAsync(chunkKey(key, chunks.length + index), secureStoreOptions),
      ),
    )

    await SecureStore.setItemAsync(
      `${key}${META_SUFFIX}`,
      String(chunks.length),
      secureStoreOptions,
    )
  },

  async removeItem(key) {
    const count = await getChunkCount(key)

    await Promise.all(
      Array.from({ length: count }, (_, index) =>
        SecureStore.deleteItemAsync(chunkKey(key, index), secureStoreOptions),
      ),
    )

    await SecureStore.deleteItemAsync(`${key}${META_SUFFIX}`, secureStoreOptions)
  },
}
