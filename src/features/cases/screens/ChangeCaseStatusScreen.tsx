import { getErrorMessage } from '@/utils/errorMessage'
import { AppFeedback } from '@/components/feedback/AppFeedback'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { FormField } from '@/components/forms/FormField'
import { StatusBadge } from '@/components/badges/StatusBadge'
import { RequestState } from '@/components/feedback/RequestState'
import { KeyboardFormScrollView } from '@/components/layout/KeyboardFormScrollView'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import type { MainStackParamList } from '@/navigation/types'
import { colors, radius, spacing, typography } from '@/theme/tokens'
import { actionMeta, actionToastMeta } from '@/theme/statusMeta'

import { changeCaseStatusSchema } from '../schemas'
import type { CaseAction, CaseStatus } from '../types'
import { useCaseActions, useCaseDetail, useChangeCaseStatus } from '../useCases'

type Props = NativeStackScreenProps<MainStackParamList, 'ChangeCaseStatus'>

const statusActions = ['aceptar', 'rechazar', 'cancelar', 'iniciar', 'pausar', 'reanudar'] as const
type StatusAction = (typeof statusActions)[number]
const destination: Record<StatusAction, CaseStatus> = {
  aceptar: 'aceptado',
  rechazar: 'rechazado',
  cancelar: 'cancelado',
  iniciar: 'en_ejecucion',
  pausar: 'en_espera',
  reanudar: 'en_ejecucion',
}

export function statusActionPresentation(action: StatusAction) {
  return {
    label: actionMeta[action].label,
    commentLabel:
      action === 'rechazar'
        ? 'Motivo del rechazo'
        : action === 'pausar'
          ? 'Motivo de la pausa'
          : 'Comentario (opcional)',
    variant: (action === 'rechazar' || action === 'cancelar' ? 'destructive' : 'primary') as
      'destructive' | 'primary',
  }
}

export function ChangeCaseStatusScreen({ navigation, route }: Props) {
  const detail = useCaseDetail(route.params.caseId)
  const actions = useCaseActions(route.params.caseId)
  const mutation = useChangeCaseStatus(route.params.caseId)
  const [action, setAction] = useState<CaseAction | null>(route.params.action ?? null)
  const [comment, setComment] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  if (detail.isLoading || actions.isPending) {
    return <RequestState kind="loading" title="Cargando solicitud…" />
  }

  if (!detail.data || detail.error || actions.error)
    return (
      <RequestState
        kind="error"
        title="No fue posible cargar la solicitud"
        onRetry={() => {
          void detail.refetch()
          void actions.refetch()
        }}
      />
    )

  const availableActions = statusActions.filter((item) => actions.data?.[item]?.allowed === true)
  if (availableActions.length === 0)
    return (
      <RequestState
        kind="empty"
        title="No hay acciones disponibles para tu rol y el estado actual"
      />
    )

  const selectedAction = availableActions.find((item) => item === action) ?? availableActions[0]!
  const presentation = statusActionPresentation(selectedAction)

  async function handleSubmit() {
    const result = changeCaseStatusSchema.safeParse({ action: selectedAction, comment })
    if (!result.success) {
      const nextErrors: Record<string, string> = {}
      for (const issue of result.error.issues) nextErrors[String(issue.path[0])] ??= issue.message
      setErrors(nextErrors)
      return
    }

    setErrors({})
    try {
      await mutation.mutateAsync(result.data)
      AppFeedback.toast(actionToastMeta[selectedAction].message, {
        tone: actionToastMeta[selectedAction].tone,
      })
      navigation.goBack()
    } catch (error) {
      AppFeedback.show(
        'No fue posible completar la acción',
        getErrorMessage(error, 'Comprueba tus permisos y la conexión.'),
        { tone: 'error' },
      )
    }
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <KeyboardFormScrollView contentContainerStyle={styles.content}>
        <View style={styles.transition}>
          <Text style={styles.currentLabel}>
            {detail.data.caseNumber} · {detail.data.title}
          </Text>
          <View style={styles.transitionRow}>
            <StatusBadge status={detail.data.status} />
            <Icon name="arrow-forward" color={colors.textMuted} />
            <StatusBadge status={destination[selectedAction]} />
          </View>
        </View>

        {availableActions.length > 1 ? (
          <>
            <Text style={styles.label}>¿Qué quieres hacer?</Text>
            <View accessibilityRole="radiogroup" style={styles.options}>
              {availableActions.map((value) => {
                const isSelected = value === selectedAction
                return (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ checked: isSelected }}
                    key={value}
                    onPress={() => {
                      setAction(value)
                      setErrors({})
                    }}
                    style={({ pressed }) => [
                      styles.option,
                      isSelected && styles.optionSelected,
                      pressed && styles.optionPressed,
                    ]}
                  >
                    <View style={[styles.radio, isSelected && styles.radioSelected]} />
                    <Icon
                      name={actionMeta[value].icon}
                      color={
                        ['rechazar', 'cancelar'].includes(value) ? colors.error : colors.primary
                      }
                    />
                    <View style={styles.optionContent}>
                      <Text
                        style={[
                          styles.optionText,
                          ['rechazar', 'cancelar'].includes(value) && styles.optionDanger,
                        ]}
                      >
                        {actionMeta[value].label}
                      </Text>
                      <Text style={styles.optionDescription}>{actionMeta[value].description}</Text>
                    </View>
                    {isSelected ? <Icon name="checkmark-circle" color={colors.primary} /> : null}
                  </Pressable>
                )
              })}
            </View>
          </>
        ) : null}
        {errors.action ? <Text style={styles.error}>{errors.action}</Text> : null}

        <FormField
          error={errors.comment}
          label={presentation.commentLabel}
          maxLength={500}
          multiline
          onChangeText={setComment}
          placeholder="Explica por qué cambia el estado"
          style={styles.comment}
          textAlignVertical="top"
          value={comment}
        />
      </KeyboardFormScrollView>
      <View style={styles.footer}>
        <Button
          label={presentation.label}
          variant={presentation.variant}
          loading={mutation.isPending}
          onPress={() => void handleSubmit()}
        />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { gap: spacing.md, padding: spacing.lg, paddingBottom: spacing.xl },
  footer: { padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  transition: {
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
  },
  transitionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  currentLabel: { ...typography.caption, color: colors.textMuted },
  label: { ...typography.body, color: colors.text },
  options: { gap: spacing.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  optionSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  optionPressed: { backgroundColor: colors.surfaceMuted },
  radio: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: colors.textMuted,
    borderRadius: radius.pill,
  },
  radioSelected: { borderWidth: 7, borderColor: colors.primary },
  optionContent: { flex: 1, gap: spacing.xs },
  optionText: { ...typography.body, color: colors.text },
  optionDanger: { color: colors.error },
  optionDescription: { ...typography.caption, color: colors.textMuted },
  error: { ...typography.caption, color: colors.error },
  comment: { minHeight: 120, paddingTop: spacing.md },
})
