import { useState } from 'react'
import { Alert, StyleSheet, Text } from 'react-native'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ScreenContainer } from '@/components/ui/ScreenContainer'
import { FormField } from '@/components/forms/FormField'
import { useAuthStore } from '@/store/authStore'
import { colors, spacing, typography } from '@/theme/tokens'

import { updateOwnName } from './profileService'

export function CompleteNameScreen() {
  const profile = useAuthStore((state) => state.profile)
  const applyOwnName = useAuthStore((state) => state.applyOwnName)
  const logout = useAuthStore((state) => state.logout)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!profile) return
    setSaving(true)
    try {
      applyOwnName(await updateOwnName(profile.id, name))
    } catch (error) {
      Alert.alert(
        'No fue posible guardar',
        error instanceof Error ? error.message : 'Inténtalo de nuevo.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <ScreenContainer>
      <Card style={styles.card}>
        <Text accessibilityRole="header" style={styles.title}>
          Completa tu nombre
        </Text>
        <Text style={styles.description}>
          Necesitamos tu nombre para identificar tus solicitudes y mostrarlo a tu equipo.
        </Text>
        <FormField
          label="Nombre completo"
          autoCapitalize="words"
          maxLength={120}
          onChangeText={setName}
          placeholder="Tu nombre completo"
          value={name}
        />
        <Button label="Continuar" loading={saving} onPress={() => void save()} />
        <Button label="Cerrar sesión" variant="text" onPress={() => void logout()} />
      </Card>
    </ScreenContainer>
  )
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.lg,
    padding: spacing.lg,
    marginTop: spacing.xl,
  },
  title: { color: colors.text, ...typography.display },
  description: { color: colors.textMuted, ...typography.body },
})
