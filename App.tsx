import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { NavigationContainer } from '@react-navigation/native'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { StyleSheet, View } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { AuthLoadingScreen } from '@/features/auth/screens/AuthLoadingScreen'
import { AuthNavigator } from '@/navigation/AuthNavigator'
import { MainNavigator } from '@/navigation/MainNavigator'
import { registerAuthAutoRefresh, supabase } from '@/services/supabase/client'
import { useAuthStore } from '@/store/authStore'
import { colors } from '@/theme/tokens'

const queryClient = new QueryClient()

function RootContent() {
  const status = useAuthStore((state) => state.status)
  const initialize = useAuthStore((state) => state.initialize)
  const applySession = useAuthStore((state) => state.applySession)

  useEffect(() => {
    const unregisterAutoRefresh = registerAuthAutoRefresh()
    const pendingCallbacks = new Set<ReturnType<typeof setTimeout>>()

    void initialize()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const callback = setTimeout(() => {
        pendingCallbacks.delete(callback)
        void applySession(session)
      }, 0)
      pendingCallbacks.add(callback)
    })

    return () => {
      subscription.unsubscribe()
      unregisterAutoRefresh()
      pendingCallbacks.forEach(clearTimeout)
    }
  }, [applySession, initialize])

  if (status === 'initializing') {
    return <AuthLoadingScreen />
  }

  return (
    <NavigationContainer>
      {status === 'authenticated' ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  )
}

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <View style={styles.container}>
          <StatusBar style="dark" />
          <RootContent />
        </View>
      </QueryClientProvider>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
})
