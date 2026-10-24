import { Pressable, StyleSheet, Text, View } from 'react-native'

import { Avatar } from '@/components/ui/Avatar'
import { Icon } from '@/components/ui/Icon'
import { formatCaseCardDate } from '@/theme/formatters'
import { priorityMeta, statusMeta } from '@/theme/statusMeta'
import { colors, fonts, phaseColors, radius, spacing, tone, typography } from '@/theme/tokens'

import { getCaseStep } from '../caseStep'
import type { CaseRecord } from '../types'

function GuideMarker({ number }: { number: 1 | 2 | 3 | 4 }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.guideMarker}
      testID={`case-guide-marker-${number}`}
    >
      <Text style={styles.guideMarkerText}>{number}</Text>
    </View>
  )
}

/** Tarjeta guiada que explica estado, avance y responsable sin depender solo del color. */
export function CaseCard({
  item,
  onPress,
  guideMarkers = false,
}: {
  item: CaseRecord
  onPress?: () => void
  guideMarkers?: boolean
}) {
  const status = statusMeta[item.status]
  const phase = phaseColors[status.phase]
  const step = getCaseStep(item.status)
  const assignee = item.assigneeName?.trim().split(/\s+/)[0] || 'Sin asignar'
  const label = [
    item.caseNumber,
    item.title,
    status.label,
    `prioridad ${priorityMeta[item.priority].label.toLowerCase()}`,
    item.overdueStage ? `vencida por ${item.overdueStage}` : null,
    item.location,
    step ? `paso ${step} de 5` : null,
    `responsable ${assignee}`,
  ]
    .filter(Boolean)
    .join(', ')

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.heading}>
        <Text numberOfLines={1} style={styles.title}>
          {item.title}
        </Text>
        <View style={styles.inlinePart}>
          <Text style={styles.date}>{formatCaseCardDate(item.createdAt)}</Text>
          {guideMarkers ? <GuideMarker number={1} /> : null}
        </View>
      </View>
      <View style={styles.middle}>
        {item.overdueStage ? (
          <View style={[styles.badge, styles.overdueBadge]}>
            <Icon name="warning" color={colors.dangerText} size={14} />
            <Text style={[styles.badgeText, styles.overdueText]}>Vencida</Text>
          </View>
        ) : (
          <View style={[styles.badge, { backgroundColor: phase.bg }]}>
            <Icon name={status.icon} color={phase.fg} size={14} />
            <Text style={[styles.badgeText, { color: phase.fg }]}>{status.label}</Text>
          </View>
        )}
        <View style={styles.locationPart}>
          <Text numberOfLines={1} style={styles.location}>
            {item.overdueStage ? `${status.label} · ` : '· '}
            {item.location}
          </Text>
          {guideMarkers ? <GuideMarker number={2} /> : null}
        </View>
      </View>
      <View style={styles.footer}>
        {step ? (
          <>
            <View accessibilityLabel={`Paso ${step} de 5`} style={styles.progress}>
              {Array.from({ length: 5 }, (_, index) => (
                <View
                  key={index}
                  testID={`case-progress-segment-${index + 1}`}
                  style={[
                    styles.segment,
                    { backgroundColor: index < step ? phase.fg : colors.track },
                  ]}
                />
              ))}
            </View>
            <Text style={styles.step}>Paso {step} de 5</Text>
            {guideMarkers ? <GuideMarker number={3} /> : null}
          </>
        ) : null}
        <View style={styles.assignee}>
          {item.assigneeName ? (
            <Avatar
              name={item.assigneeName}
              id={item.assignedTo ?? item.id}
              avatarPath={item.assigneeAvatarPath}
              size={24}
            />
          ) : null}
          <Text numberOfLines={1} style={styles.assigneeName}>
            {assignee}
          </Text>
          {guideMarkers ? <GuideMarker number={4} /> : null}
        </View>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    minHeight: 108,
    gap: spacing.sm,
    padding: spacing.base,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
  },
  pressed: { opacity: 0.75 },
  heading: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  inlinePart: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  title: { ...typography.body, flex: 1, fontFamily: fonts.bold, fontSize: 16, color: colors.text },
  date: { ...typography.caption, color: colors.textMuted },
  middle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  badge: {
    minHeight: 26,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
  },
  badgeText: { ...typography.caption, fontFamily: fonts.bold },
  overdueBadge: { backgroundColor: tone.danger.bg },
  overdueText: { color: tone.danger.text },
  location: { ...typography.body, flex: 1, fontSize: 14, color: colors.textMuted },
  locationPart: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  footer: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  progress: { flex: 1, minWidth: 20, flexDirection: 'row', gap: 3 },
  segment: { flex: 1, height: 4, borderRadius: radius.pill },
  step: { ...typography.caption, color: colors.textMuted },
  assignee: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  assigneeName: {
    ...typography.caption,
    flexShrink: 1,
    fontFamily: fonts.semibold,
    color: colors.textMuted,
  },
  guideMarker: {
    width: 20,
    height: 20,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
  },
  guideMarkerText: { ...typography.caption, fontFamily: fonts.bold, color: colors.white },
})
