import type { Session } from '@supabase/supabase-js'
import { makeRedirectUri } from 'expo-auth-session'
import * as WebBrowser from 'expo-web-browser'

import { supabase } from '@/services/supabase/client'

import { APP_ROLES, type AppRole, type Profile } from './types'

WebBrowser.maybeCompleteAuthSession()

export const googleAuthRedirectUrl = makeRedirectUri({
  scheme: 'gestion-casos',
  path: 'auth/callback',
})

interface ProfileRow {
  id: string
  full_name: string
  avatar_url: string | null
  role: string
  area_id: string | null
  area: { name: string } | null
  organization_id: string | null
  organization: { name: string } | null
}

function isAppRole(value: string): value is AppRole {
  return APP_ROLES.some((role) => role === value)
}

function mapProfile(row: ProfileRow): Profile {
  if (!isAppRole(row.role)) {
    throw new Error('El usuario tiene un rol no reconocido')
  }

  return {
    id: row.id,
    fullName: row.full_name,
    avatarUrl: row.avatar_url,
    role: row.role,
    areaId: row.area_id,
    areaName: row.area?.name ?? null,
    organizationId: row.organization_id,
    organizationName: row.organization?.name ?? null,
  }
}

export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession()

  if (error) {
    throw error
  }

  return data.session
}

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select(
      'id, full_name, avatar_url, role, area_id, area:areas(name), organization_id, organization:organizations(name)',
    )
    .eq('id', userId)
    .single<ProfileRow>()

  if (error) {
    throw error
  }

  return mapProfile(data)
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  })

  if (error) {
    throw error
  }

  return data.session
}

function getOAuthTokens(callbackUrl: string) {
  const url = new URL(callbackUrl)
  const query = new URLSearchParams(url.search)
  const fragment = new URLSearchParams(url.hash.replace(/^#/, ''))
  const params = url.hash ? fragment : query
  const errorDescription = params.get('error_description') ?? params.get('error')

  if (errorDescription) {
    throw new Error(errorDescription)
  }

  const accessToken = params.get('access_token')
  const refreshToken = params.get('refresh_token')

  if (!accessToken || !refreshToken) {
    throw new Error('Google no devolvió una sesión válida')
  }

  return { access_token: accessToken, refresh_token: refreshToken }
}

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: googleAuthRedirectUrl,
      skipBrowserRedirect: true,
    },
  })

  if (error) {
    throw error
  }

  if (!data.url) {
    throw new Error('No fue posible iniciar la autorización con Google')
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, googleAuthRedirectUrl)

  if (result.type !== 'success') {
    return null
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.setSession(
    getOAuthTokens(result.url),
  )

  if (sessionError) {
    throw sessionError
  }

  return sessionData.session
}

export async function signUp(email: string, password: string, fullName: string) {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      data: {
        full_name: fullName.trim(),
      },
    },
  })

  if (error) {
    throw error
  }

  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()

  if (error) {
    throw error
  }
}

export async function resolveSessionProfile(session: Session | null) {
  if (!session) return null
  const profile = await getProfile(session.user.id)
  if (profile.organizationId) return profile
  try {
    const { data, error } = await supabase.rpc('accept_pending_invitation')
    if (error) throw error
    return data ? getProfile(session.user.id) : profile
  } catch (error) {
    if (
      error instanceof TypeError ||
      (error instanceof Error && /fetch|network|conexi[oó]n|timeout/i.test(error.message))
    ) {
      return profile
    }
    throw error
  }
}

export async function retryPendingInvitation(userId: string) {
  const { error } = await supabase.rpc('accept_pending_invitation')
  if (error) throw error
  return getProfile(userId)
}
