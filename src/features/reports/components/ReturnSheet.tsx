import { useState } from 'react'
import { Modal, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Button } from '@/components/ui/Button'
import { colors, radius, spacing, typography } from '@/theme/tokens'

import { returnReportSchema } from '../schemas'

export function ReturnSheet({
  visible,
  loading,
  label,
  onClose,
  onReturn,
}: {
  visible: boolean
  loading: boolean
  label: string
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
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <SafeAreaView edges={['bottom']} style={styles.sheet}>
          <Text accessibilityRole="header" style={styles.title}>
            Devolver reporte
          </Text>
          <Text style={styles.copy}>Motivo de la devolución</Text>
          <TextInput
            accessibilityLabel="Motivo de la devolución"
            multiline
            maxLength={500}
            placeholder="Falta la foto del tablero reparado"
            value={reason}
            onChangeText={setReason}
            style={styles.input}
          />
          <Text style={styles.counter}>{reason.length} / 500</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label={label} variant="danger" loading={loading} onPress={() => void submit()} />
          <Button label="Cancelar" variant="secondary" disabled={loading} onPress={onClose} />
        </SafeAreaView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.backdrop },
  sheet: {
    gap: spacing.md,
    padding: spacing.lg,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  title: { ...typography.title, color: colors.text },
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
  counter: { ...typography.caption, color: colors.textMuted, textAlign: 'right' },
  error: { ...typography.caption, color: colors.error },
})
