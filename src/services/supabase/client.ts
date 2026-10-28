import 'react-native-url-polyfill/auto'

import { createClient } from '@supabase/supabase-js'
import { AppState, Platform, type AppStateStatus } from 'react-native'

import type { Database } from './database'
import { secureSessionStorage } from './secureStorage'

import { getPublicEnvironment } from '@/config/env'

const { supabaseUrl, supabasePublishableKey } = getPublicEnvironment()

export const supabase = createClient<Database>(supabaseUrl, supabasePublishableKey, {
  auth: {
    ...(Platform.OS !== 'web' ? { storage: secureSessionStorage } : {}),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

function synchronizeAutoRefresh(state: AppStateStatus) {
  if (state === 'active') {
    supabase.auth.startAutoRefresh()
  } else {
    supabase.auth.stopAutoRefresh()
  }
}

/** Registra una sola renovación automática y devuelve su función de limpieza. */
export function registerAuthAutoRefresh() {
  if (Platform.OS === 'web') return () => undefined

  synchronizeAutoRefresh(AppState.currentState)
  const subscription = AppState.addEventListener('change', synchronizeAutoRefresh)

  return () => {
    subscription.remove()
    supabase.auth.stopAutoRefresh()
  }
}
