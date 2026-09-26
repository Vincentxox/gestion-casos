import { StyleSheet, Text, View } from 'react-native'

import { Button } from '@/components/ui/Button'
import { Icon, type IconName } from '@/components/ui/Icon'
import { colors, iconSize, phaseColors, radius, spacing, typography } from '@/theme/tokens'

type Variant = 'firstUse' | 'noResults' | 'allDone' | 'pending'

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
  pending: {
    icon: 'time-outline',
    foreground: colors.neutral,
    background: colors.neutralSoft,
  },
}

export function EmptyState({
  title,
  message,
  variant,
  action,
  onAction,
  compact = false,
}: {
  title: string
  message: string
  variant: Variant
  action?: string
  onAction?: () => void
  compact?: boolean
}) {
  const meta = variantMeta[variant]
  return (
    <View style={[styles.container, compact && styles.compact]}>
      <View
        style={[
          styles.iconCircle,
          compact && styles.compactCircle,
          { backgroundColor: meta.background },
        ]}
      >
        <Icon name={meta.icon} size={compact ? 'base' : iconSize.hero} color={meta.foreground} />
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
  compact: { padding: spacing.md },
  compactCircle: { width: 48, height: 48 },
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
