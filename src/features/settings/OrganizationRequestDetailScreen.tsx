import { useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm, useWatch } from 'react-hook-form'

import { AppFeedback, useFeedback } from '@/components/feedback/AppFeedback'
import { FormField } from '@/components/forms/FormField'
import { BottomSheet } from '@/components/sheets/BottomSheet'
import { Button } from '@/components/ui/Button'
import { ScreenContainer } from '@/components/ui/ScreenContainer'
import {
  useReviewOrganizationCreationRequest,
  useOrganizationCreationRequests,
} from '@/features/auth/useOrganizationRequest'
import { organizationRejectionSchema } from '@/features/auth/organizationRequestSchemas'
import type { ProfileStackParamList } from '@/navigation/types'
import { colors, fonts, radius, spacing, typography } from '@/theme/tokens'
import { getErrorMessage } from '@/utils/errorMessage'
import {
  formatOrganizationRequestDate,
  organizationRequestStatusLabel,
  teamSizeLabel,
} from './organizationRequestPresentation'

type Props = NativeStackScreenProps<ProfileStackParamList, 'OrganizationRequestDetail'>

export function OrganizationRequestDetailScreen({ navigation, route }: Props) {
  const request = route.params.request
  const pending = request.status === 'pendiente'
  const [rejectOpen, setRejectOpen] = useState(false)
  const { control, handleSubmit, reset } = useForm<{ reason: string }>({
    resolver: zodResolver(organizationRejectionSchema),
    mode: 'onChange',
    defaultValues: { reason: '' },
  })
  const reason = useWatch({ control, name: 'reason' })
  const review = useReviewOrganizationCreationRequest()
  const list = useOrganizationCreationRequests('pendiente')
  const feedback = useFeedback()

  async function approve() {
    const confirmed = await feedback.confirm({
      title: `¿Crear ${request.organizationName}?`,
      message: `${request.requesterName} será su administrador.`,
      confirmLabel: 'Crear empresa',
      cancelLabel: 'Volver',
      tone: 'info',
    })
    if (!confirmed) return
    try {
      await review.mutateAsync({ requestId: request.id, approve: true, reason: null })
      AppFeedback.toast(`Empresa creada. Invitación enviada a ${request.requesterName}`, {
        tone: 'success',
      })
      navigation.goBack()
    } catch (error) {
      AppFeedback.show('No fue posible aprobar', getErrorMessage(error, 'Inténtalo de nuevo.'), {
        tone: 'error',
      })
      void list.refetch()
    }
  }

  const reject = handleSubmit(async ({ reason: trimmed }) => {
    try {
      await review.mutateAsync({ requestId: request.id, approve: false, reason: trimmed })
      setRejectOpen(false)
      reset()
      AppFeedback.toast('Solicitud rechazada', { tone: 'success' })
      navigation.goBack()
    } catch (error) {
      AppFeedback.show('No fue posible rechazar', getErrorMessage(error, 'Inténtalo de nuevo.'), {
        tone: 'error',
      })
      void list.refetch()
    }
  })

  const statusColor =
    request.status === 'aprobada'
      ? colors.success
      : request.status === 'rechazada'
        ? colors.error
        : pending
          ? colors.primary
          : colors.textMuted
  const statusBackground =
    request.status === 'aprobada'
      ? colors.successSoft
      : request.status === 'rechazada'
        ? colors.dangerSoft
        : pending
          ? colors.primarySoft
          : colors.surfaceMuted

  return (
    <ScreenContainer padded={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={styles.name}>
          {request.organizationName}
        </Text>
        <View style={[styles.status, { backgroundColor: statusBackground }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {organizationRequestStatusLabel(request.status)}
          </Text>
        </View>
        <View style={styles.details}>
          <DetailRow label="Pide" value={request.requesterName} />
          <DetailRow label="Correo" value={request.email} />
          {request.contactPhone ? (
            <DetailRow label="Teléfono" value={request.contactPhone} />
          ) : null}
          <DetailRow label="Equipo" value={teamSizeLabel(request.teamSize)} />
          <DetailRow label="Enviada" value={formatOrganizationRequestDate(request.createdAt)} />
          {!pending && request.reviewedAt ? (
            <DetailRow
              label="Revisada por"
              value={`${request.reviewedByName ?? '—'} · ${formatOrganizationRequestDate(request.reviewedAt)}`}
            />
          ) : null}
        </View>
        {request.message ? (
          <View style={styles.box}>
            <Text style={styles.boxLabel}>Mensaje</Text>
            <Text style={styles.boxBody}>{request.message}</Text>
          </View>
        ) : null}
        {request.status === 'rechazada' && request.rejectionReason ? (
          <View style={[styles.box, styles.reasonBox]}>
            <Text style={styles.boxLabel}>Motivo</Text>
            <Text style={styles.boxBody}>{request.rejectionReason}</Text>
          </View>
        ) : null}
      </ScrollView>
      {pending ? (
        <View style={styles.footer}>
          <Text style={styles.footerNote}>
            Al aprobar se crea la empresa y {request.requesterName} recibe la invitación de
            administrador.
          </Text>
          <View style={styles.actions}>
            <Button
              label="Rechazar"
              variant="danger"
              containerStyle={styles.action}
              onPress={() => setRejectOpen(true)}
            />
            <Button
              label="Aprobar"
              loading={review.isPending}
              containerStyle={styles.action}
              onPress={() => void approve()}
            />
          </View>
        </View>
      ) : null}
      <BottomSheet
        visible={rejectOpen}
        title={`Rechazar ${request.organizationName}`}
        onClose={() => {
          setRejectOpen(false)
          reset()
        }}
        form
        height="60%"
        footerSecondaryAction={{
          label: 'Volver',
          onPress: () => {
            setRejectOpen(false)
            reset()
          },
        }}
        footerAction={{
          label: 'Rechazar',
          variant: 'destructive',
          disabled: reason.trim().length < 3 || reason.trim().length > 300,
          loading: review.isPending,
          onPress: () => void reject(),
        }}
      >
        <Text style={styles.sheetText}>
          {request.requesterName} verá este motivo en la app y podrá enviar otra solicitud.
        </Text>
        <Controller
          control={control}
          name="reason"
          render={({ field }) => (
            <FormField
              label="Motivo del rechazo"
              required
              multiline
              maxLength={300}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              style={styles.reasonInput}
            />
          )}
        />
      </BottomSheet>
    </ScreenContainer>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  name: { ...typography.display, color: colors.ink },
  status: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  statusText: { ...typography.caption, fontFamily: fonts.bold },
  details: { marginTop: spacing.sm },
  detailRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  detailLabel: { ...typography.caption, color: colors.textMuted, width: 90 },
  detailValue: { ...typography.body, color: colors.text, flex: 1 },
  box: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
  },
  reasonBox: { backgroundColor: colors.dangerSoft },
  boxLabel: { ...typography.caption, fontFamily: fonts.bold, color: colors.text },
  boxBody: { ...typography.body, color: colors.text },
  footer: { padding: spacing.lg, gap: spacing.md, borderTopWidth: 1, borderColor: colors.border },
  footerNote: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: spacing.sm },
  action: { flex: 1 },
  sheetText: { ...typography.body, color: colors.textMuted },
  reasonInput: { minHeight: 100, textAlignVertical: 'top', paddingTop: spacing.md },
})
