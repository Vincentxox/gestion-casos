import { StyleSheet, Text, View } from 'react-native'

import type { CaseStatusHistoryRecord } from '@/features/cases/types'
import { getStatusLabel } from '@/features/cases/caseService'
import { colors, spacing } from '@/theme/tokens'

export function Timeline({ events }: { events: CaseStatusHistoryRecord[] }) {
  if (events.length === 0)
    return <Text style={styles.muted}>Todavía no hay acciones registradas.</Text>
  return (
    <View style={styles.list}>
      {events.map((event) => (
        <View key={event.id} style={styles.row}>
          <View style={styles.dot} />
          <View style={styles.content}>
            <Text style={styles.title}>
              {getStatusLabel(event.newStatus)} · {event.actorName}
            </Text>
            <Text style={styles.muted}>{new Date(event.createdAt).toLocaleString('es-GT')}</Text>
            {event.comment ? <Text style={styles.note}>{event.comment}</Text> : null}
            {event.assigneeName ? (
              <Text style={styles.note}>Asignado a {event.assigneeName}</Text>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  dot: { width: 10, height: 10, marginTop: 5, borderRadius: 5, backgroundColor: colors.primary },
  content: {
    flex: 1,
    gap: spacing.xs,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { color: colors.text, fontWeight: '800' },
  muted: { color: colors.textMuted },
  note: { color: colors.text, lineHeight: 20 },
})
