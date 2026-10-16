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
import { AppFeedbackProvider } from '@/components/feedback/AppFeedback'
import { queryClient } from '@/config/queryClient'
import { registerQueryLifecycle } from '@/config/queryLifecycle'
import { AuthLoadingScreen } from '@/features/auth/screens/AuthLoadingScreen'
import { InactiveOrganizationScreen } from '@/features/auth/screens/InactiveOrganizationScreen'
import { PendingInvitationScreen } from '@/features/auth/screens/PendingInvitationScreen'
import { getAuthenticatedRoute } from '@/features/auth/authRoute'
import { useOrganizationLifecycle } from '@/features/auth/useOrganizationLifecycle'
import { CompleteNameScreen } from '@/features/settings/CompleteNameScreen'
import { AuthNavigator } from '@/navigation/AuthNavigator'
import { MainRootNavigator } from '@/navigation/MainNavigator'
import { registerAuthAutoRefresh, supabase } from '@/services/supabase/client'
import { useAuthStore } from '@/store/authStore'
import { colors } from '@/theme/tokens'

function RootContent({ fontsReady }: { fontsReady: boolean }) {
  const [showIntro, setShowIntro] = useState(true)
  const status = useAuthStore((state) => state.status)
  const profile = useAuthStore((state) => state.profile)
  const organizationId = profile?.organizationId
  const organizationActive = profile?.organizationActive
  const userId = profile?.id
  const initialize = useAuthStore((state) => state.initialize)
  const applySession = useAuthStore((state) => state.applySession)
  const refreshProfile = useAuthStore((state) => state.refreshProfile)

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

  useOrganizationLifecycle({
    userId,
    organizationId,
    organizationActive,
    authenticated: status === 'authenticated',
    refreshProfile,
  })

  const finishIntro = useCallback(() => setShowIntro(false), [])

  if (!fontsReady) {
    return <View style={styles.container} />
  }

  if (showIntro) {
    return <BrandIntroScreen onFinish={finishIntro} ready={status !== 'initializing'} />
  }

  if (status === 'initializing') {
    return <AuthLoadingScreen />
  }

  const route = getAuthenticatedRoute({
    organizationId: organizationId ?? null,
    organizationActive: organizationActive ?? null,
    fullName: profile?.fullName ?? '',
  })

  return (
    <NavigationContainer>
      {status === 'authenticated' ? (
        route === 'inactive' ? (
          <InactiveOrganizationScreen />
        ) : route === 'completeName' ? (
          <CompleteNameScreen />
        ) : route === 'main' ? (
          <MainRootNavigator />
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

  useEffect(() => registerQueryLifecycle(), [])

  return (
    <SafeAreaProvider>
      <AppFeedbackProvider>
        <QueryClientProvider client={queryClient}>
          <View style={styles.container}>
            <StatusBar style="dark" />
            <RootContent fontsReady={fontsLoaded || Boolean(fontError)} />
          </View>
        </QueryClientProvider>
      </AppFeedbackProvider>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
})
