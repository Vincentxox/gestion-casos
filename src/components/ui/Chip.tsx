import { Pressable, StyleSheet, Text, View } from 'react-native'

import { Icon, type IconName } from '@/components/ui/Icon'
import { colors, radius, spacing, tone as tonePalette, typography } from '@/theme/tokens'

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
  const foreground = selected ? colors.white : onPress ? colors.ink : tonePalette[tone].text
  const content = (
    <>
      {icon ? <Icon name={icon} size="inline" color={foreground} /> : null}
      <Text style={[styles.label, { color: foreground }]}>{label}</Text>
    </>
  )
  if (!onPress) {
    return <View style={[styles.chip, { backgroundColor: tonePalette[tone].bg }]}>{content}</View>
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
        {
          backgroundColor: selected ? colors.ink : colors.surface,
          borderColor: selected ? colors.ink : colors.chipBorder,
        },
      ]}
    >
      {content}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.base,
  },
  interactive: {
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.chipBorder,
  },
  label: typography.label,
})
