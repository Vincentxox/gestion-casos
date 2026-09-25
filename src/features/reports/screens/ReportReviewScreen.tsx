import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import * as WebBrowser from 'expo-web-browser'
import { useState } from 'react'
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { RequestState } from '@/components/feedback/RequestState'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useCaseDetail } from '@/features/cases/useCases'
import { ROLE_LABELS } from '@/features/auth/types'
import { useCasePhotos } from '@/features/photos/usePhotos'
import { useCaseUsages } from '@/features/resources/useResources'
import type { MainStackParamList } from '@/navigation/types'
import { useAuthStore } from '@/store/authStore'
import { colors, spacing, typography } from '@/theme/tokens'

import { ReportContent } from '../components/ReportContent'
import { ReturnSheet } from '../components/ReturnSheet'
import { SignatureSheet } from '../components/SignatureSheet'
import { generateReportPdf, shareReportPdf, type SignatureAction } from '../reportService'
import { getReportActions } from '../reportPermissions'
import { getReportRequirements } from '../schemas'
import type { FrozenReportContent } from '../types'
import {
  useAreaChiefs,
  useReportDraft,
  useReportSignatures,
  useReportVersions,
  useReturnReport,
  useSignReport,
} from '../useReports'

type Props = NativeStackScreenProps<MainStackParamList, 'ReportReview'>

function previewContent(
  item: NonNullable<ReturnType<typeof useCaseDetail>['data']>,
  draft: NonNullable<ReturnType<typeof useReportDraft>['data']>,
  usages: NonNullable<ReturnType<typeof useCaseUsages>['data']>,
  photos: NonNullable<ReturnType<typeof useCasePhotos>['data']>,
): FrozenReportContent {
  return {
    version: 0,
    solicitud: {
      id: item.id,
      numero: item.caseNumber,
      titulo: item.title,
      descripcion: item.description,
      ubicacion: item.location,
      prioridad: item.priority,
      tipo_servicio: item.category,
      area_solicitante: item.requestingAreaName,
      area_destino: item.targetAreaName,
      creada_por: item.creatorName,
      tecnico: item.assigneeName,
    },
    fechas: {
      creada: item.createdAt,
      aceptada: item.acceptedAt ?? null,
      asignada: item.assignedAt ?? null,
      iniciada: item.startedAt ?? null,
      enviada: null,
    },
    reporte: {
      diagnostico: draft.diagnosis,
      trabajo_realizado: draft.workDone,
      causa: draft.cause || null,
      observaciones: draft.observations || null,
    },
    recursos: [...usages]
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
      .map((usage) => ({
        tipo: usage.kind,
        recurso: usage.resourceName,
        clase: usage.resourceKind,
        unidad: usage.unit,
        costo_unitario: usage.unitCost,
        cantidad: usage.quantity,
        horas: usage.hours,
        tecnico: usage.technicianName,
        notas: usage.notes,
      })),
    fotos: [...photos]
      .sort(
        (a, b) =>
          a.kind.localeCompare(b.kind) ||
          (a.confirmedAt ?? '').localeCompare(b.confirmedAt ?? '') ||
          a.id.localeCompare(b.id),
      )
      .map((photo) => ({
        id: photo.id,
        tipo: photo.kind,
        imagen: photo.imagePath,
        miniatura: photo.thumbPath,
      })),
  }
}

export function ReportReviewScreen({ navigation, route }: Props) {
  const { caseId } = route.params
  const profile = useAuthStore((state) => state.profile)
  const detail = useCaseDetail(caseId)
  const draft = useReportDraft(caseId)
  const usages = useCaseUsages(caseId)
  const photos = useCasePhotos(caseId)
  const versions = useReportVersions(caseId)
  const signatures = useReportSignatures(caseId)
  const chiefs = useAreaChiefs()
  const sign = useSignReport(caseId)
  const returnMutation = useReturnReport(caseId)
  const [signatureAction, setSignatureAction] = useState<SignatureAction | null>(null)
  const [returnVisible, setReturnVisible] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [shareLoading, setShareLoading] = useState(false)
  const [showPast, setShowPast] = useState(false)

  if (detail.isLoading || draft.isLoading || versions.isLoading || signatures.isLoading) {
    return <RequestState kind="loading" title="Cargando reporte…" />
  }
  if (!detail.data || detail.error || versions.error || signatures.error) {
    return (
      <RequestState
        kind="error"
        title="No fue posible cargar el reporte"
        onRetry={() => {
          void detail.refetch()
          void versions.refetch()
          void signatures.refetch()
        }}
      />
    )
  }

  const item = detail.data
  const actions = getReportActions(item, profile, chiefs.data ?? [])
  const current = versions.data?.find((version) => version.status === 'vigente')
  const isSubmitting = item.status === 'en_ejecucion' && actions.includes('submit')
  const missing = getReportRequirements(
    draft.data?.diagnosis ?? '',
    draft.data?.workDone ?? '',
    photos.data?.filter((photo) => photo.kind === 'despues').length ?? 0,
    item.minAfterPhotos,
  )
  const canPreview = Boolean(draft.data && usages.data && photos.data)
  const content =
    isSubmitting && canPreview && draft.data && usages.data && photos.data
      ? previewContent(item, draft.data, usages.data, photos.data)
      : current?.content
  const action: SignatureAction | null = isSubmitting
    ? 'submit'
    : actions.includes('validate')
      ? 'validate'
      : actions.includes('approve')
        ? 'approve'
        : null
  const actionLabel =
    action === 'submit'
      ? 'Firmar y enviar'
      : action === 'validate'
        ? 'Validar y firmar'
        : 'Aprobar y firmar'
  const title =
    signatureAction === 'submit'
      ? 'Firma de ejecución'
      : signatureAction === 'validate'
        ? 'Firma de validación técnica'
        : 'Firma de conformidad'

  async function downloadPdf() {
    setPdfLoading(true)
    try {
      const url = await generateReportPdf(caseId)
      await WebBrowser.openBrowserAsync(url)
    } catch (error) {
      Alert.alert(
        'No fue posible descargar el PDF',
        error instanceof Error ? error.message : 'Inténtalo de nuevo.',
      )
    } finally {
      setPdfLoading(false)
    }
  }

  async function sharePdf() {
    if (!current) return
    setShareLoading(true)
    try {
      await shareReportPdf(caseId, item.caseNumber, current.versionNumber)
    } catch (error) {
      Alert.alert(
        'No fue posible compartir el PDF',
        error instanceof Error ? error.message : 'Inténtalo de nuevo.',
      )
    } finally {
      setShareLoading(false)
    }
  }

  async function onSign(path: string) {
    if (!signatureAction) return
    await sign.mutateAsync({ action: signatureAction, stroke: path })
    setSignatureAction(null)
    Alert.alert(
      signatureAction === 'submit'
        ? 'Reporte enviado'
        : signatureAction === 'validate'
          ? 'Reporte validado'
          : 'Solicitud aprobada y cerrada',
    )
    navigation.popTo('CaseDetail', { caseId })
  }

  async function onReturn(reason: string) {
    await returnMutation.mutateAsync(reason)
    setReturnVisible(false)
    Alert.alert('Reporte devuelto')
    navigation.popTo('CaseDetail', { caseId })
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={styles.title}>
          Revisar reporte · {item.caseNumber}
        </Text>
        {action ? (
          <Card contentStyle={styles.notice}>
            <Text style={styles.text}>
              {action === 'submit'
                ? 'Al firmar, este contenido queda congelado y no se podrá editar.'
                : 'Tu firma confirma que revisaste esta versión.'}
            </Text>
          </Card>
        ) : null}
        {isSubmitting && !canPreview ? (
          <RequestState kind="loading" title="Preparando vista previa…" />
        ) : null}
        {content ? (
          <ReportContent
            content={content}
            signatures={
              current ? signatures.data?.filter((entry) => entry.versionId === current.id) : []
            }
          />
        ) : null}
        {!content && !isSubmitting ? (
          <RequestState kind="empty" title="No hay una versión vigente del reporte" />
        ) : null}
        {(versions.data?.filter((version) => version.status === 'devuelta').length ?? 0) > 0 ? (
          <Card contentStyle={styles.notice}>
            <Button
              label={`${showPast ? 'Ocultar' : 'Ver'} versiones devueltas`}
              variant="secondary"
              onPress={() => setShowPast(!showPast)}
            />
            {showPast
              ? versions.data
                  ?.filter((version) => version.status === 'devuelta')
                  .map((version) => (
                    <View key={version.id} style={styles.past}>
                      <Text style={styles.text}>
                        Versión {version.versionNumber} · {version.returnedByName ?? 'Sin nombre'} ·{' '}
                        {version.returnedAt
                          ? new Date(version.returnedAt).toLocaleString('es-GT')
                          : ''}
                      </Text>
                      <Text style={styles.muted}>{version.returnReason}</Text>
                      <ReportContent
                        content={version.content}
                        signatures={signatures.data?.filter(
                          (entry) => entry.versionId === version.id,
                        )}
                      />
                    </View>
                  ))
              : null}
          </Card>
        ) : null}
      </ScrollView>
      {action && content ? (
        <View style={styles.sticky}>
          {missing.length > 0 && action === 'submit'
            ? missing.map((message) => (
                <Text key={message} style={styles.muted}>
                  {message}
                </Text>
              ))
            : null}
          <Button
            label={actionLabel}
            disabled={action === 'submit' && missing.length > 0}
            onPress={() => setSignatureAction(action)}
          />
          {actions.includes('return') ? (
            <Button label="Devolver" variant="danger" onPress={() => setReturnVisible(true)} />
          ) : null}
        </View>
      ) : item.status === 'aprobado' ? (
        <View style={styles.sticky}>
          <Button
            label={pdfLoading ? 'Generando PDF…' : 'Descargar PDF'}
            icon="download-outline"
            loading={pdfLoading}
            disabled={shareLoading}
            onPress={() => void downloadPdf()}
          />
          {current ? (
            <>
              <Button
                label={shareLoading ? 'Preparando PDF…' : 'Compartir PDF'}
                icon="share-social-outline"
                variant="secondary"
                loading={shareLoading}
                disabled={pdfLoading}
                onPress={() => void sharePdf()}
              />
              {shareLoading ? <Text style={styles.muted}>Preparando PDF…</Text> : null}
            </>
          ) : null}
        </View>
      ) : null}
      <SignatureSheet
        key={signatureAction ?? 'closed'}
        visible={Boolean(signatureAction)}
        title={title}
        name={profile?.fullName || 'Usuario'}
        role={profile?.role ? ROLE_LABELS[profile.role] : ''}
        loading={sign.isPending}
        onClose={() => setSignatureAction(null)}
        onSign={onSign}
      />
      <ReturnSheet
        visible={returnVisible}
        loading={returnMutation.isPending}
        label={action === 'validate' ? 'Devolver al técnico' : 'Devolver'}
        onClose={() => setReturnVisible(false)}
        onReturn={onReturn}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { gap: spacing.md, padding: spacing.lg, paddingBottom: spacing.xl },
  title: { ...typography.title, color: colors.text },
  notice: { gap: spacing.sm },
  text: { ...typography.body, color: colors.text },
  muted: { ...typography.body, color: colors.textMuted },
  past: { gap: spacing.sm, paddingTop: spacing.md },
  sticky: {
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
})
