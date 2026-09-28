import { AppFeedback, useFeedback } from '@/components/feedback/AppFeedback'
import { useState } from 'react'
import { Share, StyleSheet, Text } from 'react-native'

import { Button } from '@/components/ui/Button'
import { RequestState } from '@/components/feedback/RequestState'
import { SkeletonList } from '@/components/ui/SkeletonList'
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
  const { confirm } = useFeedback()
  const organizationId = useAuthStore((state) => state.profile?.organizationId)
  const organization = useOrganization(organizationId)
  const rename = useRenameOrganization(organizationId ?? '')
  const joinCode = useOrganizationJoinCode()
  const regenerate = useRegenerateOrganizationJoinCode()
  const applyOrganizationName = useAuthStore((state) => state.applyOrganizationName)
  const [draftName, setDraftName] = useState<string | null>(null)
  const name = draftName ?? organization.data?.name ?? ''
  const nameChanged = Boolean(organization.data && name.trim() !== organization.data.name.trim())

  async function save() {
    if (name.trim().length < 2 || name.trim().length > 120) {
      AppFeedback.show('Nombre inválido', 'Usa entre 2 y 120 caracteres.')
      return
    }
    try {
      const updated = await rename.mutateAsync(name)
      applyOrganizationName(updated.name)
      setDraftName(null)
      AppFeedback.toast('Empresa actualizada')
    } catch {
      AppFeedback.show('No fue posible guardar', 'Comprueba tu conexión e inténtalo de nuevo.')
    }
  }

  async function confirmRegeneration() {
    if (
      !(await confirm({
        title: 'Regenerar código',
        message: 'Las personas con el código anterior ya no podrán usarlo. ¿Deseas continuar?',
        confirmLabel: 'Regenerar código',
        cancelLabel: 'Conservar código',
        tone: 'danger',
      }))
    )
      return
    try {
      await regenerate.mutateAsync()
      AppFeedback.toast('Código regenerado')
    } catch (error) {
      AppFeedback.show(
        'No fue posible regenerar',
        error instanceof Error ? error.message : 'Inténtalo de nuevo.',
      )
    }
  }

  return (
    <ScreenContainer edges={['bottom']} padded={false}>
      <KeyboardFormScrollView contentContainerStyle={styles.content}>
        {organization.isLoading ? <SkeletonList count={1} /> : null}
        {organization.error ? (
          <RequestState
            kind="error"
            title="No fue posible cargar la empresa"
            onRetry={() => void organization.refetch()}
          />
        ) : null}
        {organization.data ? (
          <Card contentStyle={styles.card}>
            <FormField
              label="Nombre de la empresa"
              value={name}
              onChangeText={setDraftName}
              maxLength={120}
            />
            <Button
              label="Guardar nombre"
              disabled={!nameChanged}
              loading={rename.isPending}
              onPress={() => void save()}
            />
          </Card>
        ) : null}
        <Card contentStyle={styles.card}>
          <Text style={styles.codeTitle}>Código de acceso</Text>
          {joinCode.isLoading ? (
            <SkeletonList count={1} />
          ) : joinCode.isError ? (
            <RequestState
              kind="error"
              title="No fue posible cargar el código"
              onRetry={() => void joinCode.refetch()}
            />
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
                icon="share-outline"
                variant="secondary"
                onPress={() => {
                  void Share.share({
                    message: `Únete a ${organization.data?.name ?? 'mi empresa'} en Nexo Casos con el código ${joinCode.data}`,
                  })
                }}
              />
              <Button
                label="Regenerar código"
                variant="text"
                destructive
                loading={regenerate.isPending}
                onPress={() => void confirmRegeneration()}
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
  card: { gap: spacing.lg, padding: spacing.lg },
  codeTitle: { ...typography.heading, color: colors.text },
  code: { ...typography.display, color: colors.primary, letterSpacing: 2 },
  hint: { ...typography.body, color: colors.textMuted },
})
