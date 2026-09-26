import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/forms/FormField'
import { colors, radius, spacing, typography } from '@/theme/tokens'

import { areaSchema } from '../schemas'
import type { AreaInput, AreaRecord } from '../types'

interface AreaFormProps {
  area?: AreaRecord
  loading: boolean
  onSubmit: (input: AreaInput) => void
}

export function AreaForm({ area, loading, onSubmit }: AreaFormProps) {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<AreaInput>({
    resolver: zodResolver(areaSchema),
    defaultValues: {
      name: area?.name ?? '',
      description: area?.description ?? '',
      kind: area?.kind ?? 'solicitante',
    },
  })

  return (
    <View style={styles.form}>
      <Controller
        control={control}
        name="kind"
        render={({ field: { onChange, value } }) => (
          <View style={styles.kindGroup}>
            <Text style={styles.kindLabel}>Tipo de área</Text>
            {(['solicitante', 'tecnica'] as const).map((kind) => (
              <Pressable
                key={kind}
                accessibilityRole="radio"
                accessibilityState={{ checked: value === kind }}
                onPress={() => onChange(kind)}
                style={[styles.kindOption, value === kind && styles.kindSelected]}
              >
                <Text style={styles.kindLabel}>
                  {kind === 'tecnica' ? 'Técnica' : 'Solicitante'}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      />
      <Controller
        control={control}
        name="name"
        render={({ field: { onBlur, onChange, value } }) => (
          <FormField
            autoCapitalize="words"
            error={errors.name?.message}
            label="Nombre del área"
            onBlur={onBlur}
            onChangeText={onChange}
            placeholder="Ej. Tecnología"
            returnKeyType="next"
            value={value}
          />
        )}
      />
      <Controller
        control={control}
        name="description"
        render={({ field: { onBlur, onChange, value } }) => (
          <FormField
            error={errors.description?.message}
            label="Descripción (opcional)"
            multiline
            onBlur={onBlur}
            onChangeText={onChange}
            placeholder="Indica qué solicitudes atiende esta área"
            style={styles.description}
            textAlignVertical="top"
            value={value}
          />
        )}
      />
      <Button
        label={area ? 'Guardar cambios' : 'Crear área'}
        loading={loading}
        onPress={handleSubmit(onSubmit)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  form: { gap: spacing.md },
  description: { minHeight: 90, paddingTop: spacing.md },
  kindGroup: { gap: spacing.sm },
  kindLabel: { ...typography.body, color: colors.text },
  kindOption: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  kindSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
})
