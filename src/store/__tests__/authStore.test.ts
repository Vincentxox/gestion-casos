import type { Session } from '@supabase/supabase-js'
import { Image } from 'expo-image'

import { queryClient } from '@/config/queryClient'
import { getAuthenticatedRoute } from '@/features/auth/authRoute'
import {
  getCurrentSession,
  resolveSessionProfile,
  signIn,
  signInWithGoogle,
  signOut,
  signUp,
  retryPendingInvitation,
  setPasswordRecoverySession,
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
  setPasswordRecoverySession: jest.fn(),
}))

jest.mock('expo-image', () => ({
  Image: {
    clearMemoryCache: jest.fn(),
    clearDiskCache: jest.fn(),
  },
}))

const mockGetCurrentSession = jest.mocked(getCurrentSession)
const mockResolveSessionProfile = jest.mocked(resolveSessionProfile)
const mockSignIn = jest.mocked(signIn)
const mockSignInWithGoogle = jest.mocked(signInWithGoogle)
const mockSignOut = jest.mocked(signOut)
const mockSignUp = jest.mocked(signUp)
const mockRetryPendingInvitation = jest.mocked(retryPendingInvitation)
const mockSetPasswordRecoverySession = jest.mocked(setPasswordRecoverySession)
const mockClearMemoryCache = jest.mocked(Image.clearMemoryCache)
const mockClearDiskCache = jest.mocked(Image.clearDiskCache)

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
  organizationActive: true,
}

describe('estado global de autenticación', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockClearMemoryCache.mockResolvedValue(true)
    mockClearDiskCache.mockResolvedValue(true)
    useAuthStore.setState({
      session: null,
      profile: null,
      status: 'initializing',
      initializationError: null,
      passwordRecovery: false,
      recoveryLinkError: null,
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

  test('el enlace válido activa recuperación antes de aplicar la sesión', async () => {
    mockSetPasswordRecoverySession.mockImplementation(async () => {
      expect(useAuthStore.getState().passwordRecovery).toBe(true)
      return session
    })
    await useAuthStore
      .getState()
      .handleRecoveryUrl('gestion-casos://auth/reset#access_token=a&refresh_token=r&type=recovery')
    expect(useAuthStore.getState()).toMatchObject({
      session,
      passwordRecovery: true,
      status: 'authenticated',
    })
    expect(mockResolveSessionProfile).not.toHaveBeenCalled()
  })

  test('al guardar la contraseña sale de recuperación y conserva la sesión', async () => {
    useAuthStore.setState({ session, status: 'authenticated', passwordRecovery: true })
    mockResolveSessionProfile.mockResolvedValue(profile)
    await useAuthStore.getState().finishPasswordRecovery()
    expect(useAuthStore.getState()).toMatchObject({
      passwordRecovery: false,
      session,
      profile,
      status: 'authenticated',
    })
  })

  test('mantiene recuperación hasta cargar el perfil y nunca pasa por Completa tu nombre', async () => {
    let resolveProfile: (value: Profile) => void = () => undefined
    mockResolveSessionProfile.mockImplementation(
      () => new Promise<Profile>((resolve) => (resolveProfile = resolve)),
    )
    useAuthStore.setState({
      session,
      profile: null,
      status: 'authenticated',
      passwordRecovery: true,
    })
    const states: ReturnType<typeof useAuthStore.getState>[] = []
    const unsubscribe = useAuthStore.subscribe((state) => states.push(state))

    try {
      const finishing = useAuthStore.getState().finishPasswordRecovery()
      expect(useAuthStore.getState()).toMatchObject({
        passwordRecovery: true,
        profile: null,
      })

      resolveProfile(profile)
      await finishing

      expect(useAuthStore.getState()).toMatchObject({
        passwordRecovery: false,
        profile,
        status: 'authenticated',
      })
      expect(
        states.some(
          (state) =>
            !state.passwordRecovery &&
            state.status === 'authenticated' &&
            getAuthenticatedRoute({
              organizationId: state.profile?.organizationId ?? null,
              organizationActive: state.profile?.organizationActive ?? null,
              fullName: state.profile?.fullName ?? '',
            }) === 'completeName',
        ),
      ).toBe(false)
    } finally {
      unsubscribe()
    }
  })

  test('si falla el perfil después de cambiar la contraseña vuelve al acceso sin mostrar el nombre', async () => {
    useAuthStore.setState({
      session,
      profile: null,
      status: 'authenticated',
      passwordRecovery: true,
    })
    mockResolveSessionProfile.mockRejectedValue(new Error('network'))

    await useAuthStore.getState().finishPasswordRecovery()

    expect(useAuthStore.getState()).toMatchObject({
      session: null,
      profile: null,
      status: 'unauthenticated',
      passwordRecovery: false,
      initializationError: 'No fue posible cargar el perfil del usuario.',
    })
  })

  test('el enlace vencido vuelve al acceso sin llamar a Supabase', async () => {
    useAuthStore.setState({ session, profile, status: 'authenticated' })
    await useAuthStore
      .getState()
      .handleRecoveryUrl('gestion-casos://auth/reset#error_code=otp_expired')
    expect(useAuthStore.getState()).toMatchObject({
      session: null,
      profile: null,
      status: 'unauthenticated',
      passwordRecovery: false,
      recoveryLinkError: 'El enlace venció o ya se usó. Pide uno nuevo.',
    })
    expect(mockSignOut).toHaveBeenCalledTimes(1)
    expect(mockSetPasswordRecoverySession).not.toHaveBeenCalled()
  })

  test('ignora la URL de Google', async () => {
    await useAuthStore
      .getState()
      .handleRecoveryUrl('gestion-casos://auth/callback#access_token=a&refresh_token=r')
    expect(mockSetPasswordRecoverySession).not.toHaveBeenCalled()
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
    expect(mockClearMemoryCache).toHaveBeenCalledTimes(1)
    expect(mockClearDiskCache).toHaveBeenCalledTimes(1)
  })

  test('cierra sesión aunque una caché de imágenes falle', async () => {
    useAuthStore.setState({ session, profile, status: 'authenticated' })
    mockSignOut.mockResolvedValue()
    mockClearDiskCache.mockRejectedValue(new Error('disk unavailable'))

    await expect(useAuthStore.getState().logout()).resolves.toBeUndefined()

    expect(useAuthStore.getState().status).toBe('unauthenticated')
    expect(mockClearMemoryCache).toHaveBeenCalledTimes(1)
    expect(mockClearDiskCache).toHaveBeenCalledTimes(1)
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
    expect(mockClearMemoryCache).toHaveBeenCalledTimes(1)
    expect(mockClearDiskCache).toHaveBeenCalledTimes(1)
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
    expect(mockClearMemoryCache).toHaveBeenCalledTimes(1)
    expect(mockClearDiskCache).toHaveBeenCalledTimes(1)
  })

  test('limpia imágenes cuando cambia de empresa con el mismo usuario', async () => {
    useAuthStore.setState({ session, profile, status: 'authenticated' })
    mockResolveSessionProfile.mockResolvedValue({ ...profile, organizationId: 'org-2' })

    await useAuthStore.getState().applySession(session)

    expect(mockClearMemoryCache).toHaveBeenCalledTimes(1)
    expect(mockClearDiskCache).toHaveBeenCalledTimes(1)
    expect(useAuthStore.getState().profile?.organizationId).toBe('org-2')
  })

  test('al desactivarse la empresa limpia consultas e imágenes sin cerrar la sesión', async () => {
    queryClient.setQueryData(['cases'], [{ id: 'private' }])
    useAuthStore.setState({ session, profile, status: 'authenticated' })
    mockResolveSessionProfile.mockResolvedValue({ ...profile, organizationActive: false })

    await useAuthStore.getState().refreshProfile()

    expect(queryClient.getQueryData(['cases'])).toBeUndefined()
    expect(mockClearMemoryCache).toHaveBeenCalledTimes(1)
    expect(mockClearDiskCache).toHaveBeenCalledTimes(1)
    expect(useAuthStore.getState()).toMatchObject({
      session,
      status: 'authenticated',
      profile: { organizationActive: false },
    })
  })

  test('al reactivarse la empresa limpia las cachés y recupera el acceso', async () => {
    useAuthStore.setState({
      session,
      profile: { ...profile, organizationActive: false },
      status: 'authenticated',
    })
    mockResolveSessionProfile.mockResolvedValue(profile)

    await expect(useAuthStore.getState().refreshProfile()).resolves.toEqual(profile)

    expect(useAuthStore.getState().profile?.organizationActive).toBe(true)
    expect(mockClearMemoryCache).toHaveBeenCalledTimes(1)
    expect(mockClearDiskCache).toHaveBeenCalledTimes(1)
  })

  test('si falla la recarga del perfil conserva la sesión y permite reintentar', async () => {
    useAuthStore.setState({ session, profile, status: 'authenticated' })
    mockResolveSessionProfile.mockRejectedValue(new Error('network'))

    await expect(useAuthStore.getState().refreshProfile()).rejects.toThrow('network')

    expect(useAuthStore.getState()).toMatchObject({ session, profile, status: 'authenticated' })
  })
})
