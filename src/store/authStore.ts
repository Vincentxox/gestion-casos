import type { Session } from '@supabase/supabase-js'
import { create } from 'zustand'

import {
  getCurrentSession,
  resolveSessionProfile,
  signIn,
  signInWithGoogle,
  signOut,
  signUp,
} from '@/features/auth/authService'
import type { RegistrationInput } from '@/features/auth/schemas'
import type { Profile } from '@/features/auth/types'

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
}

async function getAuthValues(session: Session | null) {
  const profile = await resolveSessionProfile(session)

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
        ...(await getAuthValues(session)),
        initializationError: null,
      })
    } catch {
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
    set({ ...(await getAuthValues(session)), initializationError: null })
  },

  async loginWithGoogle() {
    const session = await signInWithGoogle()

    if (!session) {
      return false
    }

    try {
      set({ ...(await getAuthValues(session)), initializationError: null })
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
      set({ ...(await getAuthValues(session)), initializationError: null })
    }

    return session !== null
  },

  async logout() {
    await signOut()
    set({
      session: null,
      profile: null,
      status: 'unauthenticated',
      initializationError: null,
    })
  },

  async applySession(session) {
    try {
      set({
        ...(await getAuthValues(session)),
        initializationError: null,
      })
    } catch {
      set({
        session: null,
        profile: null,
        status: 'unauthenticated',
        initializationError: 'No fue posible cargar el perfil del usuario.',
      })
    }
  },
}))
