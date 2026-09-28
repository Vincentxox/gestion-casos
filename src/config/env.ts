import { z } from 'zod'

const localHosts = new Set(['localhost', '127.0.0.1', '10.0.2.2'])

function decodeBase64Url(value: string): string | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value) || value.length % 4 === 1) return null

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
  let decoded = ''

  for (let index = 0; index < value.length; index += 4) {
    const first = alphabet.indexOf(value.charAt(index))
    const second = alphabet.indexOf(value.charAt(index + 1))
    const third = value.charAt(index + 2) ? alphabet.indexOf(value.charAt(index + 2)) : 0
    const fourth = value.charAt(index + 3) ? alphabet.indexOf(value.charAt(index + 3)) : 0
    const bits = (first << 18) | (second << 12) | (third << 6) | fourth

    decoded += String.fromCharCode((bits >> 16) & 255)
    if (value.charAt(index + 2)) decoded += String.fromCharCode((bits >> 8) & 255)
    if (value.charAt(index + 3)) decoded += String.fromCharCode(bits & 255)
  }

  return decoded
}

function isPublicSupabaseKey(value: string): boolean {
  if (/^sb_publishable_[A-Za-z0-9_-]+$/.test(value)) return true

  const parts = value.split('.')
  if (
    parts.length !== 3 ||
    !/^[A-Za-z0-9_-]+$/.test(parts[0] ?? '') ||
    !/^[A-Za-z0-9_-]+$/.test(parts[2] ?? '')
  ) {
    return false
  }

  const payload = decodeBase64Url(parts[1] ?? '')
  if (!payload) return false

  try {
    const claims: unknown = JSON.parse(payload)
    return (
      typeof claims === 'object' && claims !== null && 'role' in claims && claims.role === 'anon'
    )
  } catch {
    return false
  }
}

const publicEnvironmentSchema = z.object({
  EXPO_PUBLIC_SUPABASE_URL: z
    .url('EXPO_PUBLIC_SUPABASE_URL debe ser una URL válida')
    .refine((value) => {
      const url = new URL(value)
      return url.protocol === 'https:' || localHosts.has(url.hostname)
    }, 'Supabase debe utilizar HTTPS fuera del entorno local'),
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z
    .string()
    .trim()
    .min(20, 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY no es válida')
    .refine(
      isPublicSupabaseKey,
      'Nunca utilices una clave secreta o service_role en la aplicación móvil',
    ),
})

export interface PublicEnvironment {
  supabaseUrl: string
  supabasePublishableKey: string
}

export function parsePublicEnvironment(
  values: Record<string, string | undefined>,
): PublicEnvironment {
  const result = publicEnvironmentSchema.safeParse(values)

  if (!result.success) {
    const details = result.error.issues.map((issue) => issue.message).join('; ')
    throw new Error(`Configuración pública inválida: ${details}`)
  }

  return {
    supabaseUrl: result.data.EXPO_PUBLIC_SUPABASE_URL,
    supabasePublishableKey: result.data.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  }
}

export function getPublicEnvironment(): PublicEnvironment {
  return parsePublicEnvironment({
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  })
}

export function hasPublicEnvironmentConfiguration(): boolean {
  try {
    getPublicEnvironment()
    return true
  } catch {
    return false
  }
}
