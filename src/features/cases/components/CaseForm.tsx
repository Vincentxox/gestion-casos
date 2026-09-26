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
    <KeyboardFormScrollView contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>¿Qué necesitas?</Text>
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
      <Text style={styles.sectionTitle}>Detalles</Text>
      <FormField
        error={errors.title}
        label="Título"
        maxLength={120}
        onChangeText={(value) => updateValue('title', value)}
        placeholder="Ej. Fuga de agua en medidor"
        value={values.title}
      />
      <FormField
        error={errors.description}
        label="Descripción"
        maxLength={2000}
        multiline
        onChangeText={(value) => updateValue('description', value)}
        placeholder="Describe qué sucede y cualquier información útil"
        style={styles.multiline}
        textAlignVertical="top"
        value={values.description}
      />
      <FormField
        error={errors.location}
        label="Ubicación"
        maxLength={180}
        onChangeText={(value) => updateValue('location', value)}
        placeholder="Dirección o referencia"
        value={values.location}
      />
      <View style={styles.priorityGroup}>
        <Text style={styles.label}>Prioridad</Text>
        <Text style={styles.priorityHint}>
          Alta: detiene la operación. Media: requiere atención. Baja: puede programarse.
        </Text>
        <View style={styles.priorityRow}>
          {PRIORITIES.map((priority) => (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: values.priority === priority }}
              key={priority}
              onPress={() => updateValue('priority', priority)}
              style={[
                styles.priority,
                values.priority === priority ? { borderColor: priorityMeta[priority].color } : null,
              ]}
            >
              <Icon
                name={priorityMeta[priority].icon}
                size="inline"
                color={priorityMeta[priority].color}
              />
              <Text style={[styles.priorityText, { color: priorityMeta[priority].color }]}>
                {priorityMeta[priority].label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      <Button label={submitLabel} loading={loading} onPress={() => void handleSubmit()} />
    </KeyboardFormScrollView>
  )
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, padding: spacing.lg, paddingBottom: spacing.xl },
  sectionTitle: { ...typography.heading, color: colors.text, marginTop: spacing.sm },
  multiline: { minHeight: 110, paddingTop: spacing.md },
  catalogError: { ...typography.caption, color: colors.error },
  priorityGroup: { gap: spacing.sm },
  label: { ...typography.body, color: colors.text },
  priorityHint: { ...typography.caption, color: colors.textMuted },
  priorityRow: { flexDirection: 'row', gap: spacing.sm },
  priority: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingVertical: 12,
  },
  priorityText: { ...typography.body, color: colors.textMuted },
})
