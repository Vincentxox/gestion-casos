import { AuthApiError } from '@supabase/supabase-js'

import { getAuthErrorMessage } from '../authErrors'

describe('mensajes de errores de autenticación', () => {
  test('traduce credenciales inválidas sin exponer detalles técnicos', () => {
    const error = new AuthApiError('Invalid login credentials', 400, 'invalid_credentials')

    expect(getAuthErrorMessage(error, 'Error inesperado')).toBe(
      'El correo o la contraseña son incorrectos.',
    )
  })

  test('explica cuando el correo todavía no fue confirmado', () => {
    const error = new AuthApiError('Email not confirmed', 400, 'email_not_confirmed')

    expect(getAuthErrorMessage(error, 'Error inesperado')).toBe(
      'Confirma tu correo electrónico antes de iniciar sesión.',
    )
  })

  test('ofrece una acción comprensible ante fallos de red', () => {
    expect(getAuthErrorMessage(new TypeError('Network request failed'), 'Error inesperado')).toBe(
      'No hay conexión con el servicio. Revisa tu internet e inténtalo nuevamente.',
    )
  })

  test('usa el mensaje seguro de respaldo para errores desconocidos', () => {
    expect(getAuthErrorMessage(new Error('detalle interno'), 'Error inesperado')).toBe(
      'Error inesperado',
    )
  })
})
