import { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { IconTile } from '@/components/ui/IconTile'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ScreenContainer } from '@/components/ui/ScreenContainer'
import { FormField } from '@/components/forms/FormField'
import { KeyboardFormScrollView } from '@/components/layout/KeyboardFormScrollView'
import { useAreas } from '@/features/areas/useAreas'
import { APP_ROLES, ROLE_ICONS, ROLE_LABELS, type AppRole } from '@/features/auth/types'
import { useAuthStore } from '@/store/authStore'
import { colors, radius, spacing, typography } from '@/theme/tokens'

import { formatInvitationNotice } from '../invitationNotice'
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
    const result = invitationSchema.safeParse({ email, role, areaId })
    if (!result.success) {
      Alert.alert('Revisa la invitación', result.error.issues[0]?.message ?? 'Datos inválidos')
      return
    }
    if (role === 'tecnico' && areas.data?.find((area) => area.id === areaId)?.kind !== 'tecnica') {
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
        <Text accessibilityRole="header" style={styles.title}>
          Invitaciones
        </Text>
        <Text style={styles.muted}>
          La persona entra automáticamente al registrarse y confirmar el correo invitado. Comparte
          el aviso para informarle; la app no envía correos por sí sola.
        </Text>
        <Card contentStyle={styles.card}>
          <IconTile icon="mail-outline" />
          <FormField
            label="Correo electrónico"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <Text style={styles.label}>Rol</Text>
          <ScrollView
            horizontal
            contentContainerStyle={styles.options}
            showsHorizontalScrollIndicator={false}
          >
            {APP_ROLES.map((option) => (
              <Choice
                key={option}
                label={ROLE_LABELS[option]}
                selected={role === option}
                onPress={() => setRole(option)}
              />
            ))}
          </ScrollView>
          <Text style={styles.label}>Área</Text>
          <ScrollView
            horizontal
            contentContainerStyle={styles.options}
            showsHorizontalScrollIndicator={false}
          >
            <Choice label="Sin área" selected={areaId === null} onPress={() => setAreaId(null)} />
            {(areas.data ?? [])
              .filter((area) => area.isActive)
              .map((area) => (
                <Choice
                  key={area.id}
                  label={`${area.name} · ${area.kind === 'tecnica' ? 'Técnica' : 'Solicitante'}`}
                  selected={areaId === area.id}
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
        {invitations.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
        {invitations.error ? (
          <Button label="Reintentar" onPress={() => void invitations.refetch()} />
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
              <Chip label={ROLE_LABELS[invitation.role]} icon={ROLE_ICONS[invitation.role]} />
              <Chip
                label={pending ? 'Pendiente' : invitation.acceptedAt ? 'Aceptada' : 'Revocada'}
                tone={pending ? 'warning' : invitation.acceptedAt ? 'success' : 'neutral'}
              />
              {pending ? (
                <View style={styles.actions}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Compartir aviso de invitación con ${invitation.email}`}
                    onPress={() => void shareNotice(invitation.email, invitation.role)}
                    style={styles.share}
                  >
                    <Text style={styles.shareText}>Compartir aviso</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Revocar invitación de ${invitation.email}`}
                    onPress={() => confirmRevoke(invitation.id)}
                    style={styles.revoke}
                  >
                    <Text style={styles.revokeText}>Revocar</Text>
                  </Pressable>
                </View>
              ) : null}
            </Card>
          )
        })}
      </KeyboardFormScrollView>
    </ScreenContainer>
  )
}

function Choice({
  label,
  selected,
  onPress,
}: {
  label: string
  selected: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[styles.choice, selected && styles.selected]}
    >
      <Text style={styles.choiceText}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, gap: spacing.md, padding: spacing.lg },
  title: { ...typography.display, color: colors.text },
  muted: { color: colors.textMuted, lineHeight: 21 },
  label: { ...typography.body, color: colors.text },
  sectionTitle: { ...typography.title, color: colors.text },
  card: {
    gap: spacing.md,
    padding: spacing.md,
  },
  options: { gap: spacing.sm, paddingVertical: spacing.sm },
  choice: {
    minHeight: 44,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  selected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  choiceText: { ...typography.body, color: colors.text },
  email: { ...typography.heading, color: colors.text },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  share: { minHeight: 44, justifyContent: 'center' },
  shareText: { ...typography.body, color: colors.primary },
  revoke: { minHeight: 44, justifyContent: 'center' },
  revokeText: { ...typography.body, color: colors.error },
})
