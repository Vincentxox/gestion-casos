import type { ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Icon, type IconName } from '@/components/ui/Icon'
import { colors, radius, spacing, typography } from '@/theme/tokens'

export function ScreenHeader({
  title,
  onBack,
  backLabel = 'Volver',
  action,
  right,
  backDisabled = false,
}: {
  title: string
  onBack: () => void
  backLabel?: string
  action?: { label: string; onPress: () => void; icon?: IconName }
  right?: ReactNode
  backDisabled?: boolean
}) {
  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View testID="screen-header" style={styles.row}>
        <Pressable
          accessibilityLabel={backLabel}
          accessibilityRole="button"
          accessibilityState={{ disabled: backDisabled }}
          disabled={backDisabled}
          onPress={onBack}
          style={styles.back}
        >
          <Icon name="arrow-back" color={colors.ink} size={22} />
        </Pressable>
        <Text accessibilityRole="header" numberOfLines={1} style={styles.title}>
          {title}
        </Text>
        {right !== undefined ? (
          right
        ) : action ? (
          <Pressable
            accessibilityLabel={action.label}
            accessibilityRole="button"
            onPress={action.onPress}
            style={styles.action}
          >
            {action.icon ? <Icon name={action.icon} color={colors.primary} size={20} /> : null}
            <Text style={styles.actionText}>{action.label}</Text>
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.background },
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.base,
    paddingHorizontal: spacing.md,
  },
  back: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  title: { ...typography.title, color: colors.ink, flex: 1 },
  action: {
    minHeight: 44,
    minWidth: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  actionText: { ...typography.label, color: colors.primary },
})
