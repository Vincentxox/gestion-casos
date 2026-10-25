import { getErrorMessage } from '@/utils/errorMessage'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { StyleSheet, Text } from 'react-native'
import { AppFeedback } from '@/components/feedback/AppFeedback'
import { RequestState } from '@/components/feedback/RequestState'
import { FormField } from '@/components/forms/FormField'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ScreenContainer } from '@/components/ui/ScreenContainer'
import { usePriorityTargets, useSetPriorityTarget } from '@/features/home/useIndicators'
import type { PriorityTarget } from '@/features/home/indicatorsService'
import {
  priorityTargetFormSchema,
  type PriorityTargetFormInput,
  type PriorityTargetValues,
} from '@/features/home/schemas'
import { KeyboardFormScrollView } from '@/components/layout/KeyboardFormScrollView'
import { priorityMeta } from '@/theme/statusMeta'
import { useAuthStore } from '@/store/authStore'
import { colors, spacing, typography } from '@/theme/tokens'

function TargetEditor({ target }: { target: PriorityTarget }) {
  const update = useSetPriorityTarget()
  const {
    control,
    handleSubmit,
    formState: { errors, isDirty, isValid },
  } = useForm<PriorityTargetFormInput, unknown, PriorityTargetValues>({
    resolver: zodResolver(priorityTargetFormSchema),
    mode: 'onChange',
    defaultValues: {
      acceptHours: String(target.acceptHours),
      resolveHours: String(target.resolveHours),
    },
  })

  async function save({ acceptHours, resolveHours }: PriorityTargetValues) {
    try {
      await update.mutateAsync({ priority: target.priority, acceptHours, resolveHours })
      AppFeedback.toast(
        `Plazos de prioridad ${priorityMeta[target.priority].label.toLowerCase()} actualizados`,
        { tone: 'success' },
      )
    } catch (error) {
      AppFeedback.show('No fue posible guardar', getErrorMessage(error, 'Inténtalo de nuevo.'), {
        tone: 'error',
      })
    }
  }

  return (
    <Card contentStyle={styles.card}>
      <Text style={styles.heading}>Prioridad {priorityMeta[target.priority].label}</Text>
      <Controller
        control={control}
        name="acceptHours"
        render={({ field: { value, onChange, onBlur } }) => (
          <FormField
            label="Horas para aceptar"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.acceptHours?.message}
            keyboardType="number-pad"
          />
        )}
      />
      <Controller
        control={control}
        name="resolveHours"
        render={({ field: { value, onChange, onBlur } }) => (
          <FormField
            label="Horas para resolver"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.resolveHours?.message}
            keyboardType="number-pad"
          />
        )}
      />
      <Button
        label={`Guardar prioridad ${priorityMeta[target.priority].label.toLowerCase()}`}
        disabled={!isDirty || !isValid}
        loading={update.isPending}
        onPress={handleSubmit(save)}
      />
    </Card>
  )
}

export function PriorityTargetsScreen() {
  const organizationId = useAuthStore((state) => state.profile?.organizationId)
  const targets = usePriorityTargets(organizationId)
  return (
    <ScreenContainer edges={[]} padded={false}>
      <KeyboardFormScrollView contentContainerStyle={styles.content}>
        <Text style={styles.note}>
          Los cambios se aplican solo a solicitudes nuevas. Los plazos de solicitudes existentes se
          conservan.
        </Text>
        {targets.isLoading ? <RequestState kind="loading" title="Cargando plazos…" /> : null}
        {targets.isError ? (
          <RequestState
            kind="error"
            title="No fue posible cargar los plazos"
            onRetry={() => void targets.refetch()}
          />
        ) : null}
        {targets.data?.length === 0 ? (
          <Text style={styles.note}>No hay plazos configurados para esta empresa.</Text>
        ) : null}
        {targets.data?.map((target) => (
          <TargetEditor
            key={`${target.priority}-${target.acceptHours}-${target.resolveHours}`}
            target={target}
          />
        ))}
      </KeyboardFormScrollView>
    </ScreenContainer>
  )
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, padding: spacing.lg, paddingTop: spacing.md },
  card: { gap: spacing.md },
  heading: { ...typography.heading, color: colors.text },
  note: { ...typography.body, color: colors.textMuted },
})
