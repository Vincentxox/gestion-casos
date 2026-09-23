import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { colors, radius, spacing } from '@/theme/tokens'

export interface SheetAction<T extends string> {
  id: T
  label: string
  destructive?: boolean
}

export function ActionSheet<T extends string>({
  title,
  actions,
  visible,
  onClose,
  onSelect,
}: {
  title: string
  actions: SheetAction<T>[]
  visible: boolean
  onClose: () => void
  onSelect: (id: T) => void
}) {
  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <SafeAreaView edges={['bottom']} style={styles.overlay}>
        <Pressable accessibilityLabel="Cerrar acciones" onPress={onClose} style={styles.backdrop} />
        <View style={styles.sheet}>
          <Text accessibilityRole="header" style={styles.title}>
            {title}
          </Text>
          {actions.map((action) => (
            <Pressable
              key={action.id}
              accessibilityRole="button"
              onPress={() => onSelect(action.id)}
              style={styles.option}
            >
              <Text style={[styles.optionText, action.destructive && styles.destructive]}>
                {action.label}
              </Text>
            </Pressable>
          ))}
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.option}>
            <Text style={styles.optionText}>Volver</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(23,43,77,0.42)',
  },
  sheet: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  title: { color: colors.text, fontSize: 20, fontWeight: '800', marginBottom: spacing.sm },
  option: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  optionText: { color: colors.primary, fontWeight: '800' },
  destructive: { color: colors.error },
})
