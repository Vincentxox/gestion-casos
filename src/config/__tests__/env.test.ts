import { parsePublicEnvironment } from '../env'

const validEnvironment = {
  EXPO_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_example_key_123456789',
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
})
