import { useEffect, useState, type ReactNode } from 'react'
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import { useReducedMotion } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { KeyboardFormScrollView } from '@/components/layout/KeyboardFormScrollView'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { colors, fonts, radius, spacing } from '@/theme/tokens'

interface FooterAction {
  label: string
  onPress: () => void
  loading?: boolean
  disabled?: boolean
  variant?: 'primary' | 'destructive'
}

interface BottomSheetProps {
  visible: boolean
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  footerAction?: FooterAction
  footerSecondaryAction?: Pick<FooterAction, 'label' | 'onPress' | 'disabled'>
  form?: boolean
  scrollable?: boolean
  height?: DimensionValue
  fitContent?: boolean
  contentStyle?: StyleProp<ViewStyle>
}

export function BottomSheet({
  visible,
  title,
  subtitle,
  onClose,
  children,
  footerAction,
  footerSecondaryAction,
  form = false,
  scrollable = true,
  height,
  fitContent = false,
  contentStyle,
}: BottomSheetProps) {
  const insets = useSafeAreaInsets()
  const { height: windowHeight } = useWindowDimensions()
  const reduceMotion = useReducedMotion()
  const [mounted, setMounted] = useState(visible)
  const [sheetHeight, setSheetHeight] = useState(0)
  const [translateY] = useState(() => new Animated.Value(windowHeight))

  useEffect(() => {
    if (visible) {
      // El Modal ya es visible; esperamos su layout antes de conservarlo para la salida.
      if (!mounted) return
      if (reduceMotion) {
        translateY.setValue(0)
        return
      }
      if (!sheetHeight) return
      translateY.setValue(sheetHeight)
      const animation = Animated.timing(translateY, {
        toValue: 0,
        duration: 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      })
      animation.start()
      return () => animation.stop()
    }
    if (!mounted) return
    if (reduceMotion) {
      const frame = requestAnimationFrame(() => setMounted(false))
      return () => cancelAnimationFrame(frame)
    }
    const animation = Animated.timing(translateY, {
      toValue: sheetHeight || windowHeight,
      duration: 250,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    })
    animation.start(({ finished }) => {
      if (finished) setMounted(false)
    })
    return () => animation.stop()
  }, [visible, mounted, reduceMotion, sheetHeight, translateY, windowHeight])
  const content = form ? (
    <KeyboardFormScrollView
      contentContainerStyle={[styles.content, contentStyle]}
      style={styles.scrollArea}
    >
      {children}
    </KeyboardFormScrollView>
  ) : scrollable ? (
    <ScrollView
      contentContainerStyle={[styles.content, contentStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      style={styles.scrollArea}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, !fitContent && styles.staticContent, contentStyle]}>
      {children}
    </View>
  )

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible || mounted}>
      <View style={styles.overlay}>
        <Pressable
          accessibilityLabel="Cerrar hoja"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.backdrop}
          testID="bottom-sheet-backdrop"
        />
        <Animated.View
          accessibilityViewIsModal
          onLayout={(event) => {
            setSheetHeight(event.nativeEvent.layout.height)
            if (visible && !mounted) setMounted(true)
          }}
          style={[
            styles.sheet,
            { height: fitContent ? 'auto' : (height ?? '80%') },
            { transform: [{ translateY }] },
          ]}
          testID="bottom-sheet"
        >
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.heading}>
              <Text accessibilityRole="header" style={styles.title}>
                {title}
              </Text>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
            <Pressable
              accessibilityLabel={`Cerrar ${title}`}
              accessibilityRole="button"
              onPress={onClose}
              style={styles.closeButton}
            >
              <Icon name="close" color={colors.text} size="base" />
            </Pressable>
          </View>
          {content}
          {footerAction ? (
            <View
              style={[
                styles.footer,
                footerSecondaryAction && styles.footerRow,
                { paddingBottom: Math.max(insets.bottom, spacing.md) },
              ]}
            >
              {footerSecondaryAction ? (
                <Button
                  label={footerSecondaryAction.label}
                  onPress={footerSecondaryAction.onPress}
                  disabled={footerSecondaryAction.disabled}
                  variant="secondary"
                  containerStyle={styles.secondaryAction}
                />
              ) : null}
              <Button
                label={footerAction.label}
                loading={footerAction.loading}
                disabled={footerAction.disabled}
                onPress={footerAction.onPress}
                variant={footerAction.variant ?? 'primary'}
                containerStyle={footerSecondaryAction ? styles.primaryAction : undefined}
              />
            </View>
          ) : (
            <View style={{ height: Math.max(insets.bottom, spacing.md) }} />
          )}
        </Animated.View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: colors.modalBackdrop },
  sheet: {
    maxHeight: '90%',
    minHeight: 180,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    backgroundColor: colors.surface,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    marginTop: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.track,
  },
  header: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  heading: { flex: 1, gap: spacing.xs },
  title: { fontFamily: fonts.extrabold, fontSize: 22, lineHeight: 28, color: colors.ink },
  subtitle: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.textMuted },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  scrollArea: { flex: 1 },
  content: { gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  staticContent: { flex: 1 },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  secondaryAction: { flexGrow: 0 },
  primaryAction: { flex: 1 },
})
