import { Image } from 'expo-image'
import { StyleSheet, Text, View } from 'react-native'

import { Card } from '@/components/ui/Card'
import { ROLE_LABELS, type AppRole } from '@/features/auth/types'
import { colors, spacing, typography } from '@/theme/tokens'
import { usePhotoUrl } from '@/features/photos/usePhotos'

import {
  orderedReviewDates,
  reviewDateLabel,
  reviewHoursLabel,
  reviewPriorityLabel,
  reviewQuantityLabel,
  reviewResourceKindLabel,
} from '../reportPresentation'
import type { FrozenReportContent, ReportSignature } from '../types'

function FrozenPhoto({ path, label }: { path: string; label: string }) {
  const signed = usePhotoUrl(path)
  return signed.data ? (
    <Image
      accessibilityLabel={label}
      source={{ uri: signed.data, cacheKey: path }}
      cachePolicy="disk"
      style={styles.photo}
    />
  ) : (
    <Text style={styles.muted}>
      {signed.error ? 'No se pudo cargar la foto' : 'Cargando foto…'}
    </Text>
  )
}

function Row({ label, value }: { label: string; value: unknown }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.text}>{String(value)}</Text>
    </View>
  )
}

export function ReportContent({
  content,
  signatures = [],
}: {
  content: FrozenReportContent
  signatures?: ReportSignature[]
}) {
  const caseInfo = content.solicitud
  const report = content.reporte
  const beforePhotos = content.fotos.filter((photo) => photo.tipo === 'antes')
  const afterPhotos = content.fotos.filter((photo) => photo.tipo === 'despues')
  return (
    <View style={styles.container}>
      <Card contentStyle={styles.card}>
        <Text style={styles.heading}>Solicitud {caseInfo.numero}</Text>
        <Row label="Título" value={caseInfo.titulo} />
        <Row label="Descripción" value={caseInfo.descripcion} />
        <Row label="Tipo de servicio" value={caseInfo.tipo_servicio} />
        <Row label="Área solicitante" value={caseInfo.area_solicitante} />
        <Row label="Área técnica" value={caseInfo.area_destino} />
        <Row label="Ubicación" value={caseInfo.ubicacion} />
        <Row label="Prioridad" value={reviewPriorityLabel(caseInfo.prioridad)} />
        <Row label="Solicitante" value={caseInfo.creada_por} />
        <Row label="Técnico" value={caseInfo.tecnico} />
        {orderedReviewDates(content.fechas).map(([key, value]) => (
          <Row
            key={key}
            label={reviewDateLabel(key)}
            value={value ? new Date(value).toLocaleString('es-GT') : null}
          />
        ))}
      </Card>
      <Card contentStyle={styles.card}>
        <Text style={styles.heading}>Trabajo realizado</Text>
        <Row label="Diagnóstico" value={report.diagnostico} />
        <Row label="Trabajo realizado" value={report.trabajo_realizado} />
        <Row label="Causa" value={report.causa} />
        <Row label="Observaciones" value={report.observaciones} />
      </Card>
      <Card contentStyle={styles.card}>
        <Text style={styles.heading}>Recursos y mano de obra</Text>
        {content.recursos.length === 0 ? (
          <Text style={styles.muted}>Sin registros</Text>
        ) : (
          content.recursos.map((entry, index) => (
            <View key={index} style={styles.resource}>
              {index > 0 ? <View style={styles.separator} /> : null}
              <Text style={styles.text}>{String(entry.recurso ?? entry.tecnico ?? 'Recurso')}</Text>
              {reviewResourceKindLabel(entry.clase ?? entry.tipo) ? (
                <Text style={styles.muted}>
                  {reviewResourceKindLabel(entry.clase ?? entry.tipo)}
                </Text>
              ) : null}
              <View style={styles.metrics}>
                {reviewQuantityLabel(entry.cantidad, entry.unidad) ? (
                  <Text style={styles.metric}>
                    Cantidad: {reviewQuantityLabel(entry.cantidad, entry.unidad)}
                  </Text>
                ) : null}
                {reviewHoursLabel(entry.horas) ? (
                  <Text style={styles.metric}>Horas: {reviewHoursLabel(entry.horas)}</Text>
                ) : null}
              </View>
              <Row label="Notas" value={entry.notas} />
            </View>
          ))
        )}
      </Card>
      <Card contentStyle={styles.card}>
        <Text style={styles.heading}>Fotografías</Text>
        {content.fotos.length === 0 ? (
          <Text style={styles.muted}>Sin fotografías</Text>
        ) : (
          <>
            <Text style={styles.photoSubtitle}>Antes</Text>
            <View style={styles.photos}>
              {beforePhotos.length ? (
                beforePhotos.map((photo, index) => (
                  <FrozenPhoto
                    key={photo.id}
                    path={photo.miniatura}
                    label={`Foto antes ${index + 1} de ${beforePhotos.length}`}
                  />
                ))
              ) : (
                <Text style={styles.muted}>Sin fotos de antes</Text>
              )}
            </View>
            <Text style={styles.photoSubtitle}>Después</Text>
            <View style={styles.photos}>
              {afterPhotos.length ? (
                afterPhotos.map((photo, index) => (
                  <FrozenPhoto
                    key={photo.id}
                    path={photo.miniatura}
                    label={`Foto después ${index + 1} de ${afterPhotos.length}`}
                  />
                ))
              ) : (
                <Text style={styles.muted}>Sin fotos de después</Text>
              )}
            </View>
          </>
        )}
      </Card>
      {signatures.length > 0 ? (
        <Card contentStyle={styles.card}>
          <Text style={styles.heading}>Firmas registradas</Text>
          {signatures.map((signature) => (
            <Text key={signature.id} style={styles.text}>
              {signature.signerName} ·{' '}
              {ROLE_LABELS[signature.signerRole as AppRole] ?? signature.signerRole} ·{' '}
              {new Date(signature.signedAt).toLocaleString('es-GT')}
            </Text>
          ))}
        </Card>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  card: { gap: spacing.sm },
  heading: { ...typography.heading, color: colors.text },
  row: { gap: spacing.xs },
  label: { ...typography.caption, color: colors.textMuted },
  text: { ...typography.body, color: colors.text },
  muted: { ...typography.body, color: colors.textMuted },
  resource: { gap: spacing.xs, paddingVertical: spacing.xs },
  separator: { borderTopColor: colors.border, borderTopWidth: 1, marginVertical: spacing.sm },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  metric: { ...typography.body, color: colors.textMuted },
  photoSubtitle: { ...typography.body, color: colors.text },
  photos: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  photo: { width: 96, height: 96 },
})
