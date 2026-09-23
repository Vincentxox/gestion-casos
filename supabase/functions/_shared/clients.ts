// Clientes de Supabase para Edge Functions. Las claves las provee la plataforma como
// variables de entorno del servidor; nunca se envían a la app ni se escriben en logs.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'

function requireEnv(name: string): string {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`Falta la variable de entorno ${name}`)
  return value
}

// Actúa como la persona que llama: aplica RLS con su sesión.
export function userClient(authorization: string): SupabaseClient {
  return createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

// Solo para tareas del servidor ya autorizadas (leer evidencia, subir el PDF, enviar push).
export function serviceClient(): SupabaseClient {
  return createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}
