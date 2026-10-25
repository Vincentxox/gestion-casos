import { StyleSheet, Text, View } from 'react-native'

import { formatCaseDueDate } from '@/theme/formatters'
import { priorityMeta } from '@/theme/statusMeta'
import { colors, fonts, radius, spacing, typography } from '@/theme/tokens'

import type { CasePriority } from '../types'

export function CaseKeyFacts({
  priority,
  dueAt,
  overdueStage,
  assigneeName,
}: {
  priority: CasePriority
  dueAt?: string | null
  overdueStage?: 'aceptacion' | 'resolucion' | null
  assigneeName?: string | null
}) {
  return (
    <View style={styles.strip} testID="case-key-facts">
      <View style={styles.fact}>
        <Text style={styles.label}>Prioridad</Text>
        <View style={styles.priorityValue}>
          <View style={[styles.priorityDot, { backgroundColor: priorityMeta[priority].color }]} />
          <Text style={styles.value}>{priorityMeta[priority].label}</Text>
        </View>
      </View>
      <View style={[styles.fact, styles.divider]}>
        <Text style={styles.label}>Vence</Text>
        <Text style={[styles.value, overdueStage && styles.overdueValue]} numberOfLines={1}>
          {dueAt ? formatCaseDueDate(dueAt) : 'Sin plazo'}
        </Text>
      </View>
      <View style={[styles.fact, styles.divider]}>
        <Text style={styles.label}>Atiende</Text>
        <Text style={styles.value} numberOfLines={1}>
          {assigneeName || 'Sin asignar'}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  fact: { flex: 1, minWidth: 0, gap: spacing.xs, padding: spacing.base },
  divider: { borderLeftWidth: 1, borderLeftColor: colors.border },
  label: { ...typography.label, color: colors.textMuted },
  value: { ...typography.body, fontFamily: fonts.semibold, color: colors.text },
  overdueValue: { color: colors.dangerText },
  priorityValue: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  priorityDot: { width: 8, height: 8, borderRadius: radius.pill },
})
