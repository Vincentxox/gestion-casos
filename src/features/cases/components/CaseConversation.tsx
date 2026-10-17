import type { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { Avatar } from '@/components/ui/Avatar'
import type { CaseRecord, CaseStatusHistoryRecord } from '@/features/cases/types'
import { actionMeta, statusMeta } from '@/theme/statusMeta'
import { colors, fonts, radius, spacing, typography } from '@/theme/tokens'

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function formatEventMoment(value: string, now = new Date()): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Fecha no disponible'
  const time = date.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (sameDay(date, now)) return `Hoy ${time}`
  if (sameDay(date, yesterday)) return `Ayer ${time}`
  return `${date.toLocaleDateString('es-GT', { day: 'numeric', month: 'short' })} · ${time}`
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

function Bubble({ name, id, children }: { name: string; id: string; children: ReactNode }) {
  return (
    <View style={styles.bubbleRow}>
      <View style={styles.rail}>
        <Avatar name={name} id={id} size={28} />
      </View>
      <View style={styles.bubble}>{children}</View>
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
}: {
  item: CaseRecord
  /** Historial en el orden del servicio (más reciente primero). */
  events: CaseStatusHistoryRecord[]
  nextStep?: string | null
  children?: ReactNode
}) {
  const chronological = [...events].reverse().filter((event) => event.action !== 'crear')
  return (
    <View style={styles.feed} testID="case-conversation">
      <View pointerEvents="none" style={styles.spine} />
      <EventLine
        tone="start"
        text={`${formatEventMoment(item.createdAt)} · ${item.creatorName} creó la solicitud`}
      />
      <Bubble name={item.creatorName} id={item.createdBy}>
        <Text style={styles.bubbleText}>{item.description}</Text>
        <Text style={styles.bubbleMeta}>{item.location}</Text>
      </Bubble>
      {chronological.map((event) => (
        <View key={event.id} style={styles.group}>
          <EventLine
            tone="step"
            text={`${formatEventMoment(event.createdAt)} · ${describeEvent(event)}`}
          />
          {event.comment ? (
            <Bubble name={event.actorName} id={event.actorName}>
              <Text style={styles.bubbleText}>{event.comment}</Text>
            </Bubble>
          ) : null}
        </View>
      ))}
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
})
