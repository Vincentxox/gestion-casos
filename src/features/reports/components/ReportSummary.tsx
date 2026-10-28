import { getErrorMessage } from '@/utils/errorMessage'
import { AppFeedback } from '@/components/feedback/AppFeedback'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import * as WebBrowser from 'expo-web-browser'

import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import type { CaseRecord } from '@/features/cases/types'
import { useCasePhotos } from '@/features/photos/usePhotos'
import { formatMoment } from '@/theme/formatters'
import { colors, fonts, radius, spacing, tone, typography } from '@/theme/tokens'

import { generateReportPdf, shareReportPdf } from '../reportService'
import { reportSignatureSteps, reportVerificationCode } from '../reportPresentation'
import { getReportRequirements } from '../schemas'
import { useReportDraft, useReportSignatures, useReportVersions } from '../useReports'

export function ReportSummary({
  item,
  onOpen,
  onReview,
}: {
  item: CaseRecord
  onOpen: () => void
  onReview: () => void
}) {
  const draft = useReportDraft(item.id)
  const versions = useReportVersions(item.id)
  const signatures = useReportSignatures(item.id)
  const photos = useCasePhotos(item.id)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [shareLoading, setShareLoading] = useState(false)
  const current = versions.data?.find((version) => version.status === 'vigente')
  const returned = versions.data?.find((version) => version.status === 'devuelta')
  const beforeCount = photos.data?.filter((photo) => photo.kind === 'antes').length ?? 0
  const afterCount = photos.data?.filter((photo) => photo.kind === 'despues').length ?? 0
  const missing = getReportRequirements(
    draft.data?.diagnosis ?? '',
    draft.data?.workDone ?? '',
    afterCount,
    item.minAfterPhotos,
  )
  const requirements = [
    {
      label: 'Diagnóstico',
      complete: !missing.some((entry) => entry.includes('diagnóstico')),
    },
    {
      label: 'Trabajo realizado',
      complete: !missing.some((entry) => entry.includes('trabajo realizado')),
    },
    {
      label: 'Foto de después',
      complete: afterCount >= item.minAfterPhotos,
    },
  ]
  const state =
    item.status === 'aprobado'
      ? 'Aprobado'
      : item.status === 'validado'
        ? 'Validado'
        : item.status === 'reporte_enviado'
          ? 'Enviado'
          : returned
            ? 'Devuelto'
            : draft.data
              ? 'Borrador'
              : 'Sin empezar'
  const signatureSteps = current
    ? reportSignatureSteps(
        signatures.data?.filter((entry) => entry.versionId === current.id) ?? [],
        null,
      )
    : []
  const summaryItems = current
    ? signatureSteps.map((step) => ({ label: step.label, complete: Boolean(step.signature) }))
    : requirements
  const readyCount = summaryItems.filter((entry) => entry.complete).length
  const completedWork = requirements[0]!.complete && requirements[1]!.complete
  const progressRows = current
    ? summaryItems.filter((entry) => entry.complete).map((entry) => entry.label)
    : [
        ...(completedWork
          ? ['Diagnóstico y trabajo realizado']
          : requirements
              .slice(0, 2)
              .filter((entry) => entry.complete)
              .map((entry) => entry.label)),
        ...(beforeCount + afterCount > 0
          ? [`Fotos: ${beforeCount} de antes, ${afterCount} de después`]
          : []),
      ]

  async function downloadPdf() {
    setPdfLoading(true)
    try {
      await WebBrowser.openBrowserAsync(await generateReportPdf(item.id))
    } catch (error) {
      AppFeedback.show(
        'No fue posible descargar el PDF',
        getErrorMessage(error, 'Inténtalo de nuevo.'),
        { tone: 'error' },
      )
    } finally {
      setPdfLoading(false)
    }
  }

  async function sharePdf() {
    if (!current) return
    setShareLoading(true)
    try {
      await shareReportPdf(item.id, item.caseNumber, current.versionNumber)
    } catch (error) {
      AppFeedback.show(
        'No fue posible compartir el PDF',
        getErrorMessage(error, 'Inténtalo de nuevo.'),
        { tone: 'error' },
      )
    } finally {
      setShareLoading(false)
    }
  }

  return (
    <View style={styles.panel}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Reporte ${state}, ${readyCount} de ${summaryItems.length} listos`}
        onPress={current ? onReview : onOpen}
        style={({ pressed }) => [styles.summary, pressed && styles.pressed]}
      >
        <View style={styles.headingRow}>
          <Text style={styles.heading}>Reporte · {state.toLowerCase()}</Text>
          <Text style={styles.ready}>
            {readyCount} de {summaryItems.length} listos
          </Text>
          <Icon name="chevron-forward" color={colors.textMuted} size="inline" />
        </View>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${(readyCount / Math.max(summaryItems.length, 1)) * 100}%` },
            ]}
          />
        </View>
        {progressRows.map((label) => (
          <View key={label} style={styles.requirementRow}>
            <Icon name="checkmark" size="inline" color={tone.success.text} />
            <Text style={styles.text}>{label}</Text>
          </View>
        ))}
      </Pressable>
      {returned && !current ? (
        <View style={styles.returnNotice}>
          <Text style={styles.text}>
            Devuelto por {returned.returnedByName ?? 'un usuario'} ·{' '}
            {returned.returnedAt ? formatMoment(returned.returnedAt) : ''}
          </Text>
          <Text style={styles.text}>{returned.returnReason}</Text>
        </View>
      ) : null}
      {current ? (
        <Text style={styles.muted}>
          Código de verificación: {reportVerificationCode(current.contentHash)}
        </Text>
      ) : null}
      {item.status === 'aprobado' ? (
        <View style={styles.actions}>
          <Button
            label={pdfLoading ? 'Generando PDF…' : 'Descargar PDF'}
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
                showLabelWhileLoading
                disabled={pdfLoading}
                onPress={() => void sharePdf()}
              />
            </>
          ) : null}
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  panel: { gap: spacing.md },
  summary: {
    gap: spacing.base,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  pressed: { backgroundColor: colors.surfaceMuted },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  heading: { ...typography.heading, color: colors.text },
  ready: {
    ...typography.caption,
    fontFamily: fonts.semibold,
    color: tone.success.text,
    marginLeft: 'auto',
  },
  progressTrack: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.track,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: radius.pill, backgroundColor: tone.success.text },
  returnNotice: { gap: spacing.xs, padding: spacing.sm, backgroundColor: tone.danger.bg },
  requirementRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  text: { ...typography.body, color: colors.text },
  muted: { ...typography.caption, color: colors.textMuted },
  actions: { gap: spacing.sm },
})
