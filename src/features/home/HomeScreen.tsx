import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { PrimaryButton } from '@/components/buttons/PrimaryButton'
import { useAuthStore } from '@/store/authStore'
import { colors, radius, spacing } from '@/theme/tokens'

export function HomeScreen() {
  const profile = useAuthStore((state) => state.profile)
  const logout = useAuthStore((state) => state.logout)

  async function handleLogout() {
    try {
      await logout()
    } catch {
      Alert.alert('No fue posible cerrar sesión', 'Comprueba tu conexión e inténtalo nuevamente.')
    }
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>MENÚ PRINCIPAL</Text>
          <Text accessibilityRole="header" style={styles.title}>
            Hola, {profile?.fullName || 'usuario'}
          </Text>
          <Text style={styles.subtitle}>
            Tu sesión está activa con el rol {profile?.role ?? 'sin asignar'}.
          </Text>
        </View>

        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Autenticación conectada</Text>
          <Text style={styles.noticeText}>
            Los módulos de casos, documentos y reportes se habilitarán en las siguientes etapas del
            MVP.
          </Text>
        </View>

        <PrimaryButton label="Cerrar sesión" onPress={() => void handleLogout()} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  header: {
    gap: spacing.sm,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  notice: {
    gap: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    padding: spacing.lg,
  },
  noticeTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  noticeText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
})
