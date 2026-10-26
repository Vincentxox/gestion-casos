import type { Session } from '@supabase/supabase-js'
import { Image } from 'expo-image'
import { create } from 'zustand'

import { queryClient } from '@/config/queryClient'
import {
  getCurrentSession,
  setPasswordRecoverySession,
  resolveSessionProfile,
  retryPendingInvitation,
  signIn,
  signInWithGoogle,
  signOut,
  signOutDeletedAccount,
  signUp,
} from '@/features/auth/authService'
import type { RegistrationInput } from '@/features/auth/schemas'
import type { AppRole, Profile } from '@/features/auth/types'
import { EXPIRED_RECOVERY_LINK_MESSAGE, parseRecoveryLink } from '@/features/auth/recoveryLink'

type AuthStatus = 'initializing' | 'authenticated' | 'unauthenticated'

interface AuthStore {
  session: Session | null
  profile: Profile | null
  status: AuthStatus
  initializationError: string | null
  passwordRecovery: boolean
  recoveryLinkError: string | null
  accountDeletedNotice: boolean
  clearAccountDeletedNotice: () => void
  completeAccountDeletion: () => Promise<void>
  handleRecoveryUrl: (url: string) => Promise<void>
  finishPasswordRecovery: () => Promise<void>
  initialize: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  loginWithGoogle: () => Promise<boolean>
  register: (input: RegistrationInput) => Promise<boolean>
  logout: () => Promise<void>
  applySession: (session: Session | null) => Promise<void>
  refreshProfile: () => Promise<Profile | null>
  applyOwnAccess: (
    userId: string,
    role: AppRole,
    areaId: string | null,
    areaName: string | null,
  ) => void
  applyOrganizationName: (name: string) => void
  applyOwnName: (name: string) => void
  applyOwnAvatar: (path: string | null) => void
  retryInvitation: () => Promise<boolean>
}

async function clearImageCaches(): Promise<void> {
  // A failed native cache operation must never keep a user signed in.
  await Promise.allSettled([
    Promise.resolve().then(() => Image.clearMemoryCache()),
    Promise.resolve().then(() => Image.clearDiskCache()),
  ])
}

async function getAuthValues(
  session: Session | null,
  previousSession: Session | null,
  previousProfile: Profile | null,
) {
  const profile = await resolveSessionProfile(session)

  if (
    session?.user.id !== previousSession?.user.id ||
    profile?.organizationId !== previousProfile?.organizationId ||
    profile?.organizationActive !== previousProfile?.organizationActive
  ) {
    queryClient.clear()
    await clearImageCaches()
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
  passwordRecovery: false,
  recoveryLinkError: null,
  accountDeletedNotice: false,

  clearAccountDeletedNotice() {
    set({ accountDeletedNotice: false })
  },

  async completeAccountDeletion() {
    try {
      await signOutDeletedAccount()
    } catch {
      // Auth user may have been removed by the Edge Function already.
    }
    queryClient.clear()
    set({
      session: null,
      profile: null,
      status: 'unauthenticated',
      initializationError: null,
      passwordRecovery: false,
      recoveryLinkError: null,
      accountDeletedNotice: true,
    })
    await clearImageCaches()
  },

  async handleRecoveryUrl(url) {
    const link = parseRecoveryLink(url)
    if (!link) return
    if (link.type === 'expired') {
      try {
        await signOut()
      } catch {
        // An expired link must still return to Login if the network is unavailable.
      }
      queryClient.clear()
      set({
        session: null,
        profile: null,
        status: 'unauthenticated',
        passwordRecovery: false,
        recoveryLinkError: EXPIRED_RECOVERY_LINK_MESSAGE,
      })
      return
    }
    // Set this before setSession emits its auth-state event.
    set({ passwordRecovery: true, recoveryLinkError: null })
    try {
      const session = await setPasswordRecoverySession(link.url)
      if (!session) throw new Error(EXPIRED_RECOVERY_LINK_MESSAGE)
      queryClient.clear()
      set({ session, profile: null, status: 'authenticated', initializationError: null })
    } catch {
      try {
        await signOut()
      } catch {
        // Keep the recovery failure visible even if sign-out fails.
      }
      queryClient.clear()
      set({
        session: null,
        profile: null,
        status: 'unauthenticated',
        passwordRecovery: false,
        recoveryLinkError: EXPIRED_RECOVERY_LINK_MESSAGE,
      })
    }
  },

  async finishPasswordRecovery() {
    const session = get().session
    try {
      const values = await getAuthValues(session, session, get().profile)
      set({
        ...values,
        passwordRecovery: false,
        recoveryLinkError: null,
        initializationError: null,
      })
    } catch {
      queryClient.clear()
      set({
        session: null,
        profile: null,
        status: 'unauthenticated',
        initializationError: 'No fue posible cargar el perfil del usuario.',
        passwordRecovery: false,
        recoveryLinkError: null,
      })
    }
  },

  async initialize() {
    set({ status: 'initializing', initializationError: null })

    try {
      const session = await getCurrentSession()
      if (get().passwordRecovery || get().recoveryLinkError) return
      set({
        ...(await getAuthValues(session, get().session, get().profile)),
        initializationError: null,
      })
    } catch {
      if (get().passwordRecovery || get().recoveryLinkError) return
      queryClient.clear()
      set({
        session: null,
        profile: null,
        status: 'unauthenticated',
        initializationError: 'No fue posible recuperar la sesión guardada.',
        passwordRecovery: false,
      })
    }
  },

  async login(email, password) {
    const session = await signIn(email, password)
    set({
      ...(await getAuthValues(session, get().session, get().profile)),
      initializationError: null,
      recoveryLinkError: null,
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
        recoveryLinkError: null,
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
        recoveryLinkError: null,
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
      passwordRecovery: false,
      recoveryLinkError: null,
    })
    await clearImageCaches()
  },

  async applySession(session) {
    if (get().recoveryLinkError && session) return
    if (get().passwordRecovery) {
      if (session) set({ session, status: 'authenticated', initializationError: null })
      return
    }
    const previousSession = get().session
    const previousProfile = get().profile
    if (session?.user.id !== previousSession?.user.id) {
      queryClient.clear()
      set({ session: null, profile: null, status: 'initializing' })
    }
    try {
      set({
        ...(await getAuthValues(session, previousSession, previousProfile)),
        initializationError: null,
      })
    } catch {
      queryClient.clear()
      set({
        session: null,
        profile: null,
        status: 'unauthenticated',
        initializationError: 'No fue posible cargar el perfil del usuario.',
        passwordRecovery: false,
      })
    }
  },

  async refreshProfile() {
    const session = get().session
    if (!session) return null
    const values = await getAuthValues(session, session, get().profile)
    if (get().session?.user.id !== session.user.id) return null
    set({ ...values, initializationError: null })
    return values.profile
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

  applyOwnAvatar(path) {
    const profile = get().profile
    if (profile) set({ profile: { ...profile, avatarUrl: path } })
  },

  async retryInvitation() {
    const userId = get().session?.user.id
    if (!userId) return false
    const profile = await retryPendingInvitation(userId)
    if (profile.organizationId !== get().profile?.organizationId) {
      queryClient.clear()
      await clearImageCaches()
    }
    set({ profile })
    return profile.organizationId !== null
  },
}))
