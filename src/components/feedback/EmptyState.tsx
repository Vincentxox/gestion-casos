import { StyleSheet, Text, View } from 'react-native'

import { Button } from '@/components/ui/Button'
import { Icon, type IconName } from '@/components/ui/Icon'
import { colors, iconSize, phaseColors, radius, spacing, typography } from '@/theme/tokens'

type Variant = 'firstUse' | 'noResults' | 'allDone'

const variantMeta: Record<Variant, { icon: IconName; foreground: string; background: string }> = {
  firstUse: {
    icon: 'add-circle-outline',
    foreground: colors.primary,
    background: colors.primarySoft,
  },
  noResults: { icon: 'search-outline', foreground: colors.neutral, background: colors.neutralSoft },
  allDone: {
    icon: 'sparkles-outline',
    foreground: phaseColors.cerrada.fg,
    background: phaseColors.cerrada.bg,
  },
}

export function EmptyState({
  title,
  message,
  variant,
  action,
  onAction,
}: {
  title: string
  message: string
  variant: Variant
  action?: string
  onAction?: () => void
}) {
  const meta = variantMeta[variant]
  return (
    <View style={styles.container}>
      <View style={[styles.iconCircle, { backgroundColor: meta.background }]}>
        <Icon name={meta.icon} size={iconSize.hero} color={meta.foreground} />
      </View>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      <Text style={styles.message}>{message}</Text>
      {action && onAction ? <Button label={action} onPress={onAction} /> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: spacing.sm, padding: spacing.lg },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...typography.heading, color: colors.text, textAlign: 'center' },
  message: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
})
