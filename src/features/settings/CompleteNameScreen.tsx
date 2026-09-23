import { useState } from 'react'
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/store/authStore'
import { colors, radius, spacing, typography } from '@/theme/tokens'

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
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.title}>
          Completa tu nombre
        </Text>
        <Text style={styles.description}>
          Necesitamos tu nombre para identificar tus solicitudes y mostrarlo a tu equipo.
        </Text>
        <TextInput
          accessibilityLabel="Nombre completo"
          autoCapitalize="words"
          maxLength={120}
          onChangeText={setName}
          placeholder="Tu nombre completo"
          style={styles.input}
          value={name}
        />
        <Button label="Continuar" loading={saving} onPress={() => void save()} />
        <Button label="Cerrar sesión" onPress={() => void logout()} />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  card: {
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  title: { color: colors.text, ...typography.display },
  description: { color: colors.textMuted, ...typography.body },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    color: colors.text,
  },
})
