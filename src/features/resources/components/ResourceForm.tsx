import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/forms/FormField'
import { colors, radius, spacing } from '@/theme/tokens'

import { resourceSchema } from '../schemas'
import {
  RESOURCE_KINDS,
  RESOURCE_KIND_LABELS,
  type ResourceInput,
  type ResourceRecord,
} from '../types'

interface Props {
  resource?: ResourceRecord
  loading: boolean
  onSubmit: (input: ResourceInput) => void
}

export function ResourceForm({ resource, loading, onSubmit }: Props) {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ResourceInput>({
    resolver: zodResolver(resourceSchema),
    defaultValues: {
      kind: resource?.kind ?? 'material',
      name: resource?.name ?? '',
      description: resource?.description ?? '',
      unit: resource?.unit ?? '',
      unitCost: resource?.unitCost == null ? '' : String(resource.unitCost),
    },
  })

  return (
    <View style={styles.form}>
      <Controller
        control={control}
        name="kind"
        render={({ field: { value, onChange } }) => (
          <View style={styles.field}>
            <Text style={styles.label}>Tipo de recurso</Text>
            <View style={styles.options}>
              {RESOURCE_KINDS.map((kind) => (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ checked: value === kind }}
                  key={kind}
                  onPress={() => onChange(kind)}
                  style={[styles.option, value === kind && styles.selected]}
                >
                  <Text style={styles.optionText}>{RESOURCE_KIND_LABELS[kind]}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      />
      <Controller
        control={control}
        name="name"
        render={({ field: { value, onChange, onBlur } }) => (
          <FormField
            label="Nombre"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.name?.message}
            placeholder="Ej. Cable eléctrico"
            maxLength={120}
            autoCapitalize="sentences"
          />
        )}
      />
      <Controller
        control={control}
        name="unit"
        render={({ field: { value, onChange, onBlur } }) => (
          <FormField
            label="Unidad (obligatoria para material)"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.unit?.message}
            placeholder="Ej. metro, pieza"
            maxLength={30}
          />
        )}
      />
      <Controller
        control={control}
        name="unitCost"
        render={({ field: { value, onChange, onBlur } }) => (
          <FormField
            label="Costo unitario (opcional)"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.unitCost?.message}
            keyboardType="decimal-pad"
            placeholder="0.00"
          />
        )}
      />
      <Controller
        control={control}
        name="description"
        render={({ field: { value, onChange, onBlur } }) => (
          <FormField
            label="Descripción (opcional)"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.description?.message}
            multiline
            textAlignVertical="top"
            maxLength={300}
            style={styles.description}
          />
        )}
      />
      <Button
        label={resource ? 'Guardar cambios' : 'Crear recurso'}
        loading={loading}
        onPress={handleSubmit(onSubmit)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  form: { gap: spacing.md },
  field: { gap: spacing.sm },
  label: { color: colors.text, fontWeight: '700' },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  option: {
    minHeight: 44,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
  },
  selected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  optionText: { color: colors.text, fontWeight: '700' },
  description: { minHeight: 80, paddingTop: spacing.md },
})
