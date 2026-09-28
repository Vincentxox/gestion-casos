import { isAuthApiError } from '@supabase/supabase-js'

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: 'El correo o la contraseña son incorrectos.',
  email_not_confirmed: 'Confirma tu correo electrónico antes de iniciar sesión.',
  email_exists: 'Ya existe una cuenta registrada con este correo electrónico.',
  user_already_exists: 'Ya existe una cuenta registrada con este correo electrónico.',
  email_address_invalid: 'El proveedor no acepta esta dirección de correo electrónico.',
  email_address_not_authorized: 'El servicio de correo aún no está habilitado para esta dirección.',
  email_provider_disabled: 'El registro mediante correo electrónico no está habilitado.',
  provider_disabled: 'El acceso con este proveedor no está habilitado.',
  oauth_provider_not_supported: 'El proveedor de acceso no está disponible.',
  bad_oauth_callback: 'Google no pudo completar el acceso. Inténtalo nuevamente.',
  bad_oauth_state: 'La solicitud de Google expiró o no es válida. Inténtalo nuevamente.',
  flow_state_expired: 'La solicitud de acceso expiró. Inténtalo nuevamente.',
  flow_state_not_found: 'No se encontró la solicitud de acceso. Inténtalo nuevamente.',
  over_email_send_rate_limit: 'Se enviaron demasiados correos. Espera unos minutos y reintenta.',
  over_request_rate_limit: 'Se realizaron demasiados intentos. Espera unos minutos y reintenta.',
}

function isNetworkError(error: unknown) {
  if (!(error instanceof Error)) return false

  return (
    error instanceof TypeError ||
    /network request failed|failed to fetch|network error/i.test(error.message)
  )
}

/** Convierte errores técnicos de Auth en mensajes seguros y útiles para el usuario. */
export function getAuthErrorMessage(error: unknown, fallback: string) {
  if (isAuthApiError(error) && error.code) {
    return AUTH_ERROR_MESSAGES[error.code] ?? fallback
  }

  if (isNetworkError(error)) {
    return 'No hay conexión con el servicio. Revisa tu internet e inténtalo nuevamente.'
  }

  return fallback
}
