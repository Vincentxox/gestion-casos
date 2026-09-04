import { z } from 'zod'

const localHosts = new Set(['localhost', '127.0.0.1', '10.0.2.2'])

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
      (value) => !value.startsWith('sb_secret_') && !value.toLowerCase().includes('service_role'),
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
