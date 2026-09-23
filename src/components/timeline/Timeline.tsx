import { StyleSheet, Text, View } from 'react-native'

import { Icon } from '@/components/ui/Icon'
import type { CaseStatusHistoryRecord } from '@/features/cases/types'
import { formatRelativeDate } from '@/theme/formatters'
import { actionMeta, statusMeta } from '@/theme/statusMeta'
import { colors, fonts, phaseColors, radius, spacing, typography } from '@/theme/tokens'

export function Timeline({ events }: { events: CaseStatusHistoryRecord[] }) {
  if (events.length === 0)
    return <Text style={styles.muted}>Todavía no hay acciones registradas.</Text>
  return (
    <View>
      {events.map((event, index) => {
        const date = new Date(event.createdAt)
        const day = Number.isNaN(date.getTime())
          ? 'Fecha no disponible'
          : date.toLocaleDateString('es-GT', { day: 'numeric', month: 'long', year: 'numeric' })
        const previous = events[index - 1]
        const previousDate = previous ? new Date(previous.createdAt) : null
        const previousDay =
          previousDate && !Number.isNaN(previousDate.getTime())
            ? previousDate.toLocaleDateString('es-GT', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })
            : previous
              ? 'Fecha no disponible'
              : null
        const showDay = day !== previousDay
        const meta = actionMeta[event.action as keyof typeof actionMeta]
        const phase = phaseColors[meta?.phase ?? statusMeta[event.newStatus].phase]
        const icon = meta?.icon ?? statusMeta[event.newStatus].icon
        const verb =
          meta?.verb ?? `cambió el estado a ${statusMeta[event.newStatus].label.toLowerCase()}`
        return (
          <View key={event.id}>
            {showDay ? <Text style={styles.day}>{day}</Text> : null}
            <View style={styles.row}>
              <View style={styles.rail}>
                <View style={[styles.icon, { backgroundColor: phase.bg }]}>
                  <Icon name={icon} size={18} color={phase.fg} />
                </View>
                {index < events.length - 1 ? <View style={styles.line} /> : null}
              </View>
              <View style={styles.content}>
                <Text style={styles.title}>
                  <Text style={styles.actor}>{event.actorName}</Text> {verb}
                  {event.assigneeName && ['asignar', 'reasignar'].includes(event.action)
                    ? ` a ${event.assigneeName}`
                    : ''}
                </Text>
                <Text style={styles.muted}>
                  {Number.isNaN(date.getTime())
                    ? day
                    : date.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })}{' '}
                  · {formatRelativeDate(event.createdAt)}
                </Text>
                {event.comment ? (
                  <View style={styles.comment}>
                    <Icon name="chatbox-outline" size={16} color={colors.textMuted} />
                    <Text style={styles.commentText}>{event.comment}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  day: {
    ...typography.overline,
    color: colors.textMuted,
    marginBottom: spacing.base,
    marginTop: spacing.sm,
  },
  row: { flexDirection: 'row', gap: spacing.base },
  rail: { width: 32, alignItems: 'center' },
  icon: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: { width: 2, flex: 1, minHeight: 30, backgroundColor: colors.border },
  content: { flex: 1, gap: spacing.xs, paddingBottom: spacing.md },
  title: { ...typography.body, color: colors.text },
  actor: { fontFamily: fonts.bold },
  muted: { ...typography.caption, color: colors.textMuted },
  comment: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.neutralSoft,
  },
  commentText: { ...typography.caption, color: colors.text, flex: 1 },
})
