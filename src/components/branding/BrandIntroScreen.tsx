import { useEffect, useState } from 'react'
import { AccessibilityInfo, Animated, Easing, Image, StyleSheet, Text, View } from 'react-native'

import { colors, spacing } from '@/theme/tokens'

type Props = {
  onFinish: () => void
}

const logoSource = require('../../../assets/logo-mark.png')

export function BrandIntroScreen({ onFinish, ready = true }: Props & { ready?: boolean }) {
  const [opacity] = useState(() => new Animated.Value(0))
  const [scale] = useState(() => new Animated.Value(0.82))
  const [translateY] = useState(() => new Animated.Value(12))
  const [introComplete, setIntroComplete] = useState(false)

  useEffect(() => {
    let active = true
    let animation: Animated.CompositeAnimation | null = null
    let reduceMotionTimeout: ReturnType<typeof setTimeout> | null = null

    void AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (!active) return

      if (reduceMotion) {
        opacity.setValue(1)
        scale.setValue(1)
        translateY.setValue(0)
        reduceMotionTimeout = setTimeout(() => active && setIntroComplete(true), 650)
        return
      }

      animation = Animated.sequence([
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 450,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.spring(scale, {
            toValue: 1,
            damping: 12,
            stiffness: 120,
            mass: 0.8,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: 0,
            duration: 500,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
        Animated.delay(850),
      ])
      animation.start(({ finished }) => {
        if (active && finished) setIntroComplete(true)
      })
    })

    return () => {
      active = false
      animation?.stop()
      if (reduceMotionTimeout) clearTimeout(reduceMotionTimeout)
    }
  }, [opacity, scale, translateY])

  useEffect(() => {
    if (!introComplete || !ready) return
    const animation = Animated.timing(opacity, {
      toValue: 0,
      duration: 260,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    })
    animation.start(({ finished }) => {
      if (finished) onFinish()
    })
    return () => animation.stop()
  }, [introComplete, onFinish, opacity, ready])

  return (
    <View accessibilityLabel="Nexo Casos" accessibilityRole="summary" style={styles.container}>
      <Animated.View style={[styles.content, { opacity, transform: [{ scale }, { translateY }] }]}>
        <Image accessible={false} resizeMode="contain" source={logoSource} style={styles.logo} />
        <Text style={styles.name}>Nexo Casos</Text>
        <Text style={styles.tagline}>Conecta cada caso con su solución</Text>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  content: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
  },
  logo: {
    width: 148,
    height: 148,
    marginBottom: spacing.sm,
  },
  name: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  tagline: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
})
