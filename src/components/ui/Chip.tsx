import { Pressable, StyleSheet, Text, View } from 'react-native'

import { colors, fonts, radius, spacing } from '@/theme/tokens'

type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger'

export function Chip({
  label,
  tone = 'neutral',
  selected = false,
  onPress,
}: {
  label: string
  tone?: Tone
  selected?: boolean
  onPress?: () => void
}) {
  const toneStyles = {
    neutral: [colors.neutralSoft, colors.neutral],
    info: [colors.infoSoft, colors.info],
    success: [colors.successSoft, colors.success],
    warning: [colors.warningSoft, colors.warning],
    danger: [colors.dangerSoft, colors.error],
  } as const
  const [backgroundColor, color] = toneStyles[tone]
  const content = (
    <Text style={[styles.label, { color: selected ? colors.white : color }]}>{label}</Text>
  )
  if (!onPress) {
    return <View style={[styles.chip, { backgroundColor }]}>{content}</View>
  }

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      hitSlop={4}
      onPress={onPress}
      style={[
        styles.chip,
        styles.interactive,
        { backgroundColor: selected ? colors.primary : colors.surface },
      ]}
    >
      {content}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 36,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs,
  },
  interactive: { borderWidth: 1, borderColor: colors.border },
  label: { fontFamily: fonts.semibold, fontSize: 13 },
})
