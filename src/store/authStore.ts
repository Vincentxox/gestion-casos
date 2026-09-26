import type { Session } from '@supabase/supabase-js'
import { create } from 'zustand'

import { queryClient } from '@/config/queryClient'
import {
  getCurrentSession,
  resolveSessionProfile,
  retryPendingInvitation,
  signIn,
  signInWithGoogle,
  signOut,
  signUp,
} from '@/features/auth/authService'
import type { RegistrationInput } from '@/features/auth/schemas'
import type { AppRole, Profile } from '@/features/auth/types'

type AuthStatus = 'initializing' | 'authenticated' | 'unauthenticated'

interface AuthStore {
  session: Session | null
  profile: Profile | null
  status: AuthStatus
  initializationError: string | null
  initialize: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  loginWithGoogle: () => Promise<boolean>
  register: (input: RegistrationInput) => Promise<boolean>
  logout: () => Promise<void>
  applySession: (session: Session | null) => Promise<void>
  applyOwnAccess: (
    userId: string,
    role: AppRole,
    areaId: string | null,
    areaName: string | null,
  ) => void
  applyOrganizationName: (name: string) => void
  applyOwnName: (name: string) => void
  retryInvitation: () => Promise<boolean>
}

async function getAuthValues(
  session: Session | null,
  previousSession: Session | null,
  previousProfile: Profile | null,
) {
  const profile = await resolveSessionProfile(session)

  if (
    session?.user.id !== previousSession?.user.id ||
    profile?.organizationId !== previousProfile?.organizationId
  ) {
    queryClient.clear()
  }

  return {
    session,
    profile,
    status: session ? ('authenticated' as const) : ('unauthenticated' as const),
  }
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  session: null,
  profile: null,
  status: 'initializing',
  initializationError: null,

  async initialize() {
    set({ status: 'initializing', initializationError: null })

    try {
      const session = await getCurrentSession()
      set({
        ...(await getAuthValues(session, get().session, get().profile)),
        initializationError: null,
      })
    } catch {
      queryClient.clear()
      set({
        session: null,
        profile: null,
        status: 'unauthenticated',
        initializationError: 'No fue posible recuperar la sesión guardada.',
      })
    }
  },

  async login(email, password) {
    const session = await signIn(email, password)
    set({
      ...(await getAuthValues(session, get().session, get().profile)),
      initializationError: null,
    })
  },

  async loginWithGoogle() {
    const session = await signInWithGoogle()

    if (!session) {
      return false
    }

    try {
      set({
        ...(await getAuthValues(session, get().session, get().profile)),
        initializationError: null,
      })
    } catch (error) {
      // setSession también emite onAuthStateChange. Si ese flujo ya cargó el
      // mismo usuario, no debemos convertir una segunda carga fallida en un
      // falso error después de que la autenticación concluyó correctamente.
      const currentState = get()
      const sessionWasApplied =
        currentState.status === 'authenticated' &&
        currentState.session?.user.id === session.user.id &&
        currentState.profile !== null

      if (!sessionWasApplied) {
        throw error
      }
    }

    return true
  },

  async register({ email, password, fullName }) {
    const { session } = await signUp(email, password, fullName)

    if (session) {
      set({
        ...(await getAuthValues(session, get().session, get().profile)),
        initializationError: null,
      })
    }

    return session !== null
  },

  async logout() {
    await signOut()
    queryClient.clear()
    set({
      session: null,
      profile: null,
      status: 'unauthenticated',
      initializationError: null,
    })
  },

  async applySession(session) {
    if (session?.user.id !== get().session?.user.id) {
      queryClient.clear()
      set({ session: null, profile: null, status: 'initializing' })
    }
    try {
      set({
        ...(await getAuthValues(session, get().session, get().profile)),
        initializationError: null,
      })
    } catch {
      queryClient.clear()
      set({
        session: null,
        profile: null,
        status: 'unauthenticated',
        initializationError: 'No fue posible cargar el perfil del usuario.',
      })
    }
  },

  applyOwnAccess(userId, role, areaId, areaName) {
    const profile = get().profile
    if (profile?.id !== userId) return
    set({ profile: { ...profile, role, areaId, areaName } })
  },

  applyOrganizationName(name) {
    const profile = get().profile
    if (profile) set({ profile: { ...profile, organizationName: name } })
  },

  applyOwnName(name) {
    const profile = get().profile
    if (profile) set({ profile: { ...profile, fullName: name } })
  },

  async retryInvitation() {
    const userId = get().session?.user.id
    if (!userId) return false
    const profile = await retryPendingInvitation(userId)
    if (profile.organizationId !== get().profile?.organizationId) queryClient.clear()
    set({ profile })
    return profile.organizationId !== null
  },
}))
