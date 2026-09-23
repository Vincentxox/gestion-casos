import type { ReactNode } from 'react'
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'

import { colors, elevation, radius } from '@/theme/tokens'

export function Card({
  children,
  style,
  onPress,
  accessibilityLabel,
}: {
  children: ReactNode
  style?: StyleProp<ViewStyle>
  onPress?: () => void
  accessibilityLabel?: string
}) {
  const scale = useSharedValue(1)
  const reduceMotion = useReducedMotion()
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

  if (!onPress) return <View style={[styles.card, style]}>{children}</View>

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        onPress={onPress}
        onPressIn={() => {
          if (!reduceMotion) scale.set(withTiming(0.98, { duration: 120 }))
        }}
        onPressOut={() => {
          scale.set(withTiming(1, { duration: 120 }))
        }}
        style={[styles.card, style]}
      >
        {children}
      </Pressable>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: 14,
    ...elevation.sm,
  },
})
