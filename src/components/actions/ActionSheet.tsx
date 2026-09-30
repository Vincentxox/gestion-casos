import { Pressable, StyleSheet, Text, View } from 'react-native'

import { BottomSheet } from '@/components/sheets/BottomSheet'
import { Icon, type IconName } from '@/components/ui/Icon'
import { colors, fonts, radius, spacing } from '@/theme/tokens'

export interface SheetAction<T extends string> {
  id: T
  label: string
  description?: string
  icon?: IconName
  destructive?: boolean
}

export function orderSheetActions<T extends string>(actions: SheetAction<T>[]) {
  return [
    ...actions.filter((action) => !action.destructive),
    ...actions.filter((action) => action.destructive),
  ]
}

export function ActionSheet<T extends string>({
  title,
  subtitle,
  actions,
  visible,
  onClose,
  onSelect,
}: {
  title: string
  subtitle?: string
  actions: SheetAction<T>[]
  visible: boolean
  onClose: () => void
  onSelect: (id: T) => void
}) {
  const ordered = orderSheetActions(actions)
  const compact = ordered.length <= 3
  return (
    <BottomSheet
      title={title}
      subtitle={subtitle}
      visible={visible}
      onClose={onClose}
      height={compact ? undefined : '55%'}
      fitContent={compact}
      scrollable={!compact}
      contentStyle={styles.options}
    >
      {ordered.map((action, index) => (
        <Pressable
          key={action.id}
          accessibilityRole="button"
          onPress={() => onSelect(action.id)}
          style={[
            styles.option,
            action.destructive &&
              (index === 0 || !ordered[index - 1]?.destructive) &&
              styles.destructiveDivider,
          ]}
        >
          <View style={[styles.iconCircle, action.destructive && styles.iconCircleDanger]}>
            {action.icon ? (
              <Icon
                name={action.icon}
                size="base"
                color={action.destructive ? colors.error : colors.primary}
              />
            ) : null}
          </View>
          <View style={styles.optionCopy}>
            <Text style={[styles.optionText, action.destructive && styles.destructive]}>
              {action.label}
            </Text>
            {action.description ? (
              <Text style={styles.optionDescription}>{action.description}</Text>
            ) : null}
          </View>
        </Pressable>
      ))}
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  options: { gap: 0 },
  option: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  iconCircleDanger: { backgroundColor: colors.dangerSoft },
  optionCopy: { flex: 1, gap: spacing.xs },
  optionText: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22, color: colors.text },
  optionDescription: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
  },
  destructive: { color: colors.error },
  destructiveDivider: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: spacing.sm },
})
