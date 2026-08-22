import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { PrimaryButton } from '@/components/buttons/PrimaryButton'
import type { MainStackParamList } from '@/navigation/types'
import { useAuthStore } from '@/store/authStore'
import { colors, radius, spacing } from '@/theme/tokens'

type Props = NativeStackScreenProps<MainStackParamList, 'Home'>

export function HomeScreen({ navigation }: Props) {
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

        <Pressable
          accessibilityHint="Abre el listado, búsqueda y filtros de casos"
          accessibilityRole="button"
          onPress={() => navigation.navigate('Cases')}
          style={styles.moduleCard}
        >
          <View style={styles.moduleBadge}>
            <Text style={styles.moduleBadgeText}>03</Text>
          </View>
          <View style={styles.moduleContent}>
            <Text style={styles.moduleTitle}>Gestión de casos</Text>
            <Text style={styles.moduleText}>Consulta, busca, filtra y registra casos.</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>

        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Gestión de casos disponible</Text>
          <Text style={styles.noticeText}>
            Consulta, creación, edición, estados, asignación e historial habilitados según tu rol.
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
  moduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  moduleBadge: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  moduleBadgeText: { color: colors.white, fontSize: 16, fontWeight: '800' },
  moduleContent: { flex: 1, gap: spacing.xs },
  moduleTitle: { color: colors.text, fontSize: 17, fontWeight: '800' },
  moduleText: { color: colors.textMuted, fontSize: 13 },
  chevron: { color: colors.primary, fontSize: 30, fontWeight: '600' },
})
