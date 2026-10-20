import { StyleSheet, Text, View } from 'react-native'

import { Avatar } from '@/components/ui/Avatar'
import { formatEventMoment } from '@/features/cases/components/CaseConversation'
import { colors, radius, spacing, typography } from '@/theme/tokens'

import type { CaseStatusHistoryRecord } from '../types'

export function CaseMessages({
  events,
  currentUserId,
}: {
  events: CaseStatusHistoryRecord[]
  currentUserId?: string
}) {
  const messages = events.filter((event) => event.action === 'mensaje').reverse()
  if (!messages.length) return <Text style={styles.empty}>Todavía no hay mensajes</Text>
  return (
    <View style={styles.list} testID="case-messages">
      {messages.map((event) => {
        const own = Boolean(currentUserId && event.actorId === currentUserId)
        return (
          <View
            key={event.id}
            style={[styles.row, own && styles.ownRow]}
            testID={`case-message-${event.id}`}
          >
            {!own ? (
              <Avatar
                name={event.actorName}
                id={event.actorId ?? event.actorName}
                avatarPath={event.actorAvatarPath}
                size={28}
              />
            ) : null}
            <View style={[styles.bubble, own && styles.ownBubble]}>
              <Text style={styles.message}>{event.comment}</Text>
              <Text style={styles.meta}>
                {event.actorName} · {formatEventMoment(event.createdAt)}
              </Text>
            </View>
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  empty: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.base },
  ownRow: { justifyContent: 'flex-end' },
  bubble: {
    maxWidth: '82%',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.base,
    borderRadius: radius.xl,
    borderBottomLeftRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
  },
  ownBubble: {
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.sm,
    backgroundColor: colors.primarySoft,
  },
  message: { ...typography.body, color: colors.text },
  meta: { ...typography.caption, color: colors.textMuted },
})
