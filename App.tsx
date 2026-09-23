import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans'
import { QueryClientProvider } from '@tanstack/react-query'
import { NavigationContainer } from '@react-navigation/native'
import { StatusBar } from 'expo-status-bar'
import { useCallback, useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { BrandIntroScreen } from '@/components/branding/BrandIntroScreen'
import { queryClient } from '@/config/queryClient'
import { AuthLoadingScreen } from '@/features/auth/screens/AuthLoadingScreen'
import { PendingInvitationScreen } from '@/features/auth/screens/PendingInvitationScreen'
import { CompleteNameScreen } from '@/features/settings/CompleteNameScreen'
import { AuthNavigator } from '@/navigation/AuthNavigator'
import { MainNavigator } from '@/navigation/MainNavigator'
import { registerAuthAutoRefresh, supabase } from '@/services/supabase/client'
import { useAuthStore } from '@/store/authStore'
import { colors } from '@/theme/tokens'

function RootContent({ fontsReady }: { fontsReady: boolean }) {
  const [showIntro, setShowIntro] = useState(true)
  const status = useAuthStore((state) => state.status)
  const organizationId = useAuthStore((state) => state.profile?.organizationId)
  const fullName = useAuthStore((state) => state.profile?.fullName)
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

  const finishIntro = useCallback(() => setShowIntro(false), [])

  if (showIntro || !fontsReady) {
    return <BrandIntroScreen onFinish={finishIntro} ready={fontsReady} />
  }

  if (status === 'initializing') {
    return <AuthLoadingScreen />
  }

  return (
    <NavigationContainer>
      {status === 'authenticated' ? (
        !fullName?.trim() ? (
          <CompleteNameScreen />
        ) : organizationId ? (
          <MainNavigator />
        ) : (
          <PendingInvitationScreen />
        )
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  )
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  })

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <View style={styles.container}>
          <StatusBar style="dark" />
          <RootContent fontsReady={fontsLoaded || Boolean(fontError)} />
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
