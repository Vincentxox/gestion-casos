import { StyleSheet, Text, View } from 'react-native'

import { Icon } from '@/components/ui/Icon'
import type { CasePriority } from '@/features/cases/types'
import { priorityMeta } from '@/theme/statusMeta'
import { fonts, radius, spacing } from '@/theme/tokens'

export function PriorityBadge({ priority }: { priority: CasePriority }) {
  const meta = priorityMeta[priority]
  return (
    <View
      accessibilityLabel={`Prioridad: ${meta.label}`}
      accessibilityRole="text"
      style={[styles.badge, { borderColor: meta.color }]}
    >
      <Icon name="flag-outline" size={12} color={meta.color} />
      <Text style={[styles.label, { color: meta.color }]}>{meta.label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  label: { fontFamily: fonts.semibold, fontSize: 12 },
})
