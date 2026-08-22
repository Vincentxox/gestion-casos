import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { PrimaryButton } from '@/components/buttons/PrimaryButton'
import { FormField } from '@/components/forms/FormField'
import { KeyboardFormScrollView } from '@/components/layout/KeyboardFormScrollView'
import { colors, radius, spacing } from '@/theme/tokens'

import { updateCaseSchema } from '../schemas'
import type { CasePriority, UpdateCaseInput } from '../types'

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
  category: '',
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

  function updateValue<Key extends keyof UpdateCaseInput>(key: Key, value: UpdateCaseInput[Key]) {
    setValues((current) => ({ ...current, [key]: value }))
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
        error={errors.category}
        label="Categoría"
        maxLength={80}
        onChangeText={(value) => updateValue('category', value)}
        placeholder="Ej. Agua potable"
        value={values.category}
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
        <View style={styles.priorityRow}>
          {PRIORITIES.map((priority) => (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: values.priority === priority }}
              key={priority}
              onPress={() => updateValue('priority', priority)}
              style={[styles.priority, values.priority === priority ? styles.priorityActive : null]}
            >
              <Text
                style={[
                  styles.priorityText,
                  values.priority === priority ? styles.priorityTextActive : null,
                ]}
              >
                {priority.charAt(0).toUpperCase() + priority.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      <PrimaryButton label={submitLabel} loading={loading} onPress={() => void handleSubmit()} />
    </KeyboardFormScrollView>
  )
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, padding: spacing.lg, paddingBottom: spacing.xl },
  multiline: { minHeight: 110, paddingTop: spacing.md },
  priorityGroup: { gap: spacing.sm },
  label: { color: colors.text, fontSize: 14, fontWeight: '600' },
  priorityRow: { flexDirection: 'row', gap: spacing.sm },
  priority: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingVertical: 12,
  },
  priorityActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  priorityText: { color: colors.textMuted, fontWeight: '700' },
  priorityTextActive: { color: colors.primary },
})
