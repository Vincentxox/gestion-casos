import { StyleSheet, View } from 'react-native'

import type { CaseStatus } from '@/features/cases/types'
import { statusMeta } from '@/theme/statusMeta'
import { colors } from '@/theme/tokens'

const STEP_COUNT = 6

const progress: Record<CaseStatus, number> = {
  solicitado: 0,
  aceptado: 1,
  asignado: 2,
  en_ejecucion: 3,
  en_espera: 3,
  reporte_enviado: 4,
  validado: 4,
  aprobado: 5,
  rechazado: 0,
  cancelado: 0,
}

export function caseProgressStep(status: CaseStatus): number {
  return progress[status]
}

/** Línea nexo del caso: pasos hechos en azul, el actual como anillo celeste. */
export function CaseProgressDots({ status }: { status: CaseStatus }) {
  const active = progress[status]
  const finished = status === 'aprobado'
  return (
    <View
      accessibilityLabel={`Avance: ${statusMeta[status].label.toLowerCase()}, paso ${active + 1} de ${STEP_COUNT}`}
      accessibilityRole="progressbar"
      style={styles.row}
      testID="case-progress"
    >
      {Array.from({ length: STEP_COUNT }, (_, index) => {
        const done = index < active || (finished && index === active)
        const current = index === active && !finished
        return (
          <View key={index} style={[styles.segment, index === STEP_COUNT - 1 && styles.last]}>
            <View
              style={[
                styles.dot,
                done && (index === 0 ? styles.dotStart : styles.dotDone),
                current && styles.dotCurrent,
              ]}
            />
            {index < STEP_COUNT - 1 ? (
              <View style={[styles.bar, index < active && styles.barDone]} />
            ) : null}
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  segment: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  last: { flex: 0 },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.track },
  dotStart: { backgroundColor: colors.ink },
  dotDone: { backgroundColor: colors.primary },
  dotCurrent: {
    borderWidth: 3,
    borderColor: colors.sky,
    backgroundColor: colors.background,
  },
  bar: { flex: 1, height: 4, marginHorizontal: -1, backgroundColor: colors.track },
  barDone: { backgroundColor: colors.primary },
})
