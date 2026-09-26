import { Pressable, StyleSheet, Text, View } from 'react-native'

import { Icon, type IconName } from '@/components/ui/Icon'
import { colors, fonts, radius, spacing } from '@/theme/tokens'

type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger'

export function Chip({
  label,
  tone = 'neutral',
  selected = false,
  icon,
  accessibilityLabel,
  onPress,
}: {
  label: string
  tone?: Tone
  selected?: boolean
  icon?: IconName
  accessibilityLabel?: string
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
  const foreground = selected ? colors.white : color
  const content = (
    <>
      {icon ? <Icon name={icon} size="inline" color={foreground} /> : null}
      <Text style={[styles.label, { color: foreground }]}>{label}</Text>
    </>
  )
  if (!onPress) {
    return <View style={[styles.chip, { backgroundColor }]}>{content}</View>
  }

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs,
  },
  interactive: { borderWidth: 1, borderColor: colors.border },
  label: { fontFamily: fonts.semibold, fontSize: 13 },
})
