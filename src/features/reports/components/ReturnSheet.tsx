import { useState } from 'react'
import { StyleSheet, Text, TextInput, View } from 'react-native'

import { BottomSheet } from '@/components/sheets/BottomSheet'
import { colors, radius, spacing, typography } from '@/theme/tokens'

import { returnReportSchema } from '../schemas'

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
      setError(cause instanceof Error ? cause.message : 'No fue posible devolver el reporte.')
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
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.text,
    backgroundColor: colors.white,
  },
  helpRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  help: { ...typography.caption, color: colors.textMuted, flex: 1 },
  counter: { ...typography.caption, color: colors.textMuted },
  error: { ...typography.caption, color: colors.error },
})
