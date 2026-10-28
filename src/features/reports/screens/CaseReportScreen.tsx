import { getErrorMessage } from '@/utils/errorMessage'
import { AppFeedback } from '@/components/feedback/AppFeedback'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Keyboard, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { FormField } from '@/components/forms/FormField'
import { KeyboardFormScrollView } from '@/components/layout/KeyboardFormScrollView'
import { RequestState } from '@/components/feedback/RequestState'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { Icon } from '@/components/ui/Icon'
import { useCaseActions, useCaseDetail } from '@/features/cases/useCases'
import { PhotoGrid } from '@/features/photos/components/PhotoGrid'
import { listPendingPhotos } from '@/features/photos/uploadQueue'
import { useCasePhotos } from '@/features/photos/usePhotos'
import { useCaseUsages } from '@/features/resources/useResources'
import type { MainStackParamList } from '@/navigation/types'
import { useAuthStore } from '@/store/authStore'
import { colors, spacing, tone, typography } from '@/theme/tokens'

import { reportDraftSchema, getReportRequirements } from '../schemas'
import { useReportDraft, useSaveReportDraft } from '../useReports'
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
  const caseActions = useCaseActions(caseId)
  const draft = useReportDraft(caseId)
  const photos = useCasePhotos(caseId)
  const usages = useCaseUsages(caseId)
  const saveMutation = useSaveReportDraft(caseId)
  const { mutateAsync: saveDraft } = saveMutation
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [keyboardOpen, setKeyboardOpen] = useState(false)
  const [footerHeight, setFooterHeight] = useState(0)
  const [fieldHeights, setFieldHeights] = useState<
    Partial<Record<(typeof fields)[number]['name'], number>>
  >({})
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
  const canEdit = caseActions.data?.editar_reporte?.allowed === true
  const canSubmit = caseActions.data?.enviar_reporte?.allowed === true

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'
    const show = Keyboard.addListener(showEvent, () => setKeyboardOpen(true))
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardOpen(false))
    return () => {
      show.remove()
      hide.remove()
    }
  }, [])

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
            setSaveError(getErrorMessage(error, 'No se guardó. Reintentar'))
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
              AppFeedback.show(
                'Fotos pendientes',
                'Hay fotos subiéndose. Se terminarán de subir en segundo plano mientras la app esté abierta.',
                { tone: 'info' },
              )
          })
      }),
    [navigation, canEdit, isDirty, persist, getValues, profile?.id, caseId],
  )

  if (detail.isLoading || draft.isLoading || caseActions.isPending)
    return <RequestState kind="loading" title="Cargando reporte…" />
  if (detail.error || !detail.data || draft.error || caseActions.error) {
    return (
      <RequestState
        kind="error"
        title="No fue posible cargar el reporte"
        onRetry={() => {
          void detail.refetch()
          void draft.refetch()
          void caseActions.refetch()
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
  const diagnosisReady = !requirements.some((message) => message.includes('diagnóstico'))
  const workReady = !requirements.some((message) => message.includes('trabajo realizado'))
  const hours = (usages.data ?? []).reduce((total, usage) => total + (usage.hours ?? 0), 0)

  async function review(input: ReportDraftInput) {
    if (!(await persist(input))) return
    navigation.navigate('ReportReview', { caseId })
  }

  function explainMissing() {
    AppFeedback.show(
      'Completa el reporte',
      saveError ?? (requirements.join('\n') || 'Revisa los campos marcados.'),
      { tone: 'warning' },
    )
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <KeyboardFormScrollView
        testID="report-scroll"
        contentContainerStyle={[styles.content, { paddingBottom: footerHeight + spacing.lg }]}
      >
        <View style={styles.headerRow}>
          <Text accessibilityRole="header" style={styles.title}>
            Reporte
          </Text>
          {canEdit &&
          ((!isDirty && (saved || draft.data)) || saveMutation.isPending || saveError) ? (
            <View style={styles.saveStatus}>
              {!isDirty && (saved || draft.data) && !saveMutation.isPending && !saveError ? (
                <Icon name="checkmark" color={tone.success.text} size="inline" />
              ) : null}
              <Text style={[styles.saveText, saveError && styles.saveError]}>
                {saveError ? 'No se guardó' : saveMutation.isPending ? 'Guardando…' : 'Guardado'}
              </Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.reportSubtitle} numberOfLines={1}>
          {item.caseNumber} · {item.title}
        </Text>
        {!canEdit ? (
          <Text style={styles.muted}>
            {item.status === 'asignado'
              ? 'Inicia el trabajo para escribir el reporte'
              : 'Este reporte está en solo lectura.'}
          </Text>
        ) : null}
        <View style={styles.requirementChips}>
          <Chip
            label="Diagnóstico"
            icon={diagnosisReady ? 'checkmark' : undefined}
            tone={diagnosisReady ? 'success' : 'neutral'}
            outlined={!diagnosisReady}
          />
          <Chip
            label="Trabajo"
            icon={workReady ? 'checkmark' : undefined}
            tone={workReady ? 'success' : 'neutral'}
            outlined={!workReady}
          />
          {item.minAfterPhotos > 0 ? (
            <Chip
              label={
                item.minAfterPhotos === 1
                  ? 'Foto de después'
                  : `${item.minAfterPhotos} fotos de después`
              }
              icon={afterCount >= item.minAfterPhotos ? 'checkmark' : undefined}
              tone={afterCount >= item.minAfterPhotos ? 'success' : 'neutral'}
              outlined={afterCount < item.minAfterPhotos}
            />
          ) : null}
        </View>
        <View style={styles.card}>
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
                    onContentSizeChange={(event) => {
                      const height = Math.max(
                        72,
                        Math.ceil(event.nativeEvent.contentSize.height) + 24,
                      )
                      setFieldHeights((current) =>
                        current[name] === height ? current : { ...current, [name]: height },
                      )
                    }}
                    style={[
                      styles.textarea,
                      fieldHeights[name] ? { height: fieldHeights[name] } : null,
                    ]}
                  />
                </View>
              )}
            />
          ))}
          {canEdit && saveError ? (
            <Button
              label="Reintentar guardado"
              variant="secondary"
              onPress={() => void persist(getValues())}
            />
          ) : null}
        </View>
        <View style={styles.card}>
          <PhotoGrid
            caseId={caseId}
            kind="antes"
            userId={profile?.id}
            editable={caseActions.data?.fotos_antes?.allowed === true}
          />
          <PhotoGrid
            caseId={caseId}
            kind="despues"
            userId={profile?.id}
            editable={caseActions.data?.fotos_despues?.allowed === true}
          />
        </View>
        <Pressable
          accessibilityLabel="Ver recursos y mano de obra"
          accessibilityRole="button"
          onPress={() => navigation.navigate('CaseResources', { caseId })}
          style={({ pressed }) => [styles.resourceRow, pressed && styles.resourcePressed]}
        >
          <View style={styles.resourceText}>
            <Text style={styles.sectionTitle}>Recursos y mano de obra</Text>
            <Text style={styles.muted}>
              {usages.data?.length ?? 0} registros · {hours} h
            </Text>
          </View>
          <Icon name="chevron-forward" color={colors.textMuted} />
        </Pressable>
      </KeyboardFormScrollView>
      {!keyboardOpen && canSubmit ? (
        <View
          style={styles.sticky}
          onLayout={(event) => setFooterHeight(event.nativeEvent.layout.height)}
        >
          <Button
            label="Revisar y firmar"
            accessibilityHint="Si falta algo, muestra lo pendiente para continuar"
            disabled={requirements.length > 0 || Boolean(saveError)}
            onDisabledPress={explainMissing}
            onPress={() => void handleSubmit((input) => void review(input), explainMissing)()}
          />
        </View>
      ) : !keyboardOpen && item.status === 'en_espera' ? (
        <Text style={styles.stickyHint}>Reanuda el trabajo para enviar el reporte.</Text>
      ) : null}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { gap: spacing.md, padding: spacing.lg },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: { ...typography.heading, color: colors.text },
  reportSubtitle: { ...typography.caption, color: colors.textMuted },
  saveStatus: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  saveText: { ...typography.body, color: colors.textMuted },
  saveError: { color: colors.error },
  requirementChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  sectionTitle: { ...typography.heading, color: colors.text },
  card: { gap: spacing.md },
  resourceRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
  },
  resourcePressed: { backgroundColor: colors.surfaceMuted },
  resourceText: { flex: 1, gap: spacing.xs },
  field: { gap: spacing.xs },
  textarea: { minHeight: 72 },
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
