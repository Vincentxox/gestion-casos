import { useEffect, useRef, useState } from 'react'
import {
  AccessibilityInfo,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'

import { colors, fonts, radius, spacing, typography } from '@/theme/tokens'

import { useGuidedTour, type TourRect } from './useGuidedTour'

export function visibleRect(
  measured: TourRect | null,
  origin: { x: number; y: number },
  width: number,
  height: number,
): TourRect | null {
  const rect = measured && {
    ...measured,
    x: measured.x - origin.x,
    y: measured.y - origin.y,
  }
  if (
    !rect ||
    rect.width < 1 ||
    rect.height < 1 ||
    rect.y >= height ||
    rect.x >= width ||
    rect.x + rect.width <= 0 ||
    rect.y + rect.height <= 0
  )
    return null
  const x = Math.max(4, rect.x - 4)
  const y = Math.max(4, rect.y - 4)
  return {
    x,
    y,
    width: Math.min(width - x - 4, rect.width + 8),
    height: Math.min(height - y - 4, rect.height + 8),
  }
}

export function GuidedTourOverlay({
  state: tabs,
  navigation,
}: Pick<BottomTabBarProps, 'state' | 'navigation'>) {
  const { width, height } = useWindowDimensions()
  const active = useGuidedTour((state) => state.active)
  const steps = useGuidedTour((state) => state.steps)
  const index = useGuidedTour((state) => state.index)
  const target = useGuidedTour((state) => state.target)
  const rect = useGuidedTour((state) => state.rect)
  const setTarget = useGuidedTour((state) => state.setTarget)
  const next = useGuidedTour((state) => state.next)
  const skip = useGuidedTour((state) => state.skip)
  const step = active ? steps[index] : undefined
  const fallback = Boolean(step && target !== step.target)
  const tab = tabs.routes[tabs.index]?.name
  // Android can report window positions below the status bar while this full-screen modal starts
  // at the top of the screen. Measuring the modal root with the same API gives the shift to undo.
  const rootRef = useRef<View>(null)
  const [origin, setOrigin] = useState({ x: 0, y: 0 })
  const measureOrigin = () =>
    rootRef.current?.measureInWindow((x, y) => {
      if (x !== origin.x || y !== origin.y) setOrigin({ x, y })
    })

  useEffect(() => {
    if (!step) return
    if (step.tab === 'CasesTab') navigation.navigate('CasesTab', { screen: 'Cases' })
    else if (tab !== step.tab) navigation.navigate(step.tab)
  }, [step, tab, navigation])

  useEffect(() => {
    if (!step || target !== step.target || visibleRect(rect, origin, width, height)) return
    const timer = setTimeout(() => {
      const fallbackTarget = `tab:${step.tab}` as typeof target
      if (target !== fallbackTarget) setTarget(fallbackTarget)
    }, 1500)
    return () => clearTimeout(timer)
  }, [step, target, rect, origin, width, height, setTarget])

  useEffect(() => {
    if (!step) return
    AccessibilityInfo.announceForAccessibility(
      `Paso ${index + 1} de ${steps.length}. ${step.title}`,
    )
  }, [step, index, steps.length])

  if (!step) return null
  const hole = visibleRect(rect, origin, width, height)
  const bubbleBelow = Boolean(hole && hole.y + hole.height + 12 + 230 < height)
  const bubbleTop = hole
    ? bubbleBelow
      ? hole.y + hole.height + 12
      : Math.max(24, hole.y - 244)
    : Math.max(40, (height - 220) / 2)
  const arrowLeft = hole
    ? Math.max(24, Math.min(width - spacing.md * 2 - 32, hole.x + hole.width / 2 - spacing.md - 8))
    : 0

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => void skip()}
    >
      <View
        ref={rootRef}
        collapsable={false}
        onLayout={measureOrigin}
        accessibilityViewIsModal
        style={styles.root}
      >
        {hole ? (
          <>
            <View style={[styles.dim, { left: 0, top: 0, right: 0, height: hole.y }]} />
            <View
              style={[styles.dim, { left: 0, top: hole.y, width: hole.x, height: hole.height }]}
            />
            <View
              style={[
                styles.dim,
                { left: hole.x + hole.width, top: hole.y, right: 0, height: hole.height },
              ]}
            />
            <View
              style={[styles.dim, { left: 0, top: hole.y + hole.height, right: 0, bottom: 0 }]}
            />
            <View
              pointerEvents="none"
              style={[
                styles.outline,
                { left: hole.x, top: hole.y, width: hole.width, height: hole.height },
              ]}
            />
          </>
        ) : (
          <View style={[styles.dim, StyleSheet.absoluteFill]} />
        )}
        <View
          style={[
            styles.bubble,
            { left: spacing.md, right: spacing.md, top: bubbleTop, maxHeight: height - 48 },
          ]}
        >
          {hole ? (
            <View
              pointerEvents="none"
              style={[
                styles.arrow,
                { left: arrowLeft },
                bubbleBelow ? styles.arrowTop : styles.arrowBottom,
              ]}
            />
          ) : null}
          <Text style={styles.overline}>
            PASO {index + 1} DE {steps.length}
          </Text>
          <Text accessibilityRole="header" style={styles.title}>
            {step.title}
          </Text>
          <Text style={styles.detail}>{step.detail}</Text>
          <View style={styles.footer}>
            <View accessibilityLabel={`Paso ${index + 1} de ${steps.length}`} style={styles.dots}>
              {steps.map((item, dotIndex) => (
                <View key={item.id} style={[styles.dot, dotIndex === index && styles.dotActive]} />
              ))}
            </View>
            <Pressable accessibilityRole="button" onPress={() => void skip()} style={styles.skip}>
              <Text style={styles.skipText}>Saltar</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => void next()} style={styles.next}>
              <Text style={styles.nextText}>
                {index === steps.length - 1 ? 'Terminar' : 'Siguiente'}
              </Text>
            </Pressable>
          </View>
          {fallback ? (
            <Text style={styles.fallback}>Encuentra esta opción en {step.where}.</Text>
          ) : null}
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  dim: { position: 'absolute', backgroundColor: colors.modalBackdrop },
  outline: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: colors.sky,
    borderRadius: radius.lg,
  },
  arrow: {
    position: 'absolute',
    width: 16,
    height: 16,
    transform: [{ rotate: '45deg' }],
    backgroundColor: colors.surface,
  },
  arrowTop: { top: -7 },
  arrowBottom: { bottom: -7 },
  bubble: {
    position: 'absolute',
    padding: spacing.md,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  overline: { ...typography.overline, color: colors.primary },
  title: { ...typography.heading, color: colors.ink },
  detail: { ...typography.body, color: colors.textMuted },
  footer: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  dots: { flex: 1, flexDirection: 'row', gap: 4 },
  dot: { width: 7, height: 7, borderRadius: radius.pill, backgroundColor: colors.track },
  dotActive: { width: 18, backgroundColor: colors.primary },
  skip: { minHeight: 48, justifyContent: 'center', paddingHorizontal: spacing.sm },
  skipText: { ...typography.caption, color: colors.textMuted },
  next: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  nextText: { ...typography.caption, fontFamily: fonts.bold, color: colors.white },
  fallback: { ...typography.caption, color: colors.textMuted },
})
