import { parsePublicEnvironment } from '../env'

const validEnvironment = {
  EXPO_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_example_key_123456789',
}

function keyWithRole(role: string): string {
  const header = btoa('{"alg":"HS256","typ":"JWT"}').replace(/=+$/, '')
  const payload = btoa(JSON.stringify({ role })).replace(/=+$/, '')
  return `${header}.${payload}.fake_signature`
}

describe('configuración pública', () => {
  test('acepta una URL segura y una clave publicable', () => {
    expect(parsePublicEnvironment(validEnvironment)).toEqual({
      supabaseUrl: validEnvironment.EXPO_PUBLIC_SUPABASE_URL,
      supabasePublishableKey: validEnvironment.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    })
  })

  test('rechaza variables obligatorias ausentes', () => {
    expect(() => parsePublicEnvironment({})).toThrow('Configuración pública inválida')
  })

  test('rechaza conexiones inseguras fuera del entorno local', () => {
    expect(() =>
      parsePublicEnvironment({
        ...validEnvironment,
        EXPO_PUBLIC_SUPABASE_URL: 'http://example.supabase.co',
      }),
    ).toThrow('Supabase debe utilizar HTTPS')
  })

  test('rechaza claves secretas en el cliente móvil', () => {
    expect(() =>
      parsePublicEnvironment({
        ...validEnvironment,
        EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_example_key_123456789',
      }),
    ).toThrow('Nunca utilices una clave secreta')
  })

  test('acepta una clave JWT heredada con rol anon', () => {
    const anonKey = keyWithRole('anon')
    expect(
      parsePublicEnvironment({
        ...validEnvironment,
        EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: anonKey,
      }).supabasePublishableKey,
    ).toBe(anonKey)
  })

  test('rechaza una clave JWT heredada con rol service_role', () => {
    expect(() =>
      parsePublicEnvironment({
        ...validEnvironment,
        EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: keyWithRole('service_role'),
      }),
    ).toThrow('Nunca utilices una clave secreta')
  })

  test.each(['opaque_key_123456789012345', 'header.not-base64!.signature', 'a.e30.c'])(
    'rechaza una clave no publicable: %s',
    (key) => {
      expect(() =>
        parsePublicEnvironment({
          ...validEnvironment,
          EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key,
        }),
      ).toThrow('Nunca utilices una clave secreta')
    },
  )
})
