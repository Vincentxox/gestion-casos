import type { Session } from '@supabase/supabase-js'

import { supabase } from '@/services/supabase/client'

import {
  getCurrentSession,
  getProfile,
  resolveSessionProfile,
  signIn,
  signInWithGoogle,
  signOut,
  signUp,
} from '../authService'

jest.mock('@/services/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      signInWithPassword: jest.fn(),
      signInWithOAuth: jest.fn(),
      setSession: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
    },
    from: jest.fn(),
  },
}))

jest.mock('expo-auth-session', () => ({
  makeRedirectUri: jest.fn(() => 'gestion-casos://auth/callback'),
}))

jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
  openAuthSessionAsync: jest.fn(),
}))

const webBrowser = jest.requireMock('expo-web-browser') as {
  openAuthSessionAsync: jest.Mock
}

const auth = supabase.auth as unknown as {
  getSession: jest.Mock
  signInWithPassword: jest.Mock
  signInWithOAuth: jest.Mock
  setSession: jest.Mock
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

  test('inicia sesión con Google y establece la sesión devuelta', async () => {
    auth.signInWithOAuth.mockResolvedValue({
      data: { url: 'https://example.supabase.co/auth/v1/authorize' },
      error: null,
    })
    webBrowser.openAuthSessionAsync.mockResolvedValue({
      type: 'success',
      url: 'gestion-casos://auth/callback#access_token=access&refresh_token=refresh',
    })
    auth.setSession.mockResolvedValue({ data: { session }, error: null })

    await expect(signInWithGoogle()).resolves.toBe(session)
    expect(auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: 'gestion-casos://auth/callback',
        skipBrowserRedirect: true,
      },
    })
    expect(auth.setSession).toHaveBeenCalledWith({
      access_token: 'access',
      refresh_token: 'refresh',
    })
  })

  test('no crea una sesión cuando el usuario cancela Google', async () => {
    auth.signInWithOAuth.mockResolvedValue({
      data: { url: 'https://example.supabase.co/auth/v1/authorize' },
      error: null,
    })
    webBrowser.openAuthSessionAsync.mockResolvedValue({ type: 'cancel' })

    await expect(signInWithGoogle()).resolves.toBeNull()
    expect(auth.setSession).not.toHaveBeenCalled()
  })

  test('propaga errores al iniciar la autorización con Google', async () => {
    const error = new Error('oauth error')
    auth.signInWithOAuth.mockResolvedValue({ data: {}, error })

    await expect(signInWithGoogle()).rejects.toBe(error)
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
        area_id: 'area-1',
        area: { name: 'Tecnología' },
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
      areaId: 'area-1',
      areaName: 'Tecnología',
    })
  })

  test('rechaza roles desconocidos', async () => {
    const single = jest.fn().mockResolvedValue({
      data: {
        id: 'user-1',
        full_name: 'Usuario',
        avatar_url: null,
        role: 'superadmin',
        area_id: null,
        area: null,
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
