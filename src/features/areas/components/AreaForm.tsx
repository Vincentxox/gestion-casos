import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { StyleSheet, View } from 'react-native'

import { PrimaryButton } from '@/components/buttons/PrimaryButton'
import { FormField } from '@/components/forms/FormField'
import { spacing } from '@/theme/tokens'

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
    defaultValues: { name: area?.name ?? '', description: area?.description ?? '' },
  })

  return (
    <View style={styles.form}>
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
      <PrimaryButton
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
})
