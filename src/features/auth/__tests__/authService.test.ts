import type { Session } from '@supabase/supabase-js'

import { supabase } from '@/services/supabase/client'

import {
  getCurrentSession,
  getProfile,
  resolveSessionProfile,
  signIn,
  signOut,
  signUp,
} from '../authService'

jest.mock('@/services/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
    },
    from: jest.fn(),
  },
}))

const auth = supabase.auth as unknown as {
  getSession: jest.Mock
  signInWithPassword: jest.Mock
  signUp: jest.Mock
  signOut: jest.Mock
}
const from = supabase.from as unknown as jest.Mock

const session = {
  user: { id: 'user-1' },
} as Session

describe('servicio de autenticación', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('recupera la sesión actual', async () => {
    auth.getSession.mockResolvedValue({ data: { session }, error: null })

    await expect(getCurrentSession()).resolves.toBe(session)
  })

  test('propaga errores al recuperar la sesión', async () => {
    const error = new Error('session error')
    auth.getSession.mockResolvedValue({ data: { session: null }, error })

    await expect(getCurrentSession()).rejects.toBe(error)
  })

  test('normaliza el correo al iniciar sesión', async () => {
    auth.signInWithPassword.mockResolvedValue({ data: { session }, error: null })

    await expect(signIn('  USER@EXAMPLE.COM ', 'Password1!')).resolves.toBe(session)
    expect(auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'Password1!',
    })
  })

  test('propaga errores de inicio de sesión', async () => {
    const error = new Error('login error')
    auth.signInWithPassword.mockResolvedValue({ data: {}, error })

    await expect(signIn('user@example.com', 'Password1!')).rejects.toBe(error)
  })

  test('registra el nombre como metadato sin aceptar un rol', async () => {
    const data = { user: session.user, session: null }
    auth.signUp.mockResolvedValue({ data, error: null })

    await expect(signUp(' USER@EXAMPLE.COM ', 'Password1!', ' Usuario ')).resolves.toBe(data)
    expect(auth.signUp).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'Password1!',
      options: {
        data: {
          full_name: 'Usuario',
        },
      },
    })
  })

  test('propaga errores de registro', async () => {
    const error = new Error('signup error')
    auth.signUp.mockResolvedValue({ data: {}, error })

    await expect(signUp('user@example.com', 'Password1!', 'Usuario')).rejects.toBe(error)
  })

  test('cierra la sesión', async () => {
    auth.signOut.mockResolvedValue({ error: null })

    await expect(signOut()).resolves.toBeUndefined()
  })

  test('propaga errores de cierre de sesión', async () => {
    const error = new Error('signout error')
    auth.signOut.mockResolvedValue({ error })

    await expect(signOut()).rejects.toBe(error)
  })

  test('mapea un perfil válido', async () => {
    const single = jest.fn().mockResolvedValue({
      data: {
        id: 'user-1',
        full_name: 'Usuario',
        avatar_url: null,
        role: 'auditor',
      },
      error: null,
    })
    const eq = jest.fn().mockReturnValue({ single })
    const select = jest.fn().mockReturnValue({ eq })
    from.mockReturnValue({ select })

    await expect(getProfile('user-1')).resolves.toEqual({
      id: 'user-1',
      fullName: 'Usuario',
      avatarUrl: null,
      role: 'auditor',
    })
  })

  test('rechaza roles desconocidos', async () => {
    const single = jest.fn().mockResolvedValue({
      data: {
        id: 'user-1',
        full_name: 'Usuario',
        avatar_url: null,
        role: 'superadmin',
      },
      error: null,
    })
    const eq = jest.fn().mockReturnValue({ single })
    const select = jest.fn().mockReturnValue({ eq })
    from.mockReturnValue({ select })

    await expect(getProfile('user-1')).rejects.toThrow('rol no reconocido')
  })

  test('propaga errores al consultar el perfil', async () => {
    const error = new Error('profile error')
    const single = jest.fn().mockResolvedValue({ data: null, error })
    const eq = jest.fn().mockReturnValue({ single })
    const select = jest.fn().mockReturnValue({ eq })
    from.mockReturnValue({ select })

    await expect(getProfile('user-1')).rejects.toBe(error)
  })

  test('resuelve el perfil únicamente cuando existe una sesión', async () => {
    await expect(resolveSessionProfile(null)).resolves.toBeNull()
  })
})
