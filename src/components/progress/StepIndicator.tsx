import { StyleSheet, Text, View } from 'react-native'
import type { CaseStatus } from '@/features/cases/types'
import { colors, spacing } from '@/theme/tokens'

const STEPS = ['Solicitado', 'Aceptado', 'Asignado', 'En ejecución', 'Reporte', 'Aprobado'] as const
const PROGRESS: Record<CaseStatus, number> = {
  solicitado: 0,
  aceptado: 1,
  rechazado: 0,
  cancelado: 0,
  asignado: 2,
  en_ejecucion: 3,
  en_espera: 3,
  reporte_enviado: 4,
  validado: 4,
  aprobado: 5,
}

export function StepIndicator({ status }: { status: CaseStatus }) {
  const active = PROGRESS[status]
  return (
    <View
      accessibilityLabel={`Paso ${active + 1} de ${STEPS.length}: ${STEPS[active]}`}
      style={styles.row}
    >
      {STEPS.map((step, index) => (
        <View key={step} style={styles.step}>
          <View style={[styles.dot, index <= active && styles.dotActive]} />
          <Text numberOfLines={2} style={[styles.label, index <= active && styles.labelActive]}>
            {step}
          </Text>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.xs },
  step: { flex: 1, alignItems: 'center', gap: spacing.xs },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.primary },
  label: { color: colors.textMuted, fontSize: 9, textAlign: 'center' },
  labelActive: { color: colors.primary, fontWeight: '700' },
})
