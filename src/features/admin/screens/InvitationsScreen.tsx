import { useState } from 'react'
import { Alert, ScrollView, Share, StyleSheet, Text, View } from 'react-native'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { EmptyState } from '@/components/feedback/EmptyState'
import { RequestState } from '@/components/feedback/RequestState'
import { SkeletonList } from '@/components/ui/SkeletonList'
import { ScreenContainer } from '@/components/ui/ScreenContainer'
import { FormField } from '@/components/forms/FormField'
import { KeyboardFormScrollView } from '@/components/layout/KeyboardFormScrollView'
import { useAreas } from '@/features/areas/useAreas'
import { APP_ROLES, ROLE_ICONS, ROLE_LABELS, type AppRole } from '@/features/auth/types'
import { useAuthStore } from '@/store/authStore'
import { colors, spacing, typography } from '@/theme/tokens'
import { formatRelativeDate } from '@/theme/formatters'

import { formatInvitationNotice } from '../invitationNotice'
import { getInvitationAreas, retainInvitationArea } from '../invitationAreaOptions'
import { invitationSchema } from '../invitationSchemas'
import { useCreateInvitation, useInvitations, useRevokeInvitation } from '../useInvitations'

export function InvitationsScreen() {
  const organizationName = useAuthStore((state) => state.profile?.organizationName)
  const invitations = useInvitations()
  const areas = useAreas()
  const create = useCreateInvitation()
  const revoke = useRevokeInvitation()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<AppRole>('solicitante')
  const [areaId, setAreaId] = useState<string | null>(null)
  const availableAreas = getInvitationAreas(areas.data ?? [], role)
  const selectedAreaId = retainInvitationArea(areaId, areas.data ?? [], role)

  function changeRole(nextRole: AppRole) {
    setRole(nextRole)
    setAreaId((current) => retainInvitationArea(current, areas.data ?? [], nextRole))
  }

  async function shareNotice(invitationEmail: string, invitationRole: AppRole) {
    if (!organizationName?.trim()) {
      Alert.alert('No fue posible compartir', 'No se pudo identificar el nombre de la empresa.')
      return
    }
    try {
      await Share.share({
        message: formatInvitationNotice({
          organizationName,
          role: invitationRole,
          email: invitationEmail,
        }),
      })
    } catch {
      Alert.alert('No fue posible compartir', 'Inténtalo de nuevo desde la invitación registrada.')
    }
  }

  async function submit() {
    const result = invitationSchema.safeParse({ email, role, areaId: selectedAreaId })
    if (!result.success) {
      Alert.alert('Revisa la invitación', result.error.issues[0]?.message ?? 'Datos inválidos')
      return
    }
    if (
      role === 'tecnico' &&
      areas.data?.find((area) => area.id === selectedAreaId)?.kind !== 'tecnica'
    ) {
      Alert.alert('Área incorrecta', 'Un técnico debe pertenecer a un área técnica.')
      return
    }
    try {
      await create.mutateAsync(result.data)
      setEmail('')
      Alert.alert(
        'Invitación creada',
        'La persona quedará vinculada al registrarse y confirmar este correo. Comparte el aviso para informarle.',
        [
          { text: 'Después', style: 'cancel' },
          {
            text: 'Compartir aviso',
            onPress: () => void shareNotice(result.data.email, result.data.role),
          },
        ],
      )
    } catch (error) {
      Alert.alert(
        'No fue posible invitar',
        error instanceof Error ? error.message : 'Inténtalo de nuevo.',
      )
    }
  }

  function confirmRevoke(id: string) {
    Alert.alert('Revocar invitación', '¿Deseas cancelar esta invitación?', [
      { text: 'Volver', style: 'cancel' },
      {
        text: 'Revocar',
        style: 'destructive',
        onPress: () =>
          void revoke
            .mutateAsync(id)
            .catch(() => Alert.alert('No fue posible revocar la invitación.')),
      },
    ])
  }

  return (
    <ScreenContainer edges={['bottom']} padded={false}>
      <KeyboardFormScrollView contentContainerStyle={styles.content}>
        <Text style={styles.muted}>
          La persona entra automáticamente al registrarse y confirmar el correo invitado. Comparte
          el aviso para informarle; la app no envía correos por sí sola.
        </Text>
        <Card contentStyle={styles.card}>
          <Text style={styles.sectionTitle}>Nueva invitación</Text>
          <FormField
            label="Correo electrónico"
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="nombre@empresa.com"
            value={email}
            onChangeText={setEmail}
          />
          <Text style={styles.label}>Rol</Text>
          <ScrollView
            horizontal
            style={styles.optionScroll}
            contentContainerStyle={styles.options}
            showsHorizontalScrollIndicator={false}
          >
            {APP_ROLES.map((option) => (
              <Chip
                key={option}
                label={ROLE_LABELS[option]}
                selected={role === option}
                onPress={() => changeRole(option)}
              />
            ))}
          </ScrollView>
          <Text style={styles.label}>Área</Text>
          <ScrollView
            horizontal
            style={styles.optionScroll}
            contentContainerStyle={styles.options}
            showsHorizontalScrollIndicator={false}
          >
            <Chip
              label="Sin área"
              selected={selectedAreaId === null}
              onPress={() => setAreaId(null)}
            />
            {availableAreas.map((area) => (
              <Chip
                key={area.id}
                label={area.name}
                selected={selectedAreaId === area.id}
                onPress={() => setAreaId(area.id)}
              />
            ))}
          </ScrollView>
          <Button
            label="Crear invitación"
            loading={create.isPending}
            onPress={() => void submit()}
          />
        </Card>
        <Text style={styles.sectionTitle}>Invitaciones registradas</Text>
        {invitations.isLoading ? <SkeletonList /> : null}
        {invitations.error ? (
          <RequestState
            kind="error"
            title="No fue posible cargar las invitaciones"
            onRetry={() => void invitations.refetch()}
          />
        ) : null}
        {invitations.data?.length === 0 ? (
          <EmptyState
            variant="firstUse"
            title="Sin invitaciones"
            message="Invita a una persona para darle acceso a tu empresa."
          />
        ) : null}
        {invitations.data?.map((invitation) => {
          const pending = !invitation.acceptedAt && !invitation.revokedAt
          return (
            <Card key={invitation.id} contentStyle={styles.card}>
              <Text style={styles.email}>{invitation.email}</Text>
              <View style={styles.invitationChips}>
                <Chip label={ROLE_LABELS[invitation.role]} icon={ROLE_ICONS[invitation.role]} />
                <Chip
                  label={
                    areas.data?.find((area) => area.id === invitation.areaId)?.name ?? 'Sin área'
                  }
                />
                <Chip
                  label={pending ? 'Pendiente' : invitation.acceptedAt ? 'Aceptada' : 'Revocada'}
                  tone={pending ? 'warning' : invitation.acceptedAt ? 'success' : 'neutral'}
                />
              </View>
              <Text style={styles.muted}>{formatRelativeDate(invitation.createdAt)}</Text>
              {pending ? (
                <View style={styles.actions}>
                  <Button
                    label="Compartir aviso"
                    variant="text"
                    accessibilityLabel={`Compartir aviso de invitación con ${invitation.email}`}
                    onPress={() => void shareNotice(invitation.email, invitation.role)}
                  />
                  <Button
                    label="Revocar"
                    variant="text"
                    destructive
                    accessibilityLabel={`Revocar invitación de ${invitation.email}`}
                    onPress={() => confirmRevoke(invitation.id)}
                  />
                </View>
              ) : null}
            </Card>
          )
        })}
      </KeyboardFormScrollView>
    </ScreenContainer>
  )
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, gap: spacing.md, padding: spacing.lg },
  muted: { color: colors.textMuted, lineHeight: 21 },
  label: { ...typography.body, color: colors.text },
  sectionTitle: { ...typography.title, color: colors.text },
  card: {
    gap: spacing.md,
    padding: spacing.md,
  },
  optionScroll: { flexGrow: 0, flexShrink: 0, minHeight: 52 },
  options: { gap: spacing.sm, paddingVertical: spacing.xs },
  invitationChips: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  email: { ...typography.heading, color: colors.text },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
})
