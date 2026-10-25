import type { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { Avatar } from '@/components/ui/Avatar'
import type { CaseRecord, CaseStatusHistoryRecord } from '@/features/cases/types'
import { formatMoment } from '@/theme/formatters'
import { actionMeta, statusMeta } from '@/theme/statusMeta'
import { colors, fonts, radius, spacing, typography } from '@/theme/tokens'

export function formatEventMoment(value: string, now = new Date()): string {
  return formatMoment(value, now)
}

export function describeEvent(event: CaseStatusHistoryRecord): string {
  const meta = actionMeta[event.action as keyof typeof actionMeta]
  const verb = meta?.verb ?? `cambió el estado a ${statusMeta[event.newStatus].label.toLowerCase()}`
  const assignee =
    event.assigneeName && ['asignar', 'reasignar'].includes(event.action)
      ? ` a ${event.assigneeName}`
      : ''
  return `${event.actorName} ${verb}${assignee}`
}

function EventLine({ text, tone }: { text: string; tone: 'start' | 'step' }) {
  return (
    <View style={styles.line}>
      <View style={styles.rail}>
        <View style={[styles.dot, tone === 'start' ? styles.dotStart : styles.dotStep]} />
      </View>
      <Text style={styles.lineText}>{text}</Text>
    </View>
  )
}

function Bubble({
  name,
  id,
  avatarPath,
  children,
  own = false,
}: {
  name: string
  id: string
  avatarPath?: string | null
  children: ReactNode
  own?: boolean
}) {
  return (
    <View
      testID={own ? 'own-case-message' : undefined}
      style={[styles.bubbleRow, own && styles.ownBubbleRow]}
    >
      {!own ? (
        <View style={styles.rail}>
          <Avatar name={name} id={id} avatarPath={avatarPath} size={28} />
        </View>
      ) : null}
      <View style={[styles.bubble, own && styles.ownBubble]}>{children}</View>
    </View>
  )
}

/**
 * Detalle del caso contado como conversación: la solicitud, cada paso del
 * historial (con su comentario como mensaje) y, al final, qué falta.
 */
export function CaseConversation({
  item,
  events,
  nextStep,
  children,
  currentUserId,
}: {
  item: CaseRecord
  /** Historial en el orden del servicio (más reciente primero). */
  events: CaseStatusHistoryRecord[]
  nextStep?: string | null
  children?: ReactNode
  currentUserId?: string
}) {
  const chronological = [...events].reverse().filter((event) => event.action !== 'crear')
  return (
    <View style={styles.feed} testID="case-conversation">
      <View pointerEvents="none" style={styles.spine} />
      <EventLine
        tone="start"
        text={`${formatEventMoment(item.createdAt)} · ${item.creatorName} creó la solicitud`}
      />
      <Bubble name={item.creatorName} id={item.createdBy} avatarPath={item.creatorAvatarPath}>
        <Text style={styles.bubbleText}>{item.description}</Text>
        <Text style={styles.bubbleMeta}>{item.location}</Text>
      </Bubble>
      {chronological.map((event) =>
        event.action === 'mensaje' ? (
          <View key={event.id} testID={`case-message-${event.id}`}>
            <Bubble
              name={event.actorName}
              id={event.actorId ?? event.actorName}
              avatarPath={event.actorAvatarPath}
              own={Boolean(currentUserId && event.actorId === currentUserId)}
            >
              <Text style={styles.bubbleText}>{event.comment}</Text>
              <Text style={styles.bubbleMeta}>
                {event.actorName} · {formatEventMoment(event.createdAt)}
              </Text>
            </Bubble>
          </View>
        ) : (
          <View key={event.id} style={styles.group}>
            <EventLine
              tone="step"
              text={`${formatEventMoment(event.createdAt)} · ${describeEvent(event)}`}
            />
            {event.comment ? (
              <Bubble
                name={event.actorName}
                id={event.actorName}
                avatarPath={event.actorAvatarPath}
              >
                <Text style={styles.bubbleText}>{event.comment}</Text>
              </Bubble>
            ) : null}
          </View>
        ),
      )}
      {children}
      {nextStep ? (
        <View style={styles.line}>
          <View style={styles.rail}>
            <View style={styles.ring} />
          </View>
          <Text style={styles.nextText}>{nextStep}</Text>
        </View>
      ) : null}
    </View>
  )
}

const RAIL = 30

const styles = StyleSheet.create({
  feed: { gap: spacing.md, position: 'relative' },
  spine: {
    position: 'absolute',
    left: RAIL / 2 - 1.5,
    top: spacing.sm,
    bottom: spacing.sm,
    width: 3,
    borderRadius: 2,
    backgroundColor: colors.track,
  },
  group: { gap: spacing.md },
  line: { flexDirection: 'row', alignItems: 'center', gap: spacing.base },
  rail: { width: RAIL, alignItems: 'center' },
  dot: { width: 11, height: 11, borderRadius: 6 },
  dotStart: { backgroundColor: colors.ink },
  dotStep: { backgroundColor: colors.primary },
  ring: {
    width: 15,
    height: 15,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: colors.sky,
    backgroundColor: colors.background,
  },
  lineText: { ...typography.caption, color: colors.textMuted, flex: 1 },
  nextText: { ...typography.body, fontFamily: fonts.bold, color: colors.text, flex: 1 },
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.base },
  ownBubbleRow: { justifyContent: 'flex-end' },
  bubble: {
    flexShrink: 1,
    maxWidth: '82%',
    gap: spacing.xs,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.xl - 4,
    borderBottomLeftRadius: 6,
    backgroundColor: colors.surfaceMuted,
  },
  bubbleText: { ...typography.body, color: colors.text },
  bubbleMeta: { ...typography.caption, color: colors.textMuted },
  ownBubble: {
    backgroundColor: colors.primarySoft,
    borderBottomLeftRadius: radius.xl - 4,
    borderBottomRightRadius: 6,
  },
})
