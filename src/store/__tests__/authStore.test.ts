import type { Session } from '@supabase/supabase-js'

import { queryClient } from '@/config/queryClient'
import {
  getCurrentSession,
  resolveSessionProfile,
  signIn,
  signInWithGoogle,
  signOut,
  signUp,
  retryPendingInvitation,
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
  retryPendingInvitation: jest.fn(),
}))

const mockGetCurrentSession = jest.mocked(getCurrentSession)
const mockResolveSessionProfile = jest.mocked(resolveSessionProfile)
const mockSignIn = jest.mocked(signIn)
const mockSignInWithGoogle = jest.mocked(signInWithGoogle)
const mockSignOut = jest.mocked(signOut)
const mockSignUp = jest.mocked(signUp)
const mockRetryPendingInvitation = jest.mocked(retryPendingInvitation)

const session = {
  user: { id: 'user-1' },
} as Session

const profile: Profile = {
  id: 'user-1',
  fullName: 'Usuario',
  avatarUrl: null,
  role: 'solicitante',
  areaId: null,
  areaName: null,
  organizationId: 'org-1',
  organizationName: 'Empresa',
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

  test('no informa un falso error si el evento de Auth ya aplicó la sesión de Google', async () => {
    mockSignInWithGoogle.mockResolvedValue(session)
    mockResolveSessionProfile.mockImplementation(async () => {
      useAuthStore.setState({
        session,
        profile,
        status: 'authenticated',
        initializationError: null,
      })
      throw new Error('carga duplicada')
    })

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

  test('aplica el nuevo rol, área y nombre de empresa al propio perfil', () => {
    useAuthStore.setState({ session, profile, status: 'authenticated' })
    useAuthStore.getState().applyOwnAccess('otro', 'tecnico', 'area', 'Técnica')
    expect(useAuthStore.getState().profile?.role).toBe('solicitante')
    useAuthStore.getState().applyOwnAccess('user-1', 'tecnico', 'area', 'Técnica')
    useAuthStore.getState().applyOrganizationName('Empresa nueva')
    expect(useAuthStore.getState().profile).toMatchObject({
      role: 'tecnico',
      areaId: 'area',
      organizationName: 'Empresa nueva',
    })
  })

  test('reintenta la invitación únicamente con una sesión', async () => {
    await expect(useAuthStore.getState().retryInvitation()).resolves.toBe(false)
    expect(mockRetryPendingInvitation).not.toHaveBeenCalled()
    useAuthStore.setState({
      session,
      profile: { ...profile, organizationId: null },
      status: 'authenticated',
    })
    mockRetryPendingInvitation.mockResolvedValue(profile)
    await expect(useAuthStore.getState().retryInvitation()).resolves.toBe(true)
    expect(useAuthStore.getState().profile?.organizationId).toBe('org-1')
  })

  test('borra datos en caché al cambiar de usuario para no mostrar otra empresa', async () => {
    queryClient.setQueryData(['cases'], [{ id: 'private' }])
    useAuthStore.setState({ session, profile, status: 'authenticated' })
    const anotherSession = { user: { id: 'user-2' } } as Session
    mockResolveSessionProfile.mockResolvedValue({
      ...profile,
      id: 'user-2',
      organizationId: 'org-2',
    })

    await useAuthStore.getState().applySession(anotherSession)

    expect(queryClient.getQueryData(['cases'])).toBeUndefined()
    expect(useAuthStore.getState().profile?.organizationId).toBe('org-2')
  })
})
