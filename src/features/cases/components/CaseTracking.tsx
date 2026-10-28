import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { Icon } from '@/components/ui/Icon'
import { describeEvent, formatEventMoment } from '@/features/cases/components/CaseConversation'
import { formatTrackingMoment } from '@/theme/formatters'
import { colors, fonts, phaseColors, radius, spacing, typography } from '@/theme/tokens'

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
  const [descriptionExpanded, setDescriptionExpanded] = useState(false)
  const canExpandDescription = description.length > 110
  const represented = new Set(steps.map((step) => step.event?.id))
  const otherEvents = events
    .filter((event) => event.action !== 'mensaje' && !represented.has(event.id))
    .reverse()
  return (
    <View style={styles.list} testID="case-tracking">
      {steps.map((step) => (
        <View key={step.key} style={styles.row}>
          <View style={styles.rail}>
            <View
              style={[
                styles.dot,
                step.state === 'done' && styles.dotDone,
                step.state === 'current' && styles.dotCurrent,
                step.state === 'danger' && styles.dotDanger,
                step.state === 'cancelled' && styles.dotCancelled,
              ]}
            >
              {step.state === 'done' ? (
                <Icon name="checkmark" size={18} color={colors.white} />
              ) : null}
              {step.state === 'danger' ? (
                <Icon name="close" size={18} color={colors.white} />
              ) : null}
              {step.state === 'cancelled' ? (
                <Icon name="remove" size={18} color={colors.white} />
              ) : null}
            </View>
          </View>
          <View style={styles.body}>
            <View style={styles.stepHeading}>
              <Text
                style={[
                  styles.label,
                  step.state === 'current' && styles.labelCurrent,
                  step.state === 'pending' && styles.labelPending,
                  step.state === 'danger' && styles.labelDanger,
                  step.state === 'cancelled' && styles.labelCancelled,
                ]}
              >
                {step.label}
              </Text>
              {step.state === 'done' && step.event ? (
                <Text style={styles.doneDate}>{formatTrackingMoment(step.event.createdAt)}</Text>
              ) : null}
              {step.state === 'current' && step.event ? (
                <Text style={styles.currentDate} numberOfLines={1}>
                  Desde{' '}
                  {formatTrackingMoment(step.event.createdAt)
                    .replace(/^Hoy/, 'hoy')
                    .replace(/^Ayer/, 'ayer')}
                </Text>
              ) : null}
            </View>
            {(step.state === 'danger' || step.state === 'cancelled') && step.event?.comment ? (
              <Text style={styles.detail}>{step.event.comment}</Text>
            ) : null}
            {step.key === 'solicitada' ? (
              <View style={styles.requestCard}>
                <Text
                  style={styles.requestDescription}
                  numberOfLines={descriptionExpanded ? undefined : 2}
                >
                  {description}
                </Text>
                {canExpandDescription ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setDescriptionExpanded((value) => !value)}
                    style={styles.moreButton}
                  >
                    <Text style={styles.moreText}>
                      {descriptionExpanded ? 'Ver menos' : 'Ver más'}
                    </Text>
                  </Pressable>
                ) : null}
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
  row: { flexDirection: 'row', minHeight: 54, gap: spacing.md },
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
  dotCancelled: {
    borderColor: phaseColors.cancelada.fg,
    backgroundColor: phaseColors.cancelada.fg,
  },
  body: { flex: 1, paddingBottom: spacing.lg, gap: spacing.xs },
  stepHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  doneDate: { ...typography.caption, color: colors.textMuted, flexShrink: 1 },
  currentDate: {
    ...typography.caption,
    color: colors.textMuted,
    flexShrink: 1,
    textAlign: 'right',
  },
  label: { ...typography.heading, color: colors.ink, flexShrink: 1 },
  labelCurrent: { fontFamily: fonts.extrabold },
  labelPending: { color: colors.textMuted },
  labelDanger: { color: colors.error },
  labelCancelled: { color: phaseColors.cancelada.fg },
  detail: { ...typography.body, color: colors.textMuted },
  requestCard: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
  },
  requestDescription: { ...typography.body, color: colors.text },
  moreButton: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  moreText: { ...typography.body, fontFamily: fonts.semibold, color: colors.primary },
  requestLocation: { ...typography.caption, color: colors.textMuted },
  otherEvents: { gap: spacing.sm, paddingTop: spacing.md },
  otherTitle: { ...typography.heading, color: colors.ink },
})
