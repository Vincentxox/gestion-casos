import { StyleSheet, Text, View } from 'react-native'

import { Card } from '@/components/ui/Card'
import type { IconName } from '@/components/ui/Icon'
import { IconTile } from '@/components/ui/IconTile'
import { colors, fonts, phaseColors, spacing, typography } from '@/theme/tokens'
import { formatNumber } from '@/theme/formatters'

interface Props {
  label: string
  value: number
  onPress: () => void
  emphasis?: boolean
  icon: IconName
  phase: keyof typeof phaseColors
}

export function StatTile({ label, value, icon, phase, onPress, emphasis = false }: Props) {
  return (
    <Card
      accessibilityLabel={`${value} ${label.toLowerCase()}`}
      onPress={onPress}
      style={styles.tile}
    >
      <View style={styles.top}>
        <IconTile icon={icon} phase={phase} size={36} />
        <View style={styles.content}>
          <Text style={[styles.value, emphasis && styles.emphasis]}>{formatNumber(value)}</Text>
          <Text style={styles.label}>{label}</Text>
        </View>
      </View>
    </Card>
  )
}

const styles = StyleSheet.create({
  tile: {
    minHeight: 72,
    flexGrow: 1,
    flexBasis: '47%',
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.base },
  content: { flex: 1 },
  value: { ...typography.title, color: colors.text },
  emphasis: { color: colors.primary },
  label: { ...typography.caption, fontFamily: fonts.semibold, color: colors.textMuted },
})
