import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { NavigationContainer } from '@react-navigation/native'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { StyleSheet, View } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { AuthLoadingScreen } from '@/features/auth/screens/AuthLoadingScreen'
import { HomeScreen } from '@/features/home/HomeScreen'
import { AuthNavigator } from '@/navigation/AuthNavigator'
import { supabase } from '@/services/supabase/client'
import { useAuthStore } from '@/store/authStore'
import { colors } from '@/theme/tokens'

const queryClient = new QueryClient()

function RootContent() {
  const status = useAuthStore((state) => state.status)
  const initialize = useAuthStore((state) => state.initialize)
  const applySession = useAuthStore((state) => state.applySession)

  useEffect(() => {
    void initialize()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setTimeout(() => {
        void applySession(session)
      }, 0)
    })

    return () => subscription.unsubscribe()
  }, [applySession, initialize])

  if (status === 'initializing') {
    return <AuthLoadingScreen />
  }

  return (
    <NavigationContainer>
      {status === 'authenticated' ? <HomeScreen /> : <AuthNavigator />}
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
