import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { useState } from 'react'
import appConfig from '../../../app.json'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Button } from '@/components/ui/Button'
import { ROLE_LABELS } from '@/features/auth/types'
import { useAuthStore } from '@/store/authStore'
import { colors, radius, spacing } from '@/theme/tokens'
import { updateOwnName } from './profileService'

export function ProfileScreen() {
  const profile = useAuthStore((state) => state.profile)
  const session = useAuthStore((state) => state.session)
  const logout = useAuthStore((state) => state.logout)
  const applyOwnName = useAuthStore((state) => state.applyOwnName)
  const [name, setName] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function saveName() {
    if (!profile) return
    setSaving(true)
    try {
      applyOwnName(await updateOwnName(profile.id, name ?? profile.fullName))
      setName(null)
      Alert.alert('Nombre actualizado')
    } catch (error) {
      Alert.alert(
        'No fue posible guardar',
        error instanceof Error ? error.message : 'Inténtalo de nuevo.',
      )
    } finally {
      setSaving(false)
    }
  }

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
            <TextInput
              accessibilityLabel="Nombre completo"
              maxLength={120}
              onChangeText={setName}
              style={styles.value}
              value={name ?? profile?.fullName ?? ''}
            />
            {name !== null && name.trim() !== profile?.fullName ? (
              <Button label="Guardar nombre" loading={saving} onPress={() => void saveName()} />
            ) : null}
          </View>
          <View style={styles.separator} />
          <View style={styles.field}>
            <Text style={styles.label}>Empresa</Text>
            <Text style={styles.value}>{profile?.organizationName || 'Sin empresa'}</Text>
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
        <Text style={styles.securityNote}>Versión {appConfig.expo.version}</Text>

        <Button label="Cerrar sesión" onPress={() => void handleLogout()} />
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
