import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useState } from 'react'
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { FormField } from '@/components/forms/FormField'
import { KeyboardFormScrollView } from '@/components/layout/KeyboardFormScrollView'
import { Button } from '@/components/ui/Button'
import type { MainStackParamList } from '@/navigation/types'
import { useAuthStore } from '@/store/authStore'
import { colors, radius, spacing } from '@/theme/tokens'

import { changeCaseStatusSchema } from '../schemas'
import { getAvailableCaseActions } from '../casePermissions'
import type { CaseAction } from '../types'
import { getStatusLabel } from '../caseService'
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
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    )
  }

  if (!detail.data || detail.error) return <Message text="No fue posible cargar el caso." />

  const availableActions = getAvailableCaseActions(detail.data, profile).filter(
    (item) => item !== 'asignar',
  )
  if (availableActions.length === 0)
    return <Message text="No hay acciones disponibles para tu rol y el estado actual." />

  const selectedAction =
    action && availableActions.some((item) => item === action) ? action : availableActions[0]

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
        <Text style={styles.currentValue}>{getStatusLabel(detail.data.status)}</Text>

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
                style={[styles.option, isSelected ? styles.optionSelected : null]}
              >
                <Text style={[styles.optionText, isSelected ? styles.optionTextSelected : null]}>
                  {value.charAt(0).toUpperCase() + value.slice(1)}
                </Text>
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
          label="Confirmar cambio"
          loading={mutation.isPending}
          onPress={() => void handleSubmit()}
        />
      </KeyboardFormScrollView>
    </SafeAreaView>
  )
}

function Message({ text }: { text: string }) {
  return (
    <View style={styles.center}>
      <Text style={styles.message}>{text}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { gap: spacing.md, padding: spacing.lg, paddingBottom: spacing.xl },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  message: { color: colors.textMuted, textAlign: 'center' },
  currentLabel: { color: colors.textMuted, fontSize: 13, fontWeight: '700' },
  currentValue: { color: colors.text, fontSize: 22, fontWeight: '800' },
  label: { color: colors.text, fontSize: 14, fontWeight: '700' },
  options: { gap: spacing.sm },
  option: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  optionSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  optionDisabled: { opacity: 0.55 },
  optionText: { color: colors.text, fontWeight: '700' },
  optionTextSelected: { color: colors.primary },
  error: { color: colors.error, fontSize: 12 },
  comment: { minHeight: 120, paddingTop: spacing.md },
})
