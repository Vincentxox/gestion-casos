import type { ReactNode } from 'react'
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { KeyboardFormScrollView } from '@/components/layout/KeyboardFormScrollView'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { colors, elevation, fonts, radius, spacing } from '@/theme/tokens'

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
  form = false,
  scrollable = true,
  height,
  fitContent = false,
  contentStyle,
}: BottomSheetProps) {
  const insets = useSafeAreaInsets()
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
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.overlay}>
        <Pressable
          accessibilityLabel="Cerrar hoja"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.backdrop}
          testID="bottom-sheet-backdrop"
        />
        <View
          accessibilityViewIsModal
          style={[styles.sheet, { height: fitContent ? 'auto' : (height ?? '80%') }]}
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
            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
              <Button
                label={footerAction.label}
                loading={footerAction.loading}
                disabled={footerAction.disabled}
                onPress={footerAction.onPress}
                variant={footerAction.variant ?? 'primary'}
              />
            </View>
          ) : (
            <View style={{ height: Math.max(insets.bottom, spacing.md) }} />
          )}
        </View>
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
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    backgroundColor: colors.surface,
    ...elevation.md,
    shadowOffset: { width: 0, height: -4 },
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    marginTop: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
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
  title: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 26, color: colors.text },
  subtitle: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.textMuted },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  scrollArea: { flex: 1 },
  content: { gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  staticContent: { flex: 1 },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
})
