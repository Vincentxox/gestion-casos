import { useState } from 'react'
import { ActivityIndicator, Alert, Share, StyleSheet, Text } from 'react-native'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ScreenContainer } from '@/components/ui/ScreenContainer'
import { FormField } from '@/components/forms/FormField'
import { KeyboardFormScrollView } from '@/components/layout/KeyboardFormScrollView'
import { useAuthStore } from '@/store/authStore'
import { colors, spacing, typography } from '@/theme/tokens'

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
    <ScreenContainer edges={['bottom']} padded={false}>
      <KeyboardFormScrollView contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={styles.title}>
          Mi empresa
        </Text>
        {organization.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
        {organization.error ? (
          <Button label="Reintentar" onPress={() => void organization.refetch()} />
        ) : null}
        {organization.data ? (
          <Card contentStyle={styles.card}>
            <FormField
              label="Nombre de la empresa"
              value={name}
              onChangeText={setDraftName}
              maxLength={120}
            />
            <Button label="Guardar nombre" loading={rename.isPending} onPress={() => void save()} />
          </Card>
        ) : null}
        <Card contentStyle={styles.card}>
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
        </Card>
      </KeyboardFormScrollView>
    </ScreenContainer>
  )
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, gap: spacing.lg, padding: spacing.lg },
  title: { ...typography.display, color: colors.text },
  card: { gap: spacing.lg, padding: spacing.lg },
  codeTitle: { ...typography.heading, color: colors.text },
  code: { ...typography.display, color: colors.primary, letterSpacing: 2 },
  hint: { ...typography.body, color: colors.textMuted },
})
