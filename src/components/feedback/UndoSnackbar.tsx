import { useEffect } from 'react'
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { colors, fonts, radius, spacing, typography } from '@/theme/tokens'

export function UndoSnackbar({ count, onUndo }: { count: number; onUndo: () => void }) {
  const insets = useSafeAreaInsets()
  const message = count === 1 ? 'Aviso borrado' : `${count} avisos borrados`

  useEffect(() => {
    if (count > 0) AccessibilityInfo.announceForAccessibility(`${message}. Deshacer`)
  }, [count, message])

  if (count === 0) return null
  return (
    <View
      accessibilityLiveRegion="polite"
      style={[styles.container, { bottom: insets.bottom + spacing.md }]}
    >
      <Text style={styles.message}>{message}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Deshacer"
        onPress={onUndo}
        style={styles.action}
      >
        <Text style={styles.actionText}>Deshacer</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    backgroundColor: colors.night,
    borderRadius: radius.md,
    minHeight: 56,
    paddingLeft: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  message: { ...typography.body, color: colors.white, flex: 1 },
  action: {
    minWidth: 88,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  actionText: { ...typography.caption, color: colors.sky, fontFamily: fonts.bold },
})
