import { StyleSheet, Text, View } from 'react-native'

import { Avatar } from '@/components/ui/Avatar'
import { formatClock, formatDayLabel } from '@/theme/formatters'
import { colors, fonts, radius, spacing, typography } from '@/theme/tokens'

import type { CaseStatusHistoryRecord } from '../types'

type Message = CaseStatusHistoryRecord
type MessageGroup = { key: string; messages: Message[]; dayLabel: string | null }

function localDay(value: string) {
  const date = new Date(value)
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

/** Agrupa solo mensajes consecutivos del mismo autor y día; los eventos vienen recientes primero. */
export function groupCaseMessages(events: CaseStatusHistoryRecord[], now = new Date()) {
  const messages = events.filter((event) => event.action === 'mensaje').reverse()
  const groups: MessageGroup[] = []
  for (const message of messages) {
    const previous = groups[groups.length - 1]
    const sameAuthor = previous?.messages[0]?.actorId === message.actorId
    const sameDay =
      previous && localDay(previous.messages[0]!.createdAt) === localDay(message.createdAt)
    if (previous && sameAuthor && sameDay) {
      previous.messages.push(message)
      continue
    }
    const previousDay = previous ? localDay(previous.messages[0]!.createdAt) : null
    groups.push({
      key: String(message.id),
      messages: [message],
      dayLabel:
        previousDay === localDay(message.createdAt) ? null : formatDayLabel(message.createdAt, now),
    })
  }
  return groups
}

export function CaseMessages({
  events,
  currentUserId,
}: {
  events: CaseStatusHistoryRecord[]
  currentUserId?: string
}) {
  const groups = groupCaseMessages(events)
  if (!groups.length) return <Text style={styles.empty}>Todavía no hay mensajes</Text>
  return (
    <View style={styles.list} testID="case-messages">
      {groups.map((group) => {
        const first = group.messages[0]!
        const last = group.messages[group.messages.length - 1]!
        const own = Boolean(currentUserId && first.actorId === currentUserId)
        return (
          <View key={group.key} style={styles.group}>
            {group.dayLabel ? (
              <View style={styles.dayRow}>
                <View style={styles.dayLine} />
                <Text style={styles.dayLabel}>{group.dayLabel}</Text>
                <View style={styles.dayLine} />
              </View>
            ) : null}
            <View style={[styles.row, own && styles.ownRow]}>
              {!own ? (
                <Avatar
                  name={first.actorName}
                  id={first.actorId ?? first.actorName}
                  avatarPath={first.actorAvatarPath}
                  size={28}
                />
              ) : null}
              <View style={[styles.messageGroup, own && styles.ownGroup]}>
                {!own ? <Text style={styles.author}>{first.actorName}</Text> : null}
                {group.messages.map((message) => (
                  <View
                    key={message.id}
                    style={[styles.bubble, own && styles.ownBubble]}
                    testID={`case-message-${message.id}`}
                  >
                    <Text style={[styles.message, own && styles.ownMessage]}>
                      {message.comment}
                    </Text>
                  </View>
                ))}
                <Text style={[styles.meta, own && styles.ownMeta]}>
                  {formatClock(last.createdAt)}
                </Text>
              </View>
            </View>
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  group: { gap: spacing.base },
  empty: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  dayRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.base },
  dayLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dayLabel: { ...typography.caption, color: colors.textMuted },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.base },
  ownRow: { justifyContent: 'flex-end' },
  messageGroup: { maxWidth: '82%', gap: spacing.xs },
  ownGroup: { alignItems: 'flex-end' },
  author: {
    ...typography.caption,
    fontFamily: fonts.semibold,
    color: colors.textMuted,
    marginLeft: spacing.xs,
  },
  bubble: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.base,
    borderRadius: radius.xl,
    borderBottomLeftRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
  },
  ownBubble: {
    alignSelf: 'flex-end',
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.sm,
    backgroundColor: colors.primary,
  },
  message: { ...typography.body, color: colors.text },
  ownMessage: { color: colors.white },
  meta: { ...typography.caption, color: colors.textMuted, marginLeft: spacing.xs },
  ownMeta: { marginLeft: 0, marginRight: spacing.xs },
})
