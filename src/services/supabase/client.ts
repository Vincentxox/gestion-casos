import 'react-native-url-polyfill/auto'

import { createClient } from '@supabase/supabase-js'

import { getPublicEnvironment } from '@/config/env'

const { supabaseUrl, supabasePublishableKey } = getPublicEnvironment()

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: false,
    detectSessionInUrl: false,
  },
})
