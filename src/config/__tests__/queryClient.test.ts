import { shouldRetryQuery } from '../queryClient'

describe('reintentos de consultas', () => {
  test('no repite errores HTTP 4xx ni errores de permisos de Postgres', () => {
    expect(shouldRetryQuery(0, { status: 404 })).toBe(false)
    expect(shouldRetryQuery(0, { statusCode: '403' })).toBe(false)
    expect(shouldRetryQuery(0, { context: { status: 401 } })).toBe(false)
    expect(shouldRetryQuery(0, { code: '42501' })).toBe(false)
    expect(shouldRetryQuery(0, { code: 'PGRST116' })).toBe(false)
    expect(shouldRetryQuery(0, { message: 'permission denied for table cases' })).toBe(false)
  })

  test('reintenta fallos temporales hasta tres veces', () => {
    expect(shouldRetryQuery(0, new Error('Failed to fetch'))).toBe(true)
    expect(shouldRetryQuery(2, { status: 503 })).toBe(true)
    expect(shouldRetryQuery(3, { status: 503 })).toBe(false)
  })
})
