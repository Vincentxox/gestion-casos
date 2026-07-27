import * as SecureStore from 'expo-secure-store'

import { secureSessionStorage } from '../secureStorage'

jest.mock('expo-secure-store', () => {
  const values = new Map<string, string>()

  return {
    __mockValues: values,
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 1,
    getItemAsync: jest.fn(async (key: string) => values.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      values.set(key, value)
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      values.delete(key)
    }),
  }
})

const mockValues = (
  SecureStore as typeof SecureStore & {
    __mockValues: Map<string, string>
  }
).__mockValues

describe('almacenamiento seguro de sesión', () => {
  beforeEach(() => {
    mockValues.clear()
    jest.clearAllMocks()
  })

  test('guarda y reconstruye valores grandes en fragmentos', async () => {
    const value = 'sesion-segura-'.repeat(200)

    await secureSessionStorage.setItem('auth-token', value)

    await expect(secureSessionStorage.getItem('auth-token')).resolves.toBe(value)
    expect(mockValues.size).toBeGreaterThan(2)
  })

  test('devuelve null cuando no existe información de sesión', async () => {
    await expect(secureSessionStorage.getItem('missing-token')).resolves.toBeNull()
  })

  test('devuelve null si falta un fragmento', async () => {
    await secureSessionStorage.setItem('auth-token', 'a'.repeat(1000))
    mockValues.delete('auth-token.1')

    await expect(secureSessionStorage.getItem('auth-token')).resolves.toBeNull()
  })

  test('elimina fragmentos sobrantes al reemplazar un valor', async () => {
    await secureSessionStorage.setItem('auth-token', 'a'.repeat(1500))
    await secureSessionStorage.setItem('auth-token', 'nuevo-valor')

    await expect(secureSessionStorage.getItem('auth-token')).resolves.toBe('nuevo-valor')
    expect(mockValues.has('auth-token.1')).toBe(false)
  })

  test('elimina completamente una sesión', async () => {
    await secureSessionStorage.setItem('auth-token', 'a'.repeat(1000))
    await secureSessionStorage.removeItem('auth-token')

    await expect(secureSessionStorage.getItem('auth-token')).resolves.toBeNull()
    expect(mockValues.size).toBe(0)
  })
})
