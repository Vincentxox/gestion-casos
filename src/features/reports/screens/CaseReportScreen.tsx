import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { FormField } from '@/components/forms/FormField'
import { KeyboardFormScrollView } from '@/components/layout/KeyboardFormScrollView'
import { RequestState } from '@/components/feedback/RequestState'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useCaseDetail } from '@/features/cases/useCases'
import { PhotoGrid } from '@/features/photos/components/PhotoGrid'
import { listPendingPhotos } from '@/features/photos/uploadQueue'
import { useCasePhotos } from '@/features/photos/usePhotos'
import { useCaseUsages } from '@/features/resources/useResources'
import type { MainStackParamList } from '@/navigation/types'
import { useAuthStore } from '@/store/authStore'
import { colors, spacing, typography } from '@/theme/tokens'

import { reportDraftSchema, getReportRequirements } from '../schemas'
import { useAreaChiefs, useReportDraft, useSaveReportDraft } from '../useReports'
import { getReportActions } from '../reportPermissions'
import type { ReportDraftInput } from '../types'

type Props = NativeStackScreenProps<MainStackParamList, 'CaseReport'>

const fields = [
  { name: 'diagnosis', label: 'Diagnóstico', maxLength: 2000 },
  { name: 'workDone', label: 'Trabajo realizado', maxLength: 4000 },
  { name: 'cause', label: 'Causa (opcional)', maxLength: 1000 },
  { name: 'observations', label: 'Observaciones (opcional)', maxLength: 2000 },
] as const

export function CaseReportScreen({ navigation, route }: Props) {
  const { caseId } = route.params
  const profile = useAuthStore((state) => state.profile)
  const detail = useCaseDetail(caseId)
  const draft = useReportDraft(caseId)
  const photos = useCasePhotos(caseId)
  const usages = useCaseUsages(caseId)
  const chiefs = useAreaChiefs()
  const saveMutation = useSaveReportDraft(caseId)
  const { mutateAsync: saveDraft } = saveMutation
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const saving = useRef<Promise<boolean>>(Promise.resolve(true))
  const initialized = useRef(false)
  const {
    control,
    reset,
    getValues,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<ReportDraftInput>({
    resolver: zodResolver(reportDraftSchema),
    defaultValues: { diagnosis: '', workDone: '', cause: '', observations: '' },
  })
  const values = useWatch({ control })
  const actions = detail.data ? getReportActions(detail.data, profile, chiefs.data ?? []) : []
  const canEdit = actions.includes('edit')
  const canSubmit = actions.includes('submit')

  useEffect(() => {
    if (!draft.isFetched || initialized.current) return
    initialized.current = true
    if (draft.data) {
      reset({
        diagnosis: draft.data.diagnosis,
        workDone: draft.data.workDone,
        cause: draft.data.cause,
        observations: draft.data.observations,
      })
    }
  }, [draft.isFetched, draft.data, reset])

  const persist = useCallback(
    (input: ReportDraftInput) => {
      setSaved(false)
      saving.current = saving.current
        .catch(() => false)
        .then(async () => {
          try {
            await saveDraft(input)
            setSaveError(null)
            setSaved(true)
            if (JSON.stringify(getValues()) === JSON.stringify(input)) reset(input)
            return true
          } catch (error) {
            setSaveError(error instanceof Error ? error.message : 'No se guardó. Reintentar')
            return false
          }
        })
      return saving.current
    },
    [saveDraft, getValues, reset],
  )

  useEffect(() => {
    if (!canEdit || !initialized.current || !isDirty) return
    const timer = setTimeout(() => void persist(getValues()), 1500)
    return () => clearTimeout(timer)
  }, [canEdit, values, isDirty, getValues, persist])

  useEffect(
    () =>
      navigation.addListener('beforeRemove', () => {
        if (canEdit && isDirty) void persist(getValues())
        if (profile?.id)
          void listPendingPhotos(profile.id, caseId).then((entries) => {
            if (entries.length > 0)
              Alert.alert(
                'Fotos pendientes',
                'Hay fotos subiéndose. Se terminarán de subir en segundo plano mientras la app esté abierta.',
              )
          })
      }),
    [navigation, canEdit, isDirty, persist, getValues, profile?.id, caseId],
  )

  if (detail.isLoading || draft.isLoading)
    return <RequestState kind="loading" title="Cargando reporte…" />
  if (detail.error || !detail.data || draft.error) {
    return (
      <RequestState
        kind="error"
        title="No fue posible cargar el reporte"
        onRetry={() => {
          void detail.refetch()
          void draft.refetch()
        }}
      />
    )
  }

  const item = detail.data
  const afterCount = (photos.data ?? []).filter((photo) => photo.kind === 'despues').length
  const requirements = getReportRequirements(
    values.diagnosis ?? '',
    values.workDone ?? '',
    afterCount,
    item.minAfterPhotos,
  )
  const hours = (usages.data ?? []).reduce((total, usage) => total + (usage.hours ?? 0), 0)

  async function review(input: ReportDraftInput) {
    if (!(await persist(input))) return
    navigation.navigate('ReportReview', { caseId })
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <KeyboardFormScrollView contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={styles.title}>
          Reporte · {item.caseNumber}
        </Text>
        {!canEdit ? (
          <Text style={styles.muted}>
            {item.status === 'asignado'
              ? 'Inicia el trabajo para escribir el reporte'
              : 'Este reporte está en solo lectura.'}
          </Text>
        ) : null}
        <Card contentStyle={styles.card}>
          {fields.map(({ name, label, maxLength }) => (
            <Controller
              key={name}
              control={control}
              name={name}
              render={({ field: { value, onChange, onBlur } }) => (
                <View style={styles.field}>
                  <FormField
                    label={label}
                    value={value}
                    onChangeText={onChange}
                    onBlur={() => {
                      onBlur()
                      if (canEdit && isDirty) void persist(getValues())
                    }}
                    error={errors[name]?.message}
                    editable={canEdit}
                    multiline
                    maxLength={maxLength}
                    textAlignVertical="top"
                    style={styles.textarea}
                  />
                  <Text style={styles.counter}>
                    {value.length} / {maxLength}
                  </Text>
                </View>
              )}
            />
          ))}
          {canEdit ? (
            <Text style={styles.muted}>
              {saveMutation.isPending
                ? 'Guardando…'
                : saveError
                  ? 'No se guardó. Reintentar'
                  : saved
                    ? 'Guardado'
                    : 'Los cambios se guardan automáticamente'}
            </Text>
          ) : null}
          {canEdit && saveError ? (
            <Button
              label="Reintentar guardado"
              variant="secondary"
              onPress={() => void persist(getValues())}
            />
          ) : null}
        </Card>
        <Card contentStyle={styles.card}>
          <PhotoGrid
            caseId={caseId}
            kind="antes"
            userId={profile?.id}
            editable={actions.includes('photos_before')}
          />
          <PhotoGrid caseId={caseId} kind="despues" userId={profile?.id} editable={canEdit} />
        </Card>
        <Card contentStyle={styles.card}>
          <Text style={styles.sectionTitle}>Recursos y mano de obra</Text>
          <Text style={styles.muted}>
            {usages.data?.length ?? 0} registros · {hours} horas
          </Text>
          <Button
            label="Ver recursos utilizados"
            variant="secondary"
            icon="cube-outline"
            onPress={() => navigation.navigate('CaseResources', { caseId })}
          />
        </Card>
      </KeyboardFormScrollView>
      {canSubmit ? (
        <View style={styles.sticky}>
          {requirements.map((missing) => (
            <Text key={missing} style={styles.muted}>
              {missing}
            </Text>
          ))}
          <Button
            label="Revisar y firmar"
            disabled={requirements.length > 0 || Boolean(saveError)}
            onPress={() =>
              void handleSubmit(
                (input) => void review(input),
                () => Alert.alert('Revisa el formulario'),
              )()
            }
          />
        </View>
      ) : item.status === 'en_espera' ? (
        <Text style={styles.stickyHint}>Reanuda el trabajo para enviar el reporte.</Text>
      ) : null}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { gap: spacing.md, padding: spacing.lg, paddingBottom: spacing.xl },
  title: { ...typography.title, color: colors.text },
  sectionTitle: { ...typography.heading, color: colors.text },
  card: { gap: spacing.md },
  field: { gap: spacing.xs },
  textarea: { minHeight: 96 },
  counter: { ...typography.caption, color: colors.textMuted, textAlign: 'right' },
  muted: { ...typography.body, color: colors.textMuted },
  sticky: {
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
  },
  stickyHint: { ...typography.body, color: colors.textMuted, padding: spacing.md },
})
