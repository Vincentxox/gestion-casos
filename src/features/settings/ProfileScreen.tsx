import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { PrimaryButton } from '@/components/buttons/PrimaryButton'
import { useAuthStore } from '@/store/authStore'
import { colors, radius, spacing } from '@/theme/tokens'

const ROLE_LABELS = {
  administrador: 'Administrador',
  auditor: 'Auditor',
  visualizador: 'Visualizador',
} as const

export function ProfileScreen() {
  const profile = useAuthStore((state) => state.profile)
  const session = useAuthStore((state) => state.session)
  const logout = useAuthStore((state) => state.logout)

  async function handleLogout() {
    try {
      await logout()
    } catch {
      Alert.alert('No fue posible cerrar sesión', 'Comprueba tu conexión e inténtalo nuevamente.')
    }
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>CUENTA</Text>
          <Text accessibilityRole="header" style={styles.title}>
            Mi perfil
          </Text>
          <Text style={styles.subtitle}>Consulta los datos vinculados con tu sesión.</Text>
        </View>

        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {profile?.fullName?.trim().charAt(0).toUpperCase() || 'U'}
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.field}>
            <Text style={styles.label}>Nombre</Text>
            <Text style={styles.value}>{profile?.fullName || 'Usuario'}</Text>
          </View>
          <View style={styles.separator} />
          <View style={styles.field}>
            <Text style={styles.label}>Correo electrónico</Text>
            <Text style={styles.value}>{session?.user.email || 'No disponible'}</Text>
          </View>
          <View style={styles.separator} />
          <View style={styles.field}>
            <Text style={styles.label}>Rol asignado</Text>
            <Text style={styles.role}>
              {profile?.role ? ROLE_LABELS[profile.role] : 'Sin asignar'}
            </Text>
          </View>
          <View style={styles.separator} />
          <View style={styles.field}>
            <Text style={styles.label}>Área</Text>
            <Text style={styles.value}>{profile?.areaName || 'Sin área asignada'}</Text>
          </View>
        </View>

        <Text style={styles.securityNote}>
          Los permisos de la aplicación se aplican automáticamente de acuerdo con tu rol.
        </Text>

        <PrimaryButton label="Cerrar sesión" onPress={() => void handleLogout()} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, gap: spacing.lg, padding: spacing.lg },
  header: { gap: spacing.sm },
  eyebrow: { color: colors.primary, fontSize: 12, fontWeight: '800', letterSpacing: 1.2 },
  title: { color: colors.text, fontSize: 28, fontWeight: '800' },
  subtitle: { color: colors.textMuted, fontSize: 15, lineHeight: 22 },
  avatar: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    borderRadius: 36,
    backgroundColor: colors.primary,
  },
  avatarText: { color: colors.white, fontSize: 28, fontWeight: '800' },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
  field: { gap: spacing.xs },
  label: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  value: { color: colors.text, fontSize: 16, fontWeight: '600' },
  role: { color: colors.primary, fontSize: 16, fontWeight: '800' },
  separator: { height: 1, marginVertical: spacing.md, backgroundColor: colors.border },
  securityNote: { color: colors.textMuted, fontSize: 13, lineHeight: 20, textAlign: 'center' },
})
