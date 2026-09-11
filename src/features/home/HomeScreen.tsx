import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { hasPermission } from '@/features/auth/permissions'
import type { MainTabParamList } from '@/navigation/types'
import { useAuthStore } from '@/store/authStore'
import { colors, radius, spacing } from '@/theme/tokens'

type Props = BottomTabScreenProps<MainTabParamList, 'Home'>

export function HomeScreen({ navigation }: Props) {
  const profile = useAuthStore((state) => state.profile)
  const canCreate = hasPermission(profile?.role, 'cases.create')

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
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
          onPress={() => navigation.navigate('CasesTab', { screen: 'Cases' })}
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

        {canCreate ? (
          <Pressable
            accessibilityHint="Abre el formulario para registrar un caso"
            accessibilityRole="button"
            onPress={() => navigation.navigate('CasesTab', { screen: 'CreateCase' })}
            style={styles.quickAction}
          >
            <Text style={styles.quickActionSymbol}>＋</Text>
            <View style={styles.moduleContent}>
              <Text style={styles.quickActionTitle}>Crear un caso</Text>
              <Text style={styles.moduleText}>Registra una nueva solicitud de seguimiento.</Text>
            </View>
          </Pressable>
        ) : null}

        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Gestión de casos disponible</Text>
          <Text style={styles.noticeText}>
            Consulta, creación, edición, estados, asignación e historial habilitados según tu rol.
          </Text>
        </View>

        <Pressable
          accessibilityHint="Abre los datos de tu cuenta y la opción para cerrar sesión"
          accessibilityRole="button"
          onPress={() => navigation.navigate('Profile')}
          style={styles.accountLink}
        >
          <Text style={styles.accountLinkText}>Ver mi perfil y opciones de sesión</Text>
          <Text style={styles.accountChevron}>›</Text>
        </Pressable>
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
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    padding: spacing.md,
  },
  quickActionSymbol: { color: colors.primary, fontSize: 32, fontWeight: '500' },
  quickActionTitle: { color: colors.primaryDark, fontSize: 16, fontWeight: '800' },
  accountLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: spacing.md,
  },
  accountLinkText: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  accountChevron: { color: colors.primary, fontSize: 24 },
})
