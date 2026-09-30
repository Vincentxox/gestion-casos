import { Ionicons } from '@expo/vector-icons'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { BottomSheet } from '@/components/sheets/BottomSheet'

import type { CategoryRecord } from '@/features/categories/types'
import { colors, radius, spacing, typography } from '@/theme/tokens'

interface Props {
  categories: CategoryRecord[]
  disabled?: boolean
  error?: string
  loading?: boolean
  required?: boolean
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
  required = false,
  onChange,
  onClose,
  onOpen,
  open,
  value,
}: Props) {
  return (
    <View style={styles.container}>
      <Text
        accessibilityLabel={required ? 'Tipo de servicio, obligatorio' : 'Tipo de servicio'}
        style={styles.label}
      >
        Tipo de servicio{required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      <Pressable
        accessibilityHint="Abre el catálogo de tipos de servicio"
        accessibilityLabel={required ? 'Tipo de servicio, obligatorio' : 'Tipo de servicio'}
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

      <BottomSheet
        title="Seleccionar tipo de servicio"
        subtitle="Elige el servicio que atenderá un área técnica."
        visible={open}
        onClose={onClose}
        height="78%"
        contentStyle={styles.options}
      >
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
      </BottomSheet>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  label: { ...typography.body, color: colors.text },
  required: { color: colors.error },
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
