import { Image } from 'expo-image'
import { useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import Svg, { Path } from 'react-native-svg'

import { StatusBadge } from '@/components/badges/StatusBadge'
import { PriorityBadge } from '@/components/badges/PriorityBadge'
import { Card } from '@/components/ui/Card'
import { Icon, type IconName } from '@/components/ui/Icon'
import { ROLE_LABELS, type AppRole } from '@/features/auth/types'
import type { CasePriority, CaseStatus } from '@/features/cases/types'
import { usePhotoUrl } from '@/features/photos/usePhotos'
import { colors, phaseColors, radius, spacing, typography } from '@/theme/tokens'

import {
  orderedReviewDates,
  reportElapsedLabel,
  reportSignatureSteps,
  reportVerificationCode,
  reviewDateLabel,
  reviewHoursLabel,
  reviewQuantityLabel,
  reviewResourceKindLabel,
} from '../reportPresentation'
import { signatureViewBox } from '../signaturePath'
import type { FrozenReportContent, ReportSignature } from '../types'

function FrozenPhoto({
  photo,
  label,
}: {
  photo: FrozenReportContent['fotos'][number]
  label: string
}) {
  const [open, setOpen] = useState(false)
  const thumb = usePhotoUrl(photo.miniatura)
  const original = usePhotoUrl(open ? photo.imagen : undefined)
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Ampliar ${label.toLowerCase()}`}
        onPress={() => setOpen(true)}
        style={styles.photoButton}
      >
        {thumb.data ? (
          <Image
            accessibilityLabel={label}
            source={{ uri: thumb.data, cacheKey: photo.miniatura }}
            cachePolicy="disk"
            style={styles.photo}
          />
        ) : (
          <Text style={styles.muted}>
            {thumb.error ? 'No se pudo cargar la foto' : 'Cargando foto…'}
          </Text>
        )}
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          {original.data ? (
            <Image
              source={{ uri: original.data, cacheKey: photo.imagen }}
              style={styles.largePhoto}
              contentFit="contain"
            />
          ) : (
            <Text style={styles.overlayText}>
              {original.error ? 'No se pudo cargar la foto' : 'Cargando foto…'}
            </Text>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cerrar fotografía"
            onPress={() => setOpen(false)}
            style={styles.closePhoto}
          >
            <Text style={styles.overlayText}>Cerrar</Text>
          </Pressable>
        </View>
      </Modal>
    </>
  )
}

function Info({ label, value, wide = false }: { label: string; value: unknown; wide?: boolean }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <View style={[styles.info, wide && styles.wide]}>
      <Text style={styles.overline}>{label}</Text>
      <Text style={styles.text}>{String(value)}</Text>
    </View>
  )
}

function PeopleInfo({
  label,
  area,
  person,
}: {
  label: string
  area: string
  person: string | null
}) {
  return (
    <View style={styles.info}>
      <Text style={styles.overline}>{label}</Text>
      <Text style={styles.text}>{area}</Text>
      {person ? <Text style={styles.muted}>{person}</Text> : null}
    </View>
  )
}

function Work({ label, value }: { label: string; value: string | null }) {
  return value ? (
    <View style={styles.work}>
      <Text style={styles.overline}>{label}</Text>
      <Text style={styles.text}>{value}</Text>
    </View>
  ) : null
}

function Resource({ entry }: { entry: Record<string, unknown> }) {
  const kind = entry.clase ?? entry.tipo
  const isLabor = kind === 'mano_de_obra'
  const tint = isLabor
    ? phaseColors.revision
    : kind === 'material'
      ? phaseColors.nueva
      : phaseColors.curso
  const icon: IconName = isLabor
    ? 'time-outline'
    : kind === 'material'
      ? 'cube-outline'
      : 'hammer-outline'
  const amount = reviewQuantityLabel(entry.cantidad, entry.unidad) ?? reviewHoursLabel(entry.horas)
  return (
    <View style={styles.resource}>
      <View style={[styles.resourceIcon, { backgroundColor: tint.bg }]}>
        <Icon name={icon} size="inline" color={tint.fg} />
      </View>
      <View style={styles.resourceCopy}>
        <Text style={styles.text}>{String(entry.recurso ?? entry.tecnico ?? 'Recurso')}</Text>
        <Text style={styles.muted}>{reviewResourceKindLabel(kind)}</Text>
        {entry.notas ? <Text style={styles.muted}>{String(entry.notas)}</Text> : null}
      </View>
      {amount ? <Text style={styles.text}>{amount}</Text> : null}
    </View>
  )
}

export function ReportContent({
  content,
  signatures = [],
  caseStatus,
  currentAction = null,
  verificationHash,
}: {
  content: FrozenReportContent
  signatures?: ReportSignature[]
  caseStatus?: CaseStatus
  currentAction?: 'submit' | 'validate' | 'approve' | null
  verificationHash?: string
}) {
  const info = content.solicitud
  const report = content.reporte
  const before = content.fotos.filter((photo) => photo.tipo === 'antes')
  const after = content.fotos.filter((photo) => photo.tipo === 'despues')
  const dates = orderedReviewDates(content.fechas).filter(([, value]) => Boolean(value))
  const elapsed = reportElapsedLabel(content.fechas.creada ?? null, content.fechas.enviada ?? null)
  const steps = reportSignatureSteps(signatures, currentAction)
  return (
    <View style={styles.container}>
      <Card contentStyle={styles.card}>
        <Text style={styles.overline}>
          {info.numero} · {content.version > 0 ? `Versión ${content.version}` : 'Borrador'}
        </Text>
        <Text accessibilityRole="header" style={styles.title}>
          {info.titulo}
        </Text>
        {caseStatus ? <StatusBadge status={caseStatus} /> : null}
        <View style={styles.badges}>
          <PriorityBadge priority={info.prioridad as CasePriority} />
          <Text style={styles.category}>{info.tipo_servicio}</Text>
        </View>
        {info.descripcion ? <Text style={styles.muted}>{info.descripcion}</Text> : null}
        <View style={styles.grid}>
          <PeopleInfo label="Solicita" area={info.area_solicitante} person={info.creada_por} />
          <PeopleInfo label="Atiende" area={info.area_destino} person={info.tecnico} />
          <Info label="Ubicación" value={info.ubicacion} wide />
        </View>
      </Card>

      <Card contentStyle={styles.card}>
        <Text style={styles.heading}>Firmas · progreso</Text>
        {steps.map((step) => (
          <View key={step.type} style={styles.step}>
            <View style={[styles.circle, step.signature ? styles.done : styles.pending]}>
              {step.signature ? <Icon name="checkmark" size="inline" color={colors.white} /> : null}
            </View>
            <View style={styles.stepText}>
              <Text style={[styles.text, step.isCurrent && styles.current]}>
                {step.label}
                {step.isCurrent ? ' · te toca' : ''}
              </Text>
              <Text style={styles.muted}>
                {step.signature
                  ? `${step.signature.signerName}${step.isSubstitute ? ' (suplente)' : ''} · ${new Date(step.signature.signedAt).toLocaleString('es-GT')}`
                  : 'Pendiente'}
              </Text>
            </View>
          </View>
        ))}
      </Card>

      <Card contentStyle={styles.card}>
        <Text style={styles.heading}>Trabajo realizado</Text>
        <Work label="Diagnóstico" value={report.diagnostico} />
        <Work label="Qué se hizo" value={report.trabajo_realizado} />
        {report.causa || report.observaciones ? (
          <View style={styles.secondaryGrid}>
            {report.causa ? (
              <View style={styles.secondary}>
                <Work label="Causa" value={report.causa} />
              </View>
            ) : null}
            {report.observaciones ? (
              <View style={styles.secondary}>
                <Work label="Observaciones" value={report.observaciones} />
              </View>
            ) : null}
          </View>
        ) : null}
      </Card>

      {dates.length > 0 ? (
        <Card contentStyle={styles.card}>
          <View style={styles.sectionHeading}>
            <Text style={styles.heading}>Tiempos</Text>
            {elapsed ? <Text style={styles.duration}>{elapsed}</Text> : null}
          </View>
          <View style={styles.grid}>
            {dates.map(([key, value]) => (
              <Info
                key={key}
                label={reviewDateLabel(key)}
                value={value ? new Date(value).toLocaleString('es-GT') : null}
              />
            ))}
          </View>
        </Card>
      ) : null}

      {content.recursos.length > 0 || content.version > 0 ? (
        <Card contentStyle={styles.card}>
          <Text style={styles.heading}>Recursos y mano de obra</Text>
          {content.recursos.length > 0 ? (
            content.recursos.map((entry, index) => <Resource key={index} entry={entry} />)
          ) : (
            <Text style={styles.muted}>Sin recursos registrados</Text>
          )}
        </Card>
      ) : null}

      {content.fotos.length > 0 ? (
        <Card contentStyle={styles.card}>
          <Text style={styles.heading}>Fotografías</Text>
          <View style={styles.photoColumns}>
            <View style={styles.photoColumn}>
              <Text style={styles.muted}>Antes · {before.length}</Text>
              {before.map((photo, index) => (
                <FrozenPhoto
                  key={photo.id}
                  photo={photo}
                  label={`Foto antes ${index + 1} de ${before.length}`}
                />
              ))}
            </View>
            <View style={styles.photoColumn}>
              <Text style={styles.muted}>Después · {after.length}</Text>
              {after.map((photo, index) => (
                <FrozenPhoto
                  key={photo.id}
                  photo={photo}
                  label={`Foto después ${index + 1} de ${after.length}`}
                />
              ))}
            </View>
          </View>
        </Card>
      ) : null}

      {signatures.length > 0 ? (
        <Card contentStyle={styles.card}>
          <Text style={styles.heading}>Firmas registradas</Text>
          {steps
            .filter((step) => step.signature)
            .map((step) => {
              const signature = step.signature!
              const box = signatureViewBox(signature.strokePath)
              const strokeWidth = 2 * Math.max(box.width / 96, box.height / 48)
              return (
                <View
                  key={signature.id}
                  accessibilityLabel={`Firma de ${step.label.toLowerCase()} de ${signature.signerName}`}
                  style={styles.signature}
                >
                  <Svg
                    width={96}
                    height={48}
                    viewBox={`${box.x} ${box.y} ${box.width} ${box.height}`}
                    preserveAspectRatio="xMidYMid meet"
                  >
                    <Path
                      d={signature.strokePath}
                      stroke={colors.text}
                      strokeWidth={strokeWidth}
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                  <View style={styles.signatureCopy}>
                    <Text style={styles.text}>
                      {signature.signerName}
                      {step.isSubstitute ? ' (suplente)' : ''}
                    </Text>
                    <Text style={styles.muted}>
                      {step.label} ·{' '}
                      {ROLE_LABELS[signature.signerRole as AppRole] ?? signature.signerRole}
                    </Text>
                    <Text style={styles.muted}>
                      {new Date(signature.signedAt).toLocaleString('es-GT')}
                    </Text>
                  </View>
                </View>
              )
            })}
          {verificationHash ? (
            <Text style={styles.muted}>
              Código de verificación: {reportVerificationCode(verificationHash)}
            </Text>
          ) : null}
        </Card>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  card: { gap: spacing.md },
  overline: { ...typography.overline, color: colors.textMuted },
  title: { ...typography.title, color: colors.text },
  heading: { ...typography.heading, color: colors.text },
  text: { ...typography.body, color: colors.text },
  muted: { ...typography.caption, color: colors.textMuted },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  category: {
    ...typography.caption,
    color: colors.primary,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  info: { width: '46%', gap: spacing.xs },
  wide: { width: '100%' },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.base },
  circle: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  done: { backgroundColor: colors.success },
  pending: { borderWidth: 2, borderColor: colors.primary },
  stepText: { flex: 1 },
  current: { color: colors.primary },
  work: { gap: spacing.xs },
  secondaryGrid: { flexDirection: 'row', gap: spacing.sm },
  secondary: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  duration: { ...typography.caption, color: colors.primary, flexShrink: 1, textAlign: 'right' },
  resource: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  resourceIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resourceCopy: { flex: 1 },
  photoColumns: { flexDirection: 'row', gap: spacing.sm },
  photoColumn: { flex: 1, gap: spacing.sm },
  photoButton: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photo: { width: '100%', height: '100%' },
  overlay: {
    flex: 1,
    backgroundColor: colors.modalBackdrop,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  largePhoto: { width: '100%', height: '80%' },
  overlayText: { ...typography.body, color: colors.white },
  closePhoto: {
    minHeight: 44,
    minWidth: 88,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  signature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  signatureCopy: { flex: 1, gap: spacing.xs },
})
