import { Pressable, StyleSheet, Text, View } from 'react-native'

import { Avatar } from '@/components/ui/Avatar'
import { Icon } from '@/components/ui/Icon'
import { formatRelativeDate } from '@/theme/formatters'
import { priorityMeta, statusMeta } from '@/theme/statusMeta'
import { colors, fonts, phaseColors, radius, spacing, typography } from '@/theme/tokens'

import type { CaseRecord } from '../types'

/** Fila plana de un caso: icono de estado, título, estado y responsable, sin caja. */
export function CaseCard({ item, onPress }: { item: CaseRecord; onPress: () => void }) {
  const status = statusMeta[item.status]
  const phase = phaseColors[status.phase]
  const overdueLabel = item.overdueStage
    ? item.overdueStage === 'aceptacion'
      ? 'Vencida · aceptación'
      : 'Vencida · resolución'
    : null
  return (
    <Pressable
      accessibilityLabel={`${item.caseNumber}, ${item.title}, ${status.label}, prioridad ${priorityMeta[item.priority].label.toLowerCase()}${item.overdueStage ? `, vencida por ${item.overdueStage}` : ''}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={[styles.statusIcon, { backgroundColor: phase.bg }]}>
        <Icon name={status.icon} color={phase.fg} size={20} />
      </View>
      <View style={styles.content}>
        <View style={styles.line}>
          <Text numberOfLines={1} style={styles.title}>
            {item.title}
          </Text>
          <Text style={styles.time}>{formatRelativeDate(item.createdAt)}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={[styles.meta, overdueLabel && styles.overdue]}>
            {overdueLabel ?? status.label}
          </Text>
          <Text numberOfLines={1} style={styles.metaMuted}>
            · {item.location}
          </Text>
        </View>
        <View style={styles.footer}>
          <Text numberOfLines={1} style={styles.number}>
            {item.caseNumber}
          </Text>
          {item.priority === 'alta' ? (
            <View style={styles.priority}>
              <Icon name="flag" color={colors.error} size={12} />
              <Text style={styles.priorityText}>Alta</Text>
            </View>
          ) : null}
          <View style={styles.assignee}>
            {item.assigneeName ? (
              <>
                <Avatar name={item.assigneeName} id={item.assignedTo ?? item.id} size={24} />
                <Text numberOfLines={1} style={styles.assigneeName}>
                  {item.assigneeName.split(/\s+/)[0]}
                </Text>
              </>
            ) : (
              <Text numberOfLines={1} style={styles.assigneeName}>
                Sin asignar
              </Text>
            )}
          </View>
        </View>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.base,
    paddingVertical: spacing.sm,
  },
  pressed: { opacity: 0.6 },
  statusIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  content: { flex: 1, gap: 2 },
  line: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  title: { ...typography.body, flex: 1, fontFamily: fonts.bold, fontSize: 16, color: colors.text },
  time: { ...typography.caption, color: colors.textMuted },
  meta: { ...typography.body, fontSize: 14, fontFamily: fonts.semibold, color: colors.text },
  metaRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
  metaMuted: { ...typography.body, fontSize: 14, flex: 1, color: colors.textMuted },
  overdue: { color: colors.error },
  footer: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 2 },
  number: { ...typography.caption, color: colors.textMuted },
  priority: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  priorityText: { ...typography.caption, fontFamily: fonts.semibold, color: colors.error },
  assignee: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.xs,
  },
  assigneeName: { ...typography.caption, color: colors.textMuted, flexShrink: 1 },
})
