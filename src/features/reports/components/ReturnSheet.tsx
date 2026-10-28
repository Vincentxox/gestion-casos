import { getErrorMessage } from '@/utils/errorMessage'
import { useState } from 'react'
import { StyleSheet, Text, TextInput, View } from 'react-native'

import { BottomSheet } from '@/components/sheets/BottomSheet'
import { Chip } from '@/components/ui/Chip'
import { colors, radius, spacing, typography } from '@/theme/tokens'

import { returnReportSchema } from '../schemas'

const QUICK_REASONS = ['Falta una foto', 'Recursos incompletos', 'Falta detalle del trabajo']

export function ReturnSheet({
  visible,
  loading,
  label,
  nextVersion,
  onClose,
  onReturn,
}: {
  visible: boolean
  loading: boolean
  label: string
  nextVersion: number
  onClose: () => void
  onReturn: (reason: string) => Promise<void>
}) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    const result = returnReportSchema.safeParse({ reason })
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Motivo inválido')
      return
    }
    try {
      setError(null)
      await onReturn(result.data.reason)
    } catch (cause) {
      setError(getErrorMessage(cause, 'No fue posible devolver el reporte.'))
    }
  }

  return (
    <BottomSheet
      title="Devolver reporte"
      visible={visible}
      onClose={onClose}
      form
      height="65%"
      footerAction={{ label, onPress: () => void submit(), loading, variant: 'destructive' }}
    >
      <Text style={styles.copy}>¿Qué le falta al reporte?</Text>
      <View accessibilityLabel="Motivos frecuentes" style={styles.quickReasons}>
        {QUICK_REASONS.map((quick) => (
          <Chip
            key={quick}
            label={quick}
            selected={reason.includes(quick)}
            onPress={() =>
              setReason((current) =>
                current.includes(quick)
                  ? current
                  : current.trim()
                    ? `${current.trim()}. ${quick}`
                    : quick,
              )
            }
          />
        ))}
      </View>
      <Text style={styles.copy}>Motivo de la devolución *</Text>
      <TextInput
        accessibilityLabel="Motivo de la devolución, obligatorio"
        multiline
        maxLength={500}
        placeholder="Falta la foto del tablero reparado"
        value={reason}
        onChangeText={setReason}
        style={styles.input}
      />
      <View style={styles.helpRow}>
        <Text style={styles.help}>El técnico lo verá en la versión {nextVersion} del reporte.</Text>
        <Text style={styles.counter}>{reason.length} / 500</Text>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  copy: { ...typography.body, color: colors.text },
  input: {
    minHeight: 100,
    borderRadius: radius.xl,
    padding: spacing.md,
    color: colors.text,
    backgroundColor: colors.surfaceMuted,
    textAlignVertical: 'top',
  },
  quickReasons: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  helpRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  help: { ...typography.caption, color: colors.textMuted, flex: 1 },
  counter: { ...typography.caption, color: colors.textMuted },
  error: { ...typography.caption, color: colors.error },
})
