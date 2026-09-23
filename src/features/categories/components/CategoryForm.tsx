import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/forms/FormField'
import type { AreaRecord } from '@/features/areas/types'
import { colors, spacing } from '@/theme/tokens'

import { categorySchema } from '../schemas'
import type { CategoryInput, CategoryRecord } from '../types'

interface Props {
  areas: AreaRecord[]
  category?: CategoryRecord
  loading: boolean
  onSubmit: (input: CategoryInput) => void
}

export function CategoryForm({ areas, category, loading, onSubmit }: Props) {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CategoryInput>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      areaId: category?.areaId ?? '',
      name: category?.name ?? '',
      description: category?.description ?? '',
    },
  })

  return (
    <View style={styles.form}>
      <Controller
        control={control}
        name="areaId"
        render={({ field: { onChange, value } }) => (
          <View style={styles.field}>
            <Text style={styles.label}>Área responsable</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.areaOptions}
            >
              {areas
                .filter((area) => area.kind === 'tecnica' && (area.isActive || area.id === value))
                .map((area) => (
                  <Pressable
                    key={area.id}
                    onPress={() => onChange(area.id)}
                    style={[styles.areaOption, value === area.id ? styles.areaOptionActive : null]}
                  >
                    <Text
                      style={[
                        styles.areaOptionText,
                        value === area.id ? styles.areaOptionTextActive : null,
                      ]}
                    >
                      {area.name}
                    </Text>
                  </Pressable>
                ))}
            </ScrollView>
            {errors.areaId?.message ? (
              <Text style={styles.error}>{errors.areaId.message}</Text>
            ) : null}
          </View>
        )}
      />
      <Controller
        control={control}
        name="name"
        render={({ field: { onBlur, onChange, value } }) => (
          <FormField
            autoCapitalize="sentences"
            error={errors.name?.message}
            label="Nombre del tipo de servicio"
            onBlur={onBlur}
            onChangeText={onChange}
            placeholder="Ej. Falla de equipo"
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
            placeholder="Indica qué tipo de casos agrupa"
            style={styles.description}
            textAlignVertical="top"
            value={value}
          />
        )}
      />
      <Button
        label={category ? 'Guardar cambios' : 'Crear tipo de servicio'}
        loading={loading}
        onPress={handleSubmit(onSubmit)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  form: { gap: spacing.md },
  field: { gap: spacing.xs },
  label: { color: colors.text, fontSize: 14, fontWeight: '600' },
  areaOptions: { gap: spacing.sm, paddingVertical: spacing.xs },
  areaOption: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    backgroundColor: colors.surface,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  areaOptionActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  areaOptionText: { color: colors.textMuted, fontSize: 13, fontWeight: '700' },
  areaOptionTextActive: { color: colors.primary },
  error: { color: colors.error, fontSize: 12 },
  description: { minHeight: 80, paddingTop: spacing.md },
})
