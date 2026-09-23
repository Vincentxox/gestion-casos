import { StyleSheet, Text, View } from 'react-native'
import Animated, { LinearTransition, useReducedMotion } from 'react-native-reanimated'

import { Icon, type IconName } from '@/components/ui/Icon'
import type { CaseStatus } from '@/features/cases/types'
import { statusMeta } from '@/theme/statusMeta'
import { colors, fonts, phaseColors, radius, spacing, typography } from '@/theme/tokens'

const steps: { label: string; icon: IconName }[] = [
  { label: 'Solicitada', icon: 'file-tray-outline' },
  { label: 'Aceptada', icon: 'checkmark-circle-outline' },
  { label: 'Asignada', icon: 'person-add-outline' },
  { label: 'En ejecución', icon: 'construct-outline' },
  { label: 'Reporte', icon: 'document-text-outline' },
  { label: 'Aprobada', icon: 'checkmark-done-outline' },
]
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

export function ProgressTracker({
  status,
  reason,
}: {
  status: CaseStatus
  reason?: string | null
}) {
  const meta = statusMeta[status]
  const phase = phaseColors[meta.phase]
  const reduceMotion = useReducedMotion()
  if (status === 'rechazado' || status === 'cancelado') {
    return (
      <View style={[styles.terminal, { backgroundColor: phase.bg }]}>
        <Icon name={meta.icon} size="base" color={phase.fg} />
        <View style={styles.terminalText}>
          <Text style={[styles.terminalTitle, { color: phase.fg }]}>{meta.label}</Text>
          {reason ? <Text style={styles.reason}>{reason}</Text> : null}
        </View>
      </View>
    )
  }
  const active = progress[status]
  return (
    <View
      accessibilityLabel={`Progreso: paso ${active + 1} de ${steps.length}, ${steps[active]?.label}`}
    >
      <Text style={styles.heading}>
        Progreso · Paso {active + 1} de {steps.length}
      </Text>
      <Animated.View
        layout={reduceMotion ? undefined : LinearTransition.duration(250)}
        style={styles.row}
      >
        {steps.map((step, index) => {
          const complete = index < active || status === 'aprobado'
          const current = index === active && status !== 'aprobado'
          return (
            <View key={step.label} style={styles.stepWrap}>
              {index > 0 ? (
                <View style={[styles.line, index <= active && styles.lineComplete]} />
              ) : null}
              <Animated.View
                layout={reduceMotion ? undefined : LinearTransition.duration(250)}
                style={[
                  styles.node,
                  complete && styles.nodeComplete,
                  current && { backgroundColor: phase.bg, borderColor: phase.fg, borderWidth: 2 },
                ]}
              >
                {complete ? (
                  <Icon name="checkmark" size={18} color={colors.white} />
                ) : current ? (
                  <Icon
                    name={status === 'en_espera' ? 'pause-outline' : step.icon}
                    size={17}
                    color={phase.fg}
                  />
                ) : (
                  <Text style={styles.pending}>{index + 1}</Text>
                )}
              </Animated.View>
              <Text
                numberOfLines={2}
                style={[styles.label, (complete || current) && styles.activeLabel]}
              >
                {step.label}
              </Text>
            </View>
          )
        })}
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  heading: { ...typography.heading, color: colors.text, marginBottom: spacing.md },
  row: { flexDirection: 'row' },
  stepWrap: { flex: 1, alignItems: 'center', gap: spacing.xs },
  line: {
    position: 'absolute',
    right: '50%',
    width: '100%',
    height: 3,
    top: 15,
    backgroundColor: colors.border,
  },
  lineComplete: { backgroundColor: phaseColors.cerrada.fg },
  node: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeComplete: { backgroundColor: phaseColors.cerrada.fg, borderColor: phaseColors.cerrada.fg },
  pending: { ...typography.caption, color: colors.textMuted },
  label: { ...typography.overline, color: colors.textMuted, textAlign: 'center' },
  activeLabel: { color: colors.text, fontFamily: fonts.bold },
  terminal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  terminalText: { flex: 1 },
  terminalTitle: { ...typography.heading },
  reason: { ...typography.caption, color: colors.text },
})
