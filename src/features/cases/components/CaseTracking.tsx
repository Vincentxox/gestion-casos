import { StyleSheet, Text, View } from 'react-native'

import { describeEvent, formatEventMoment } from '@/features/cases/components/CaseConversation'
import { colors, fonts, radius, spacing, typography } from '@/theme/tokens'

import type { TrackingStep } from '../caseTracking'
import type { CaseStatusHistoryRecord } from '../types'

export function CaseTracking({
  steps,
  events,
  description,
  location,
  report,
}: {
  steps: TrackingStep[]
  events: CaseStatusHistoryRecord[]
  description: string
  location: string
  report?: React.ReactNode
}) {
  const represented = new Set(steps.map((step) => step.event?.id))
  const otherEvents = events
    .filter((event) => event.action !== 'mensaje' && !represented.has(event.id))
    .reverse()
  return (
    <View style={styles.list} testID="case-tracking">
      {steps.map((step, index) => (
        <View key={step.key} style={styles.row}>
          <View style={styles.rail}>
            <View
              style={[
                styles.dot,
                step.state === 'done' && styles.dotDone,
                step.state === 'current' && styles.dotCurrent,
                step.state === 'danger' && styles.dotDanger,
              ]}
            >
              {step.state === 'done' ? <Text style={styles.check}>✓</Text> : null}
            </View>
            {index < steps.length - 1 ? (
              <View style={[styles.line, step.state === 'done' && styles.lineDone]} />
            ) : null}
          </View>
          <View style={styles.body}>
            <Text
              style={[
                styles.label,
                step.state === 'current' && styles.labelCurrent,
                step.state === 'pending' && styles.labelPending,
                step.state === 'danger' && styles.labelDanger,
              ]}
            >
              {step.label}
            </Text>
            <Text style={styles.detail}>
              {step.state === 'current'
                ? `${step.detail}${step.event?.comment ? ` · ${step.event.comment}` : ''}`
                : step.event
                  ? `${formatEventMoment(step.event.createdAt)} · ${step.event.actorName}${step.event.comment ? ` · ${step.event.comment}` : ''}`
                  : step.detail}
            </Text>
            {step.key === 'solicitada' ? (
              <View style={styles.requestCard}>
                <Text style={styles.requestDescription}>{description}</Text>
                <Text style={styles.requestLocation}>Ubicación: {location}</Text>
              </View>
            ) : null}
            {step.key === 'reporte' ? report : null}
          </View>
        </View>
      ))}
      {otherEvents.length ? (
        <View style={styles.otherEvents}>
          <Text style={styles.otherTitle}>Otros movimientos</Text>
          {otherEvents.map((event) => (
            <Text key={event.id} style={styles.detail}>
              {formatEventMoment(event.createdAt)} · {describeEvent(event)}
              {event.comment ? ` · ${event.comment}` : ''}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  list: { gap: 0 },
  row: { flexDirection: 'row', minHeight: 76, gap: spacing.md },
  rail: { width: 38, alignItems: 'center' },
  dot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: colors.textMuted,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotDone: { borderColor: colors.ink, backgroundColor: colors.ink },
  dotCurrent: { borderWidth: 3, borderColor: colors.sky },
  dotDanger: { borderColor: colors.error, backgroundColor: colors.error },
  check: { color: colors.white, fontFamily: fonts.bold, fontSize: 18 },
  line: { flex: 1, width: 2, backgroundColor: colors.track },
  lineDone: { backgroundColor: colors.ink },
  body: { flex: 1, paddingBottom: spacing.lg, gap: spacing.xs },
  label: { ...typography.heading, color: colors.ink },
  labelCurrent: { fontFamily: fonts.extrabold },
  labelPending: { color: colors.textMuted },
  labelDanger: { color: colors.error },
  detail: { ...typography.body, color: colors.textMuted },
  requestCard: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
  },
  requestDescription: { ...typography.body, color: colors.text },
  requestLocation: { ...typography.caption, color: colors.textMuted },
  otherEvents: { gap: spacing.sm, paddingTop: spacing.md },
  otherTitle: { ...typography.heading, color: colors.ink },
})
