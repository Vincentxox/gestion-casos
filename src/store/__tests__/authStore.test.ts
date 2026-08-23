import type { Session } from '@supabase/supabase-js'

import {
  getCurrentSession,
  resolveSessionProfile,
  signIn,
  signInWithGoogle,
  signOut,
  signUp,
} from '@/features/auth/authService'
import type { Profile } from '@/features/auth/types'

import { useAuthStore } from '../authStore'

jest.mock('@/features/auth/authService', () => ({
  getCurrentSession: jest.fn(),
  resolveSessionProfile: jest.fn(),
  signIn: jest.fn(),
  signInWithGoogle: jest.fn(),
  signOut: jest.fn(),
  signUp: jest.fn(),
}))

const mockGetCurrentSession = jest.mocked(getCurrentSession)
const mockResolveSessionProfile = jest.mocked(resolveSessionProfile)
const mockSignIn = jest.mocked(signIn)
const mockSignInWithGoogle = jest.mocked(signInWithGoogle)
const mockSignOut = jest.mocked(signOut)
const mockSignUp = jest.mocked(signUp)

const session = {
  user: { id: 'user-1' },
} as Session

const profile: Profile = {
  id: 'user-1',
  fullName: 'Usuario',
  avatarUrl: null,
  role: 'visualizador',
}

describe('estado global de autenticación', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useAuthStore.setState({
      session: null,
      profile: null,
      status: 'initializing',
      initializationError: null,
    })
  })

  test('inicializa una sesión autenticada', async () => {
    mockGetCurrentSession.mockResolvedValue(session)
    mockResolveSessionProfile.mockResolvedValue(profile)

    await useAuthStore.getState().initialize()

    expect(useAuthStore.getState()).toMatchObject({
      session,
      profile,
      status: 'authenticated',
      initializationError: null,
    })
  })

  test('continúa sin autenticar cuando falla la recuperación inicial', async () => {
    mockGetCurrentSession.mockRejectedValue(new Error('network'))

    await useAuthStore.getState().initialize()

    expect(useAuthStore.getState()).toMatchObject({
      session: null,
      profile: null,
      status: 'unauthenticated',
      initializationError: 'No fue posible recuperar la sesión guardada.',
    })
  })

  test('inicia sesión y carga el perfil', async () => {
    mockSignIn.mockResolvedValue(session)
    mockResolveSessionProfile.mockResolvedValue(profile)

    await useAuthStore.getState().login('user@example.com', 'Password1!')

    expect(useAuthStore.getState()).toMatchObject({
      session,
      profile,
      status: 'authenticated',
    })
  })

  test('inicia sesión con Google y carga el perfil', async () => {
    mockSignInWithGoogle.mockResolvedValue(session)
    mockResolveSessionProfile.mockResolvedValue(profile)

    await expect(useAuthStore.getState().loginWithGoogle()).resolves.toBe(true)

    expect(useAuthStore.getState()).toMatchObject({
      session,
      profile,
      status: 'authenticated',
    })
  })

  test('mantiene el estado cuando se cancela el acceso con Google', async () => {
    mockSignInWithGoogle.mockResolvedValue(null)

    await expect(useAuthStore.getState().loginWithGoogle()).resolves.toBe(false)
    expect(mockResolveSessionProfile).not.toHaveBeenCalled()
  })

  test('registra una cuenta con sesión inmediata', async () => {
    mockSignUp.mockResolvedValue({ user: session.user, session })
    mockResolveSessionProfile.mockResolvedValue(profile)

    await expect(
      useAuthStore.getState().register({
        fullName: 'Usuario',
        email: 'user@example.com',
        password: 'Password1!',
        passwordConfirmation: 'Password1!',
      }),
    ).resolves.toBe(true)

    expect(useAuthStore.getState().status).toBe('authenticated')
  })

  test('indica que debe confirmarse el correo cuando no existe sesión', async () => {
    mockSignUp.mockResolvedValue({ user: session.user, session: null })

    await expect(
      useAuthStore.getState().register({
        fullName: 'Usuario',
        email: 'user@example.com',
        password: 'Password1!',
        passwordConfirmation: 'Password1!',
      }),
    ).resolves.toBe(false)

    expect(mockResolveSessionProfile).not.toHaveBeenCalled()
  })

  test('cierra sesión y limpia el estado', async () => {
    useAuthStore.setState({
      session,
      profile,
      status: 'authenticated',
    })
    mockSignOut.mockResolvedValue()

    await useAuthStore.getState().logout()

    expect(useAuthStore.getState()).toMatchObject({
      session: null,
      profile: null,
      status: 'unauthenticated',
    })
  })

  test('aplica cambios de sesión emitidos por Supabase', async () => {
    mockResolveSessionProfile.mockResolvedValue(profile)

    await useAuthStore.getState().applySession(session)

    expect(useAuthStore.getState()).toMatchObject({
      session,
      profile,
      status: 'authenticated',
      initializationError: null,
    })
  })

  test('aplica una sesión nula cuando Supabase cierra la autenticación', async () => {
    mockResolveSessionProfile.mockResolvedValue(null)

    await useAuthStore.getState().applySession(null)

    expect(useAuthStore.getState()).toMatchObject({
      session: null,
      profile: null,
      status: 'unauthenticated',
      initializationError: null,
    })
  })

  test('limpia la sesión cuando no puede cargar el perfil', async () => {
    mockResolveSessionProfile.mockRejectedValue(new Error('profile'))

    await useAuthStore.getState().applySession(session)

    expect(useAuthStore.getState()).toMatchObject({
      session: null,
      profile: null,
      status: 'unauthenticated',
      initializationError: 'No fue posible cargar el perfil del usuario.',
    })
  })
})
