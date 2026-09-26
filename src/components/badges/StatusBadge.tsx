import { StyleSheet, Text, View } from 'react-native'

import { Icon } from '@/components/ui/Icon'
import type { CaseStatus } from '@/features/cases/types'
import { statusMeta } from '@/theme/statusMeta'
import { fonts, phaseColors, radius, spacing } from '@/theme/tokens'

export function StatusBadge({ status, size = 'sm' }: { status: CaseStatus; size?: 'sm' | 'md' }) {
  const meta = statusMeta[status]
  const phase = phaseColors[meta.phase]
  return (
    <View
      accessibilityLabel={`Estado: ${meta.label}`}
      accessibilityRole="text"
      style={[styles.badge, { backgroundColor: phase.bg }]}
    >
      <Icon name={meta.icon} size={size === 'sm' ? 14 : 16} color={phase.fg} />
      <Text style={[styles.label, size === 'md' && styles.medium, { color: phase.fg }]}>
        {meta.label}
      </Text>
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
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  label: { fontFamily: fonts.bold, fontSize: 12 },
  medium: { fontSize: 13 },
})
