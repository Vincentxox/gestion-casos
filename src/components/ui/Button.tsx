import { ActivityIndicator, Pressable, StyleSheet, Text, type PressableProps } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'

import { Icon, type IconName } from '@/components/ui/Icon'
import { colors, fonts, radius, spacing } from '@/theme/tokens'

type Variant = 'primary' | 'secondary' | 'danger' | 'text'

export function Button({
  label,
  variant = 'primary',
  loading = false,
  disabled,
  icon,
  destructive = false,
  style,
  onPressIn,
  onPressOut,
  ...props
}: PressableProps & {
  label: string
  variant?: Variant
  loading?: boolean
  icon?: IconName
  destructive?: boolean
}) {
  const inactive = disabled || loading
  const pressedScale = useSharedValue(1)
  const reduceMotion = useReducedMotion()
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: pressedScale.value }] }))
  const foreground = destructive
    ? colors.error
    : variant === 'primary'
      ? colors.white
      : variant === 'danger'
        ? colors.dangerText
        : variant === 'secondary'
          ? colors.text
          : colors.primary

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        {...props}
        accessibilityLabel={props.accessibilityLabel ?? label}
        accessibilityRole="button"
        accessibilityState={{ disabled: inactive, busy: loading }}
        disabled={inactive}
        onPressIn={(event) => {
          if (!reduceMotion && !inactive) pressedScale.set(withTiming(0.98, { duration: 120 }))
          onPressIn?.(event)
        }}
        onPressOut={(event) => {
          pressedScale.set(withTiming(1, { duration: 120 }))
          onPressOut?.(event)
        }}
        style={({ pressed }) => [
          styles.button,
          styles[variant],
          inactive && styles.disabled,
          pressed && !inactive && styles.pressed,
          typeof style === 'function' ? style({ pressed }) : style,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={foreground} />
        ) : (
          <>
            {icon ? <Icon name={icon} size="inline" color={foreground} /> : null}
            <Text style={[styles.label, { color: foreground }]}>{label}</Text>
          </>
        )}
      </Pressable>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
  danger: { backgroundColor: colors.dangerBadge },
  text: { backgroundColor: 'transparent' },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.9 },
  label: { fontFamily: fonts.bold, fontSize: 15 },
})
