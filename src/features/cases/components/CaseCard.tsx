import { StyleSheet, Text, View } from 'react-native'

import { PriorityBadge } from '@/components/badges/PriorityBadge'
import { StatusBadge } from '@/components/badges/StatusBadge'
import { Avatar } from '@/components/ui/Avatar'
import { Card } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { IconTile } from '@/components/ui/IconTile'
import { formatRelativeDate } from '@/theme/formatters'
import { priorityMeta, statusMeta } from '@/theme/statusMeta'
import { colors, fonts, spacing, typography } from '@/theme/tokens'

import type { CaseRecord } from '../types'

export function CaseCard({ item, onPress }: { item: CaseRecord; onPress: () => void }) {
  const status = statusMeta[item.status]
  return (
    <Card
      accessibilityLabel={`${item.caseNumber}, ${item.title}, ${status.label}, prioridad ${priorityMeta[item.priority].label.toLowerCase()}`}
      onPress={onPress}
    >
      <View style={styles.row}>
        <IconTile icon={status.icon} phase={status.phase} />
        <View style={styles.content}>
          <View style={styles.topRow}>
            <Text style={styles.number}>{item.caseNumber}</Text>
            <Text style={styles.time}>{formatRelativeDate(item.createdAt)}</Text>
          </View>
          <Text numberOfLines={2} style={styles.title}>
            {item.title}
          </Text>
          <View style={styles.locationRow}>
            <Icon name="location-outline" size={14} color={colors.textMuted} />
            <Text numberOfLines={1} style={styles.location}>
              {item.location} · {item.requestingAreaName}
            </Text>
          </View>
          <View style={styles.badges}>
            <StatusBadge status={item.status} />
            <PriorityBadge priority={item.priority} />
            <View style={styles.spacer} />
            {item.assigneeName ? (
              <Avatar name={item.assigneeName} id={item.assignedTo ?? item.id} size={28} />
            ) : (
              <Text style={styles.unassigned}>Sin asignar</Text>
            )}
          </View>
        </View>
        <Icon name="chevron-forward" size="inline" color={colors.textMuted} />
      </View>
    </Card>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.base },
  content: { flex: 1, gap: spacing.sm },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.xs },
  number: {
    ...typography.caption,
    fontFamily: fonts.semibold,
    color: colors.primary,
    flexShrink: 1,
  },
  time: { ...typography.caption, color: colors.textMuted },
  title: { ...typography.body, fontFamily: fonts.bold, color: colors.text },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  location: { ...typography.caption, color: colors.textMuted, flex: 1 },
  badges: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.xs },
  spacer: { flex: 1 },
  unassigned: { ...typography.caption, color: colors.textMuted },
})
