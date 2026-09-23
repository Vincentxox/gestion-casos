import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/forms/FormField'
import type { AssignableProfile } from '@/features/cases/types'
import { colors, radius, spacing } from '@/theme/tokens'

import { usageSchema } from '../schemas'
import {
  RESOURCE_KIND_LABELS,
  type CaseUsageRecord,
  type ResourceRecord,
  type UsageInput,
} from '../types'

interface Props {
  resources: ResourceRecord[]
  technicians: AssignableProfile[]
  usage?: CaseUsageRecord
  loading: boolean
  onSubmit: (input: UsageInput) => void
}

export function UsageForm({ resources, technicians, usage, loading, onSubmit }: Props) {
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<UsageInput>({
    resolver: zodResolver(usageSchema),
    defaultValues: {
      kind: usage?.kind ?? 'recurso',
      resourceId: usage?.resourceId ?? '',
      resourceKind: usage?.resourceKind ?? null,
      technicianId: usage?.technicianId ?? '',
      quantity: usage?.quantity == null ? '' : String(usage.quantity),
      hours: usage?.hours == null ? '' : String(usage.hours),
      notes: usage?.notes ?? '',
    },
  })
  const kind = useWatch({ control, name: 'kind' })
  const resourceId = useWatch({ control, name: 'resourceId' })
  const resourceKind = useWatch({ control, name: 'resourceKind' })
  const technicianId = useWatch({ control, name: 'technicianId' })

  return (
    <View style={styles.form}>
      {usage ? (
        <Text style={styles.info}>Solo puedes corregir cantidad, horas y notas.</Text>
      ) : (
        <View style={styles.field}>
          <Text style={styles.label}>Registro</Text>
          <View style={styles.options}>
            {(['recurso', 'mano_de_obra'] as const).map((option) => (
              <Pressable
                key={option}
                accessibilityRole="radio"
                accessibilityState={{ checked: kind === option }}
                onPress={() => {
                  setValue('kind', option)
                  setValue('resourceId', '')
                  setValue('resourceKind', null)
                  setValue('technicianId', '')
                  setValue('quantity', '')
                  setValue('hours', '')
                }}
                style={[styles.option, kind === option && styles.selected]}
              >
                <Text style={styles.optionText}>
                  {option === 'recurso' ? 'Recurso' : 'Mano de obra'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {kind === 'recurso' ? (
        <View style={styles.field}>
          <Text style={styles.label}>Recurso</Text>
          {usage ? (
            <Text style={styles.info}>
              {usage.resourceName} ·{' '}
              {usage.resourceKind ? RESOURCE_KIND_LABELS[usage.resourceKind] : 'Recurso'}
            </Text>
          ) : (
            resources
              .filter((resource) => resource.isActive)
              .map((resource) => (
                <Pressable
                  key={resource.id}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: resourceId === resource.id }}
                  onPress={() => {
                    setValue('resourceId', resource.id, { shouldValidate: true })
                    setValue('resourceKind', resource.kind)
                    setValue('quantity', '')
                    setValue('hours', '')
                  }}
                  style={[styles.option, resourceId === resource.id && styles.selected]}
                >
                  <Text style={styles.optionText}>
                    {resource.name} · {RESOURCE_KIND_LABELS[resource.kind]}
                    {resource.unit ? ` · ${resource.unit}` : ''}
                  </Text>
                </Pressable>
              ))
          )}
          {!usage && resources.filter((resource) => resource.isActive).length === 0 ? (
            <Text style={styles.info}>
              No hay recursos activos. Pide al administrador que agregue uno.
            </Text>
          ) : null}
          {errors.resourceId ? <Text style={styles.error}>{errors.resourceId.message}</Text> : null}
        </View>
      ) : (
        <View style={styles.field}>
          <Text style={styles.label}>Técnico</Text>
          {usage ? (
            <Text style={styles.info}>{usage.technicianName || 'Técnico no disponible'}</Text>
          ) : (
            technicians.map((person) => (
              <Pressable
                key={person.id}
                accessibilityRole="radio"
                accessibilityState={{ checked: technicianId === person.id }}
                onPress={() => setValue('technicianId', person.id, { shouldValidate: true })}
                style={[styles.option, technicianId === person.id && styles.selected]}
              >
                <Text style={styles.optionText}>{person.fullName}</Text>
              </Pressable>
            ))
          )}
          {errors.technicianId ? (
            <Text style={styles.error}>{errors.technicianId.message}</Text>
          ) : null}
        </View>
      )}

      {kind === 'recurso' && resourceKind === 'material' ? (
        <Controller
          control={control}
          name="quantity"
          render={({ field: { value, onChange, onBlur } }) => (
            <FormField
              label="Cantidad utilizada"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.quantity?.message}
              keyboardType="decimal-pad"
              placeholder="Ej. 2.5"
            />
          )}
        />
      ) : null}
      {kind === 'mano_de_obra' ||
      (kind === 'recurso' && resourceKind !== 'material' && resourceId) ? (
        <Controller
          control={control}
          name="hours"
          render={({ field: { value, onChange, onBlur } }) => (
            <FormField
              label={kind === 'mano_de_obra' ? 'Horas trabajadas' : 'Horas de uso (opcional)'}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.hours?.message}
              keyboardType="decimal-pad"
              placeholder="Ej. 1.5"
            />
          )}
        />
      ) : null}
      <Controller
        control={control}
        name="notes"
        render={({ field: { value, onChange, onBlur } }) => (
          <FormField
            label="Notas (opcional)"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.notes?.message}
            maxLength={300}
            multiline
            textAlignVertical="top"
            style={styles.notes}
          />
        )}
      />
      <Button
        label={usage ? 'Guardar corrección' : 'Registrar uso'}
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
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  selected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  optionText: { color: colors.text, fontWeight: '700' },
  error: { color: colors.error, fontSize: 12 },
  info: { color: colors.textMuted, lineHeight: 21 },
  notes: { minHeight: 80, paddingTop: spacing.md },
})
