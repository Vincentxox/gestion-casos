import { useEffect, useState } from 'react'
import { AccessibilityInfo, Animated, Easing, Image, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import appConfig from '../../../app.json'
import { colors, elevation, fonts, radius, spacing, typography } from '@/theme/tokens'

type Props = { onFinish: () => void; ready: boolean }

const logoSource = require('../../../assets/logo-mark.png')

export function BrandIntroScreen({ onFinish, ready }: Props) {
  const insets = useSafeAreaInsets()
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null)
  const [introComplete, setIntroComplete] = useState(false)
  const [logoOpacity] = useState(() => new Animated.Value(0))
  const [logoScale] = useState(() => new Animated.Value(0.82))
  const [nameOpacity] = useState(() => new Animated.Value(0))
  const [nameOffset] = useState(() => new Animated.Value(12))
  const [taglineOpacity] = useState(() => new Animated.Value(0))
  const [taglineOffset] = useState(() => new Animated.Value(12))
  const [progressOffset] = useState(() => new Animated.Value(-28))
  const [screenOpacity] = useState(() => new Animated.Value(1))

  useEffect(() => {
    let active = true
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (active) setReduceMotion(enabled)
      })
      .catch(() => {
        if (active) setReduceMotion(false)
      })
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion)
    return () => {
      active = false
      subscription.remove()
    }
  }, [])

  useEffect(() => {
    if (reduceMotion === null) return
    if (reduceMotion) {
      logoOpacity.setValue(1)
      logoScale.setValue(1)
      nameOpacity.setValue(1)
      nameOffset.setValue(0)
      taglineOpacity.setValue(1)
      taglineOffset.setValue(0)
      const timeout = setTimeout(() => setIntroComplete(true), 650)
      return () => clearTimeout(timeout)
    }

    const entrance = Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 420,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 420,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(nameOpacity, { toValue: 1, duration: 320, useNativeDriver: true }),
        Animated.timing(nameOffset, {
          toValue: 0,
          duration: 320,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(taglineOpacity, { toValue: 1, duration: 320, useNativeDriver: true }),
        Animated.timing(taglineOffset, {
          toValue: 0,
          duration: 320,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(400),
    ])
    entrance.start(({ finished }) => {
      if (finished) setIntroComplete(true)
    })
    return () => entrance.stop()
  }, [logoOpacity, logoScale, nameOffset, nameOpacity, reduceMotion, taglineOffset, taglineOpacity])

  useEffect(() => {
    if (reduceMotion !== false) return
    const progress = Animated.loop(
      Animated.timing(progressOffset, {
        toValue: 84,
        duration: 1200,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    )
    progress.start()
    return () => progress.stop()
  }, [progressOffset, reduceMotion])

  useEffect(() => {
    if (!introComplete || !ready) return
    if (reduceMotion) {
      onFinish()
      return
    }
    const exit = Animated.timing(screenOpacity, {
      toValue: 0,
      duration: 260,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    })
    exit.start(({ finished }) => {
      if (finished) onFinish()
    })
    return () => exit.stop()
  }, [introComplete, onFinish, ready, reduceMotion, screenOpacity])

  return (
    <Animated.View
      accessibilityLabel="Nexo Casos, iniciando"
      accessibilityRole="summary"
      style={[styles.container, { opacity: screenOpacity }]}
    >
      <View style={styles.content}>
        <Animated.View
          style={[styles.logoCard, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}
        >
          <Image accessible={false} resizeMode="contain" source={logoSource} style={styles.logo} />
        </Animated.View>
        <Animated.Text
          numberOfLines={1}
          style={[styles.name, { opacity: nameOpacity, transform: [{ translateY: nameOffset }] }]}
        >
          Nexo Casos
        </Animated.Text>
        <Animated.Text
          style={[
            styles.tagline,
            { opacity: taglineOpacity, transform: [{ translateY: taglineOffset }] },
          ]}
        >
          Conecta cada caso con su solución
        </Animated.Text>
        <View accessibilityLabel="Cargando sesión" style={styles.progressTrack}>
          {reduceMotion ? (
            <View style={styles.progressStatic} />
          ) : (
            <Animated.View
              style={[styles.progressBar, { transform: [{ translateX: progressOffset }] }]}
            />
          )}
        </View>
      </View>
      <Text style={[styles.version, { bottom: insets.bottom + spacing.lg }]}>
        Versión {appConfig.expo.version}
      </Text>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  content: { alignItems: 'center', width: '100%', paddingHorizontal: spacing.xl },
  logoCard: {
    width: 112,
    height: 112,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    ...elevation.sm,
    marginBottom: spacing.lg,
  },
  logo: { width: 100, height: 100 },
  name: {
    ...typography.title,
    fontFamily: fonts.extrabold,
    fontSize: 24,
    lineHeight: 30,
    color: colors.text,
    textAlign: 'center',
    alignSelf: 'stretch',
  },
  tagline: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  progressTrack: {
    width: 84,
    height: 4,
    overflow: 'hidden',
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    marginTop: spacing.xl,
  },
  progressBar: {
    width: 28,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  progressStatic: {
    width: 84,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  version: {
    ...typography.caption,
    position: 'absolute',
    color: colors.textMuted,
    textAlign: 'center',
  },
})
