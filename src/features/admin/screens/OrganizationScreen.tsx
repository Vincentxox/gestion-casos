import { useState } from 'react'
import { ActivityIndicator, Alert, Share, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/forms/FormField'
import { KeyboardFormScrollView } from '@/components/layout/KeyboardFormScrollView'
import { useAuthStore } from '@/store/authStore'
import { colors, radius, spacing } from '@/theme/tokens'

import {
  useOrganization,
  useOrganizationJoinCode,
  useRegenerateOrganizationJoinCode,
  useRenameOrganization,
} from '../useOrganization'

export function OrganizationScreen() {
  const organizationId = useAuthStore((state) => state.profile?.organizationId)
  const organization = useOrganization(organizationId)
  const rename = useRenameOrganization(organizationId ?? '')
  const joinCode = useOrganizationJoinCode()
  const regenerate = useRegenerateOrganizationJoinCode()
  const applyOrganizationName = useAuthStore((state) => state.applyOrganizationName)
  const [draftName, setDraftName] = useState<string | null>(null)
  const name = draftName ?? organization.data?.name ?? ''

  async function save() {
    if (name.trim().length < 2 || name.trim().length > 120) {
      Alert.alert('Nombre inválido', 'Usa entre 2 y 120 caracteres.')
      return
    }
    try {
      const updated = await rename.mutateAsync(name)
      applyOrganizationName(updated.name)
      setDraftName(null)
      Alert.alert('Empresa actualizada')
    } catch {
      Alert.alert('No fue posible guardar', 'Comprueba tu conexión e inténtalo de nuevo.')
    }
  }

  function confirmRegeneration() {
    Alert.alert('Regenerar código', 'El código anterior dejará de funcionar.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Regenerar',
        style: 'destructive',
        onPress: () => {
          void regenerate
            .mutateAsync()
            .catch((error) =>
              Alert.alert(
                'No fue posible regenerar',
                error instanceof Error ? error.message : 'Inténtalo de nuevo.',
              ),
            )
        },
      },
    ])
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <KeyboardFormScrollView contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={styles.title}>
          Mi empresa
        </Text>
        {organization.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
        {organization.error ? (
          <Button label="Reintentar" onPress={() => void organization.refetch()} />
        ) : null}
        {organization.data ? (
          <View style={styles.card}>
            <FormField
              label="Nombre de la empresa"
              value={name}
              onChangeText={setDraftName}
              maxLength={120}
            />
            <Button label="Guardar nombre" loading={rename.isPending} onPress={() => void save()} />
          </View>
        ) : null}
        <View style={styles.card}>
          <Text style={styles.codeTitle}>Código de acceso</Text>
          {joinCode.isLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : joinCode.isError ? (
            <Button label="Reintentar" onPress={() => void joinCode.refetch()} />
          ) : (
            <>
              <Text selectable style={styles.code}>
                {joinCode.data}
              </Text>
              <Text style={styles.hint}>
                Compártelo solo con personas que deban solicitar acceso a esta empresa.
              </Text>
              <Button
                label="Compartir o copiar"
                onPress={() => {
                  void Share.share({
                    message: `Únete a ${organization.data?.name ?? 'mi empresa'} en Nexo Casos con el código ${joinCode.data}`,
                  })
                }}
              />
              <Button
                label="Regenerar código"
                loading={regenerate.isPending}
                onPress={confirmRegeneration}
              />
            </>
          )}
        </View>
      </KeyboardFormScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, gap: spacing.lg, padding: spacing.lg },
  title: { color: colors.text, fontSize: 28, fontWeight: '800' },
  card: {
    gap: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
  },
  codeTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  code: { color: colors.primary, fontSize: 28, fontWeight: '800', letterSpacing: 2 },
  hint: { color: colors.textMuted, fontSize: 14, lineHeight: 21 },
})
