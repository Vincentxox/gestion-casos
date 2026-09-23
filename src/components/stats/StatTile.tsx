import { Pressable, StyleSheet, Text, View } from 'react-native'

import { colors, radius, spacing, typography } from '@/theme/tokens'
import { formatNumber } from '@/theme/formatters'

interface Props {
  label: string
  value: number
  onPress: () => void
  emphasis?: boolean
}

export function StatTile({ label, value, onPress, emphasis = false }: Props) {
  return (
    <Pressable
      accessibilityLabel={`${value} ${label.toLowerCase()}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.tile, emphasis && styles.emphasis, pressed && styles.pressed]}
    >
      <View style={styles.content}>
        <Text style={[styles.value, emphasis && styles.emphasisText]}>{formatNumber(value)}</Text>
        <Text style={[styles.label, emphasis && styles.emphasisText]}>{label}</Text>
      </View>
      <Text accessibilityElementsHidden style={[styles.chevron, emphasis && styles.emphasisText]}>
        ›
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  tile: {
    minHeight: 104,
    minWidth: 145,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  emphasis: { backgroundColor: colors.primary, borderColor: colors.primary },
  pressed: { opacity: 0.75 },
  content: { flex: 1, gap: spacing.xs },
  value: { color: colors.text, ...typography.display },
  label: { color: colors.textMuted, ...typography.body, fontWeight: '700' },
  emphasisText: { color: colors.white },
  chevron: { color: colors.primary, fontSize: 28 },
})
