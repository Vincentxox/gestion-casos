import { ActivityIndicator, Pressable, StyleSheet, Text, type PressableProps } from 'react-native'

import { colors, radius, spacing } from '@/theme/tokens'

interface PrimaryButtonProps extends PressableProps {
  label: string
  loading?: boolean
}

export function PrimaryButton({
  label,
  loading = false,
  disabled,
  style,
  ...pressableProps
}: PrimaryButtonProps) {
  const isDisabled = disabled || loading

  return (
    <Pressable
      {...pressableProps}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        pressed && !isDisabled ? styles.pressed : null,
        isDisabled ? styles.disabled : null,
        typeof style === 'function' ? style({ pressed }) : style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.white} />
      ) : (
        <Text style={styles.label}>{label}</Text>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
  },
  pressed: {
    backgroundColor: colors.primaryDark,
  },
  disabled: {
    opacity: 0.55,
  },
  label: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
})
