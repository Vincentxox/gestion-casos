import { useEffect } from 'react'
import { StyleSheet, View } from 'react-native'
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'

import { colors, radius, spacing } from '@/theme/tokens'

export function SkeletonList({ count = 3 }: { count?: number }) {
  const opacity = useSharedValue(1)
  const reduceMotion = useReducedMotion()
  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }))

  useEffect(() => {
    if (!reduceMotion) opacity.set(withRepeat(withTiming(0.5, { duration: 800 }), -1, true))
    return () => cancelAnimation(opacity)
  }, [opacity, reduceMotion])

  return (
    <Animated.View accessibilityLabel="Cargando lista" style={[styles.list, animatedStyle]}>
      {Array.from({ length: Math.max(0, count) }, (_, index) => (
        <View key={index} style={styles.card}>
          <View style={styles.heading} />
          <View style={styles.line} />
          <View style={styles.shortLine} />
        </View>
      ))}
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  list: { gap: spacing.base },
  card: {
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  heading: {
    width: '60%',
    height: 18,
    borderRadius: radius.sm,
    backgroundColor: colors.neutralSoft,
  },
  line: { width: '100%', height: 12, borderRadius: radius.sm, backgroundColor: colors.neutralSoft },
  shortLine: {
    width: '38%',
    height: 12,
    borderRadius: radius.sm,
    backgroundColor: colors.neutralSoft,
  },
})
