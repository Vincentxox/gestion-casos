import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Button } from '@/components/ui/Button'
import { Icon, type IconName } from '@/components/ui/Icon'
import { colors, radius, spacing, typography } from '@/theme/tokens'

export interface SheetAction<T extends string> {
  id: T
  label: string
  icon?: IconName
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
              {action.icon ? (
                <Icon
                  name={action.icon}
                  size="base"
                  color={action.destructive ? colors.error : colors.primary}
                />
              ) : null}
              <Text style={[styles.optionText, action.destructive && styles.destructive]}>
                {action.label}
              </Text>
            </Pressable>
          ))}
          <Button label="Volver" variant="text" onPress={onClose} />
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
    backgroundColor: colors.backdrop,
  },
  sheet: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  title: { ...typography.title, color: colors.text, marginBottom: spacing.sm },
  option: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  optionText: { ...typography.heading, color: colors.primary },
  destructive: { color: colors.error },
})
