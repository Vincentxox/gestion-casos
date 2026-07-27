import type { Session } from '@supabase/supabase-js'

import { supabase } from '@/services/supabase/client'

import { APP_ROLES, type AppRole, type Profile } from './types'

interface ProfileRow {
  id: string
  full_name: string
  avatar_url: string | null
  role: string
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
    .select('id, full_name, avatar_url, role')
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
  return session ? getProfile(session.user.id) : null
}
