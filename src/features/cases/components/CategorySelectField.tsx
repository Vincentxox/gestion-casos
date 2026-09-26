import { Ionicons } from '@expo/vector-icons'
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import type { CategoryRecord } from '@/features/categories/types'
import { colors, radius, spacing, typography } from '@/theme/tokens'

interface Props {
  categories: CategoryRecord[]
  disabled?: boolean
  error?: string
  loading?: boolean
  onChange: (category: string) => void
  onClose: () => void
  onOpen: () => void
  open: boolean
  value: string
}

export function CategorySelectField({
  categories,
  disabled = false,
  error,
  loading = false,
  onChange,
  onClose,
  onOpen,
  open,
  value,
}: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Tipo de servicio</Text>
      <Pressable
        accessibilityHint="Abre el catálogo de tipos de servicio"
        accessibilityLabel="Tipo de servicio"
        accessibilityRole="button"
        disabled={disabled || loading}
        onPress={onOpen}
        style={[styles.selector, error ? styles.selectorError : null]}
      >
        <Text style={[styles.value, !value ? styles.placeholder : null]}>
          {loading
            ? 'Cargando tipos de servicio…'
            : categories.find((item) => item.id === value)?.name ||
              'Selecciona un tipo de servicio'}
        </Text>
        <Ionicons color={colors.textMuted} name="chevron-down" size={22} />
      </Pressable>
      {error ? (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          {error}
        </Text>
      ) : null}

      <Modal animationType="slide" onRequestClose={onClose} transparent visible={open}>
        <SafeAreaView edges={['bottom']} style={styles.overlay}>
          <Pressable
            accessibilityLabel="Cerrar tipos de servicio"
            onPress={onClose}
            style={styles.backdrop}
          />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <View style={styles.sheetTitleGroup}>
                <Text accessibilityRole="header" style={styles.sheetTitle}>
                  Seleccionar tipo de servicio
                </Text>
                <Text style={styles.sheetSubtitle}>
                  Elige el servicio que atenderá un área técnica.
                </Text>
              </View>
              <Pressable
                accessibilityLabel="Cerrar"
                accessibilityRole="button"
                onPress={onClose}
                style={styles.closeButton}
              >
                <Ionicons color={colors.text} name="close" size={28} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.options}>
              {categories.map((category) => {
                const selected = category.id === value
                return (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    key={category.id}
                    onPress={() => {
                      onChange(category.id)
                      onClose()
                    }}
                    style={[styles.option, selected ? styles.optionSelected : null]}
                  >
                    <View style={styles.optionContent}>
                      <Text style={styles.optionName}>{category.name}</Text>
                      <Text style={styles.areaName}>{category.areaName}</Text>
                    </View>
                    {selected ? (
                      <Ionicons color={colors.primary} name="checkmark-circle" size={24} />
                    ) : null}
                  </Pressable>
                )
              })}
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  label: { ...typography.body, color: colors.text },
  selector: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
  },
  selectorError: { borderColor: colors.error },
  value: { ...typography.body, flex: 1, color: colors.text },
  placeholder: { color: colors.textMuted },
  error: { ...typography.caption, color: colors.error },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(23, 43, 77, 0.42)',
  },
  sheet: {
    maxHeight: '78%',
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    backgroundColor: colors.background,
    paddingTop: spacing.lg,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  sheetTitleGroup: { flex: 1, gap: spacing.xs },
  sheetTitle: { ...typography.title, color: colors.text },
  closeButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  sheetSubtitle: { ...typography.caption, color: colors.textMuted },
  options: { gap: spacing.sm, padding: spacing.lg, paddingBottom: spacing.xl },
  option: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  optionSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  optionContent: { flex: 1, gap: spacing.xs },
  optionName: { ...typography.body, color: colors.text },
  areaName: { ...typography.caption, color: colors.primary },
})
