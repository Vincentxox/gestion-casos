import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { FormField } from '@/components/forms/FormField'
import { KeyboardFormScrollView } from '@/components/layout/KeyboardFormScrollView'
import { useCategories } from '@/features/categories/useCategories'
import { colors, radius, spacing, typography } from '@/theme/tokens'
import { priorityMeta } from '@/theme/statusMeta'

import { updateCaseSchema } from '../schemas'
import type { CasePriority, UpdateCaseInput } from '../types'
import { CategorySelectField } from './CategorySelectField'

const PRIORITIES: CasePriority[] = ['alta', 'media', 'baja']

interface Props {
  initialValues?: UpdateCaseInput
  loading?: boolean
  onSubmit: (input: UpdateCaseInput) => Promise<void>
  submitLabel: string
}

const PRIORITY_EXPLANATIONS: Record<CasePriority, string> = {
  alta: 'Alta: detiene la operación y necesita atención urgente.',
  media: 'Media: requiere atención, pero no detiene la operación.',
  baja: 'Baja: puede programarse sin afectar la operación.',
}

const emptyValues: UpdateCaseInput = {
  title: '',
  description: '',
  categoryId: '',
  location: '',
  priority: 'media',
}

export function CaseForm({
  initialValues = emptyValues,
  loading = false,
  onSubmit,
  submitLabel,
}: Props) {
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [categorySelectorOpen, setCategorySelectorOpen] = useState(false)
  const [footerHeight, setFooterHeight] = useState(0)
  const categoriesQuery = useCategories()
  const availableCategories = (categoriesQuery.data ?? []).filter(
    (category) => category.isActive || category.id === values.categoryId,
  )

  function updateValue<Key extends keyof UpdateCaseInput>(key: Key, value: UpdateCaseInput[Key]) {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => {
      if (!current[key]) return current
      const next = { ...current }
      delete next[key]
      return next
    })
  }

  async function handleSubmit() {
    const result = updateCaseSchema.safeParse(values)
    if (!result.success) {
      const nextErrors: Record<string, string> = {}
      for (const issue of result.error.issues) nextErrors[String(issue.path[0])] ??= issue.message
      setErrors(nextErrors)
      return
    }

    setErrors({})
    await onSubmit(result.data)
  }

  return (
    <View style={styles.form}>
      <KeyboardFormScrollView
        contentContainerStyle={[styles.content, { paddingBottom: footerHeight + spacing.xl }]}
      >
        <Text style={styles.sectionTitle}>Qué necesitas</Text>
        <CategorySelectField
          categories={availableCategories}
          disabled={categoriesQuery.isError || availableCategories.length === 0}
          error={errors.categoryId}
          loading={categoriesQuery.isLoading}
          onChange={(value) => updateValue('categoryId', value)}
          onClose={() => setCategorySelectorOpen(false)}
          onOpen={() => setCategorySelectorOpen(true)}
          open={categorySelectorOpen}
          value={values.categoryId}
        />
        {categoriesQuery.isError ? (
          <Pressable accessibilityRole="button" onPress={() => void categoriesQuery.refetch()}>
            <Text style={styles.catalogError}>
              No se cargaron los tipos de servicio. Toca para reintentar.
            </Text>
          </Pressable>
        ) : null}
        <Text style={styles.sectionTitle}>Qué pasa</Text>
        <FormField
          error={errors.title}
          label="Título"
          maxLength={120}
          showCharacterCount
          characterCountThreshold={0.8}
          onChangeText={(value) => updateValue('title', value)}
          placeholder="Ej. Fuga de agua en medidor"
          value={values.title}
        />
        <FormField
          error={errors.description}
          label="Descripción"
          maxLength={2000}
          multiline
          showCharacterCount
          characterCountThreshold={0.8}
          onChangeText={(value) => updateValue('description', value)}
          placeholder="Describe qué sucede y cualquier información útil"
          style={styles.multiline}
          textAlignVertical="top"
          value={values.description}
        />
        <Text style={styles.sectionTitle}>Dónde</Text>
        <FormField
          error={errors.location}
          label="Ubicación"
          maxLength={180}
          onChangeText={(value) => updateValue('location', value)}
          placeholder="Dirección o referencia"
          value={values.location}
        />
        <Text style={styles.sectionTitle}>Qué tan urgente</Text>
        <View style={styles.priorityGroup}>
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel="Prioridad"
            style={styles.priorityRow}
          >
            {PRIORITIES.map((priority) => (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ checked: values.priority === priority }}
                key={priority}
                onPress={() => updateValue('priority', priority)}
                style={({ pressed }) => [
                  styles.priority,
                  values.priority === priority && styles.prioritySelected,
                  pressed && styles.priorityPressed,
                ]}
              >
                <Icon
                  name={priorityMeta[priority].icon}
                  size="inline"
                  color={priorityMeta[priority].color}
                />
                <Text
                  style={[
                    styles.priorityText,
                    values.priority === priority && styles.priorityTextSelected,
                  ]}
                >
                  {priorityMeta[priority].label}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.priorityHint}>{PRIORITY_EXPLANATIONS[values.priority]}</Text>
        </View>
      </KeyboardFormScrollView>
      <View
        style={styles.footer}
        onLayout={(event) => setFooterHeight(event.nativeEvent.layout.height)}
      >
        <Button label={submitLabel} loading={loading} onPress={() => void handleSubmit()} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  form: { flex: 1 },
  content: { gap: spacing.md, padding: spacing.lg },
  footer: { padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  sectionTitle: { ...typography.heading, color: colors.text, marginTop: spacing.sm },
  multiline: { minHeight: 110, paddingTop: spacing.md },
  catalogError: { ...typography.caption, color: colors.error },
  priorityGroup: { gap: spacing.sm },
  priorityHint: { ...typography.caption, color: colors.textMuted },
  priorityRow: {
    flexDirection: 'row',
    padding: spacing.xs,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
  },
  priority: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    paddingVertical: 12,
  },
  prioritySelected: { backgroundColor: colors.surface, elevation: 2 },
  priorityPressed: { backgroundColor: colors.surfaceMuted },
  priorityText: { ...typography.body, color: colors.textMuted },
  priorityTextSelected: { color: colors.text },
})
