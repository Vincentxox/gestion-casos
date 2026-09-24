import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { FormField } from '@/components/forms/FormField'
import { StatusBadge } from '@/components/badges/StatusBadge'
import { RequestState } from '@/components/feedback/RequestState'
import { KeyboardFormScrollView } from '@/components/layout/KeyboardFormScrollView'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import type { MainStackParamList } from '@/navigation/types'
import { useAuthStore } from '@/store/authStore'
import { colors, radius, spacing, typography } from '@/theme/tokens'
import { actionMeta } from '@/theme/statusMeta'

import { changeCaseStatusSchema } from '../schemas'
import { getAvailableCaseActions } from '../casePermissions'
import type { CaseAction } from '../types'
import { useCaseDetail, useChangeCaseStatus } from '../useCases'

type Props = NativeStackScreenProps<MainStackParamList, 'ChangeCaseStatus'>

export function ChangeCaseStatusScreen({ navigation, route }: Props) {
  const profile = useAuthStore((state) => state.profile)
  const detail = useCaseDetail(route.params.caseId)
  const mutation = useChangeCaseStatus(route.params.caseId)
  const [action, setAction] = useState<CaseAction | null>(route.params.action ?? null)
  const [comment, setComment] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  if (detail.isLoading) {
    return <RequestState kind="loading" title="Cargando solicitud…" />
  }

  if (!detail.data || detail.error)
    return (
      <RequestState
        kind="error"
        title="No fue posible cargar la solicitud"
        onRetry={() => void detail.refetch()}
      />
    )

  const availableActions = getAvailableCaseActions(detail.data, profile).filter(
    (item) => item !== 'asignar',
  )
  if (availableActions.length === 0)
    return (
      <RequestState
        kind="empty"
        title="No hay acciones disponibles para tu rol y el estado actual"
      />
    )

  const selectedAction =
    action && availableActions.some((item) => item === action) ? action : availableActions[0]!

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
      Alert.alert('Acción realizada', 'El cambio quedó registrado en el historial.', [
        { text: 'Entendido', onPress: () => navigation.goBack() },
      ])
    } catch (error) {
      Alert.alert(
        'No fue posible completar la acción',
        error instanceof Error ? error.message : 'Comprueba tus permisos y la conexión.',
      )
    }
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <KeyboardFormScrollView contentContainerStyle={styles.content}>
        <Text style={styles.currentLabel}>Estado actual</Text>
        <StatusBadge status={detail.data.status} />

        <Text style={styles.label}>Acción</Text>
        <View style={styles.options}>
          {availableActions.map((value) => {
            const isSelected = value === selectedAction
            return (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
                key={value}
                onPress={() => setAction(value)}
                style={[styles.option, isSelected && styles.optionSelected]}
              >
                <Icon
                  name={actionMeta[value].icon}
                  color={['rechazar', 'cancelar'].includes(value) ? colors.error : colors.primary}
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
        {errors.action ? <Text style={styles.error}>{errors.action}</Text> : null}

        <FormField
          error={errors.comment}
          label={
            selectedAction === 'rechazar' || selectedAction === 'pausar'
              ? 'Motivo obligatorio'
              : 'Comentario (opcional)'
          }
          maxLength={500}
          multiline
          onChangeText={setComment}
          placeholder="Explica por qué cambia el estado"
          style={styles.comment}
          textAlignVertical="top"
          value={comment}
        />
        <Button
          label={`Confirmar: ${actionMeta[selectedAction].label}`}
          variant={['rechazar', 'cancelar'].includes(selectedAction) ? 'danger' : 'primary'}
          loading={mutation.isPending}
          onPress={() => void handleSubmit()}
        />
      </KeyboardFormScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { gap: spacing.md, padding: spacing.lg, paddingBottom: spacing.xl },
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
  optionContent: { flex: 1, gap: spacing.xs },
  optionText: { ...typography.body, color: colors.text },
  optionDanger: { color: colors.error },
  optionDescription: { ...typography.caption, color: colors.textMuted },
  error: { ...typography.caption, color: colors.error },
  comment: { minHeight: 120, paddingTop: spacing.md },
})
