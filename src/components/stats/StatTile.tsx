import { Pressable, StyleSheet, Text, View } from 'react-native'

import type { IconName } from '@/components/ui/Icon'
import { colors, fonts, phaseColors, radius, spacing, typography } from '@/theme/tokens'
import { formatNumber } from '@/theme/formatters'

interface Props {
  label: string
  value: number
  onPress: () => void
  emphasis?: boolean
  icon: IconName
  phase: keyof typeof phaseColors
}

/** Número grande con su etiqueta y un punto del color de la fase, sin caja alrededor. */
export function StatTile({ label, value, phase, onPress, emphasis = false }: Props) {
  return (
    <Pressable
      accessibilityLabel={`${value} ${label.toLowerCase()}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
    >
      <Text style={[styles.value, emphasis && styles.emphasis]}>{formatNumber(value)}</Text>
      <View style={styles.labelRow}>
        <View style={[styles.dot, { backgroundColor: phaseColors[phase].fg }]} />
        <Text style={styles.label}>{label}</Text>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  tile: {
    minHeight: 64,
    flexGrow: 1,
    flexBasis: '47%',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: spacing.sm,
  },
  pressed: { opacity: 0.6 },
  value: {
    ...typography.display,
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.6,
    color: colors.ink,
  },
  emphasis: { color: colors.primary },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dot: { width: 8, height: 8, borderRadius: radius.pill },
  label: { ...typography.caption, fontFamily: fonts.semibold, color: colors.textMuted, flex: 1 },
})
