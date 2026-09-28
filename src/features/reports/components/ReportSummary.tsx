import { AppFeedback } from '@/components/feedback/AppFeedback'
import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import * as WebBrowser from 'expo-web-browser'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { Icon } from '@/components/ui/Icon'
import { ROLE_LABELS, type AppRole } from '@/features/auth/types'
import type { CaseRecord } from '@/features/cases/types'
import { PhotoGrid } from '@/features/photos/components/PhotoGrid'
import { useCasePhotos } from '@/features/photos/usePhotos'
import { colors, spacing, typography } from '@/theme/tokens'

import { generateReportPdf, shareReportPdf } from '../reportService'
import { photoRequirementLabel } from '../reportPresentation'
import { getReportRequirements } from '../schemas'
import { useReportDraft, useReportSignatures, useReportVersions } from '../useReports'

function verificationCode(hash: string) {
  return (
    hash
      .slice(0, 12)
      .toUpperCase()
      .match(/.{1,4}/g)
      ?.join('-') ?? ''
  )
}

export function ReportSummary({
  item,
  beforeEditable,
  afterEditable,
  userId,
  onOpen,
  onReview,
}: {
  item: CaseRecord
  beforeEditable: boolean
  afterEditable: boolean
  userId: string | undefined
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
  const afterCount = photos.data?.filter((photo) => photo.kind === 'despues').length ?? 0
  const missing = getReportRequirements(
    draft.data?.diagnosis ?? '',
    draft.data?.workDone ?? '',
    afterCount,
    item.minAfterPhotos,
  )
  const requirements = [
    {
      label: 'Diagnóstico de 10 caracteres o más',
      complete: !missing.some((entry) => entry.includes('diagnóstico')),
    },
    {
      label: 'Trabajo realizado de 10 caracteres o más',
      complete: !missing.some((entry) => entry.includes('trabajo realizado')),
    },
    {
      label: photoRequirementLabel(afterCount, item.minAfterPhotos),
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

  async function downloadPdf() {
    setPdfLoading(true)
    try {
      await WebBrowser.openBrowserAsync(await generateReportPdf(item.id))
    } catch (error) {
      AppFeedback.show(
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
      await shareReportPdf(item.id, item.caseNumber, current.versionNumber)
    } catch (error) {
      AppFeedback.show(
        'No fue posible compartir el PDF',
        error instanceof Error ? error.message : 'Inténtalo de nuevo.',
      )
    } finally {
      setShareLoading(false)
    }
  }

  return (
    <Card style={styles.panel}>
      <Text style={styles.heading}>Reporte</Text>
      <Chip
        label={state}
        tone={
          state === 'Devuelto'
            ? 'danger'
            : state === 'Aprobado'
              ? 'success'
              : state === 'Enviado' || state === 'Validado'
                ? 'info'
                : 'neutral'
        }
      />
      {returned && !current ? (
        <View style={styles.returnNotice}>
          <Text style={styles.text}>
            Devuelto por {returned.returnedByName ?? 'un usuario'} ·{' '}
            {returned.returnedAt ? new Date(returned.returnedAt).toLocaleString('es-GT') : ''}
          </Text>
          <Text style={styles.text}>{returned.returnReason}</Text>
        </View>
      ) : null}
      {!current ? (
        <View style={styles.requirements}>
          <Text style={styles.text}>Requisitos para enviar:</Text>
          {requirements.map((requirement) => (
            <View key={requirement.label} style={styles.requirementRow}>
              <Icon
                name={requirement.complete ? 'checkmark-circle' : 'ellipse-outline'}
                size="inline"
                color={requirement.complete ? colors.success : colors.textMuted}
              />
              <Text style={styles.muted}>{requirement.label}</Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.requirements}>
          {signatures.data
            ?.filter((entry) => entry.versionId === current.id)
            .map((entry) => (
              <Text key={entry.id} style={styles.text}>
                {entry.signerName} · {ROLE_LABELS[entry.signerRole as AppRole] ?? entry.signerRole}{' '}
                · {new Date(entry.signedAt).toLocaleString('es-GT')}
              </Text>
            ))}
          <Text style={styles.muted}>
            Código de verificación: {verificationCode(current.contentHash)}
          </Text>
        </View>
      )}
      <PhotoGrid caseId={item.id} kind="antes" editable={beforeEditable} userId={userId} />
      <PhotoGrid caseId={item.id} kind="despues" editable={afterEditable} userId={userId} />
      <View style={styles.actions}>
        <Button
          label={current ? 'Ver reporte' : 'Abrir reporte'}
          variant="secondary"
          onPress={current ? onReview : onOpen}
        />
        {item.status === 'aprobado' ? (
          <Button
            label={pdfLoading ? 'Generando PDF…' : 'Descargar PDF'}
            loading={pdfLoading}
            disabled={shareLoading}
            onPress={() => void downloadPdf()}
          />
        ) : null}
        {item.status === 'aprobado' && current ? (
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
    </Card>
  )
}

const styles = StyleSheet.create({
  panel: { gap: spacing.md },
  heading: { ...typography.heading, color: colors.text },
  returnNotice: { gap: spacing.xs, padding: spacing.sm, backgroundColor: colors.dangerBadge },
  requirements: { gap: spacing.xs },
  requirementRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  text: { ...typography.body, color: colors.text },
  muted: { ...typography.caption, color: colors.textMuted },
  actions: { gap: spacing.sm },
})
