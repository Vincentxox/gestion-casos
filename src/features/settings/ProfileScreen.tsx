import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useState } from 'react'
import appConfig from '../../../app.json'

import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/forms/FormField'
import { Icon } from '@/components/ui/Icon'
import { Avatar } from '@/components/ui/Avatar'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { ScreenContainer } from '@/components/ui/ScreenContainer'
import { ROLE_ICONS, ROLE_LABELS } from '@/features/auth/types'
import { useAuthStore } from '@/store/authStore'
import { colors, spacing, typography } from '@/theme/tokens'
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
    <ScreenContainer padded={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>CUENTA</Text>
          <Text accessibilityRole="header" style={styles.title}>
            Mi perfil
          </Text>
          <Text style={styles.subtitle}>Consulta los datos vinculados con tu sesión.</Text>
        </View>

        <View style={styles.avatar}>
          <Avatar name={profile?.fullName || 'Usuario'} id={profile?.id || 'user'} size={72} />
        </View>

        <Card style={styles.card}>
          <View style={styles.field}>
            <Text style={styles.label}>Nombre</Text>
            {name === null ? (
              <View style={styles.nameRow}>
                <Text style={styles.value}>{profile?.fullName || 'Sin nombre'}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Editar nombre"
                  onPress={() => setName(profile?.fullName ?? '')}
                  style={styles.editName}
                >
                  <Icon name="create-outline" color={colors.primary} />
                </Pressable>
              </View>
            ) : (
              <>
                <FormField
                  label="Nombre completo"
                  maxLength={120}
                  onChangeText={setName}
                  value={name}
                />
                <View style={styles.nameActions}>
                  <Button label="Guardar" loading={saving} onPress={() => void saveName()} />
                  <Button label="Cancelar" variant="text" onPress={() => setName(null)} />
                </View>
              </>
            )}
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
            {profile?.role ? (
              <Chip label={ROLE_LABELS[profile.role]} icon={ROLE_ICONS[profile.role]} tone="info" />
            ) : (
              <Text style={styles.value}>Sin asignar</Text>
            )}
          </View>
          <View style={styles.separator} />
          <View style={styles.field}>
            <Text style={styles.label}>Área</Text>
            <Text style={styles.value}>{profile?.areaName || 'Sin área asignada'}</Text>
          </View>
        </Card>

        <Text style={styles.securityNote}>
          Los permisos de la aplicación se aplican automáticamente de acuerdo con tu rol.
        </Text>
        <Button label="Cerrar sesión" variant="secondary" onPress={() => void handleLogout()} />
        <Text style={styles.securityNote}>Versión {appConfig.expo.version}</Text>
      </ScrollView>
    </ScreenContainer>
  )
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, gap: spacing.lg, padding: spacing.lg },
  header: { gap: spacing.sm },
  eyebrow: { ...typography.overline, color: colors.primary },
  title: { ...typography.display, color: colors.text },
  subtitle: { ...typography.body, color: colors.textMuted },
  avatar: { alignItems: 'center' },
  card: { padding: spacing.lg },
  field: { gap: spacing.xs },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nameActions: { flexDirection: 'row', gap: spacing.sm },
  editName: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  label: { ...typography.caption, color: colors.textMuted },
  value: { ...typography.body, color: colors.text },
  separator: { height: 1, marginVertical: spacing.md, backgroundColor: colors.border },
  securityNote: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
})
