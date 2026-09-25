import { Image } from 'expo-image'
import { StyleSheet, Text, View } from 'react-native'

import { Card } from '@/components/ui/Card'
import { ROLE_LABELS, type AppRole } from '@/features/auth/types'
import { colors, spacing, typography } from '@/theme/tokens'
import { usePhotoUrl } from '@/features/photos/usePhotos'

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
        <Row label="Prioridad" value={caseInfo.prioridad} />
        <Row label="Solicitante" value={caseInfo.creada_por} />
        <Row label="Técnico" value={caseInfo.tecnico} />
        {Object.entries(content.fechas).map(([key, value]) => (
          <Row
            key={key}
            label={key.replaceAll('_', ' ')}
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
              <Row label="Recurso" value={entry.recurso ?? entry.tecnico ?? entry.tipo} />
              <Row label="Cantidad" value={entry.cantidad} />
              <Row label="Horas" value={entry.horas} />
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
          <View style={styles.photos}>
            {content.fotos.map((photo, index) => (
              <FrozenPhoto
                key={photo.id}
                path={photo.miniatura}
                label={`Foto ${photo.tipo} ${index + 1}`}
              />
            ))}
          </View>
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
  label: { ...typography.caption, color: colors.textMuted, textTransform: 'capitalize' },
  text: { ...typography.body, color: colors.text },
  muted: { ...typography.body, color: colors.textMuted },
  resource: { paddingVertical: spacing.xs, borderBottomColor: colors.border, borderBottomWidth: 1 },
  photos: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  photo: { width: 96, height: 96 },
})
